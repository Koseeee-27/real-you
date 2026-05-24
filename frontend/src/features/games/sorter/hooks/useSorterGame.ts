'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  PackageType,
  SortEvent,
  SorterGameData,
  WrongPatterns,
} from '@/features/games/types';
import {
  COUNTDOWN_DURATION_MS,
  FROZEN_DURATION_MS,
  FROZEN_WARNING_DURATION_MS,
  GAME_DURATION_MS,
  NORMAL_DURATION_MS,
  ONBOARDING_SLIDE_COUNT,
  PACKAGE_FLOW_DURATION_MS,
  PACKAGE_FLOW_DURATION_SPEED_UP_MS,
  PACKAGE_TYPES,
  RECOVERY_DURATION_MS,
  RULE_CHANGE_NOTICE_DURATION_MS,
  RULE_CHANGED_1_DURATION_MS,
  RULE_CHANGED_2_DURATION_MS,
  RULE_CHANGED_CORRECT_BIN,
  SCORE_CORRECT,
  SCORE_OUTFLOW_PENALTY,
  SCORE_WRONG_PENALTY,
  SPAWN_INTERVAL_MS,
  TIMER_TICK_MS,
} from '../data/sorterConstants';

/**
 * 画面上で生存している荷物 1 つ分の状態。
 * `spawnedAt` は CSS / framer-motion のアニメ開始基準を決めるためのタイムスタンプ。
 */
export interface ActivePackage {
  id: number;
  type: PackageType;
  /** ゲーム開始（カウントダウン終了）からの経過時間（ms） */
  spawnedAt: number;
  /**
   * 荷物が U 字経路を 1 周するのにかかる時間（ms）。
   * spawn 時の速度フェーズに応じて値が決まる（通常時 / 速度 2 倍時で異なる）。
   * rule-changed-2 突入時に既存荷物の値もまとめて書き換える（PackageItem 側で
   * `controls.speed` 経由でアニメに反映される）。
   */
  flowDurationMs: number;
}

/**
 * 仕分け実行直後のフィードバック情報。bin の上に「+10 OK」「-5 NG」ポップアップを
 * 表示するために使う。
 */
export interface SorterFeedback {
  /** クリックされた仕分け先の種別 */
  binType: PackageType;
  /** 正解判定 */
  correct: boolean;
  /** スコア変動（正解時は正、誤仕分け時は負） */
  scoreChange: number;
  /**
   * 発火時刻（Date.now()）。
   * AnimatePresence の `key` として使い、連続で同じ bin に当てても再アニメさせる。
   */
  at: number;
}

/**
 * ゲームの進行状態。
 *
 *   onboarding         → 4 スライドのチュートリアル（ユーザー操作で進む）
 *   countdown          → 3 → 2 → 1 → START のオーバーレイ（3.5s）
 *   normal             → 通常ルール（11s）
 *   rule-change-notice → ルール変更通知バナー表示中、通常ルール継続（3s）
 *   rule-changed-1     → ルール変更後、urgent → heavy が正解（14s）
 *   frozen-warning     → 機械停止予告（2s、まだ操作可）
 *   frozen             → 機械停止（5s、クリック無効化 + panicClick 計測）
 *   recovery           → 復旧（5s、通常速度で立て直す猶予）
 *   rule-changed-2     → ルール変更ルール継続 + 速度 2 倍（10s）
 *   ended              → 終了、submit 待ち
 */
export type GamePhase =
  | 'onboarding'
  | 'countdown'
  | 'normal'
  | 'rule-change-notice'
  | 'rule-changed-1'
  | 'frozen-warning'
  | 'frozen'
  | 'recovery'
  | 'rule-changed-2'
  | 'ended';

/**
 * ルール変更後の正解 bin かどうかを判定する phase 群。
 * 一度ルール変更が起きたら最後まで継続するため、間に挟まれる
 * frozen-warning / frozen / recovery も含める（含めないと中断中に通常ルール判定に戻ってしまう）。
 */
const RULE_CHANGED_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'rule-changed-1',
  'frozen-warning',
  'frozen',
  'recovery',
  'rule-changed-2',
]);

/**
 * ゲーム本編の phase 群。spawn ロジックが走る対象。
 * `frozen` は **クリックは無効** だが、spawn と panicClickCount 計測のために含める。
 * クリック処理側で `phase === 'frozen'` の場合は panicClick 計測に分岐する。
 */
const IN_GAME_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  'normal',
  'rule-change-notice',
  'rule-changed-1',
  'frozen-warning',
  'frozen',
  'recovery',
  'rule-changed-2',
]);

/**
 * `wrongPatterns` の初期値を生成する。
 * 各正解ラベル別に空オブジェクトを持たせる（誤仕分けが発生した時点で `Partial<Record<PackageType, number>>` に追記）。
 */
function createEmptyWrongPatterns(): WrongPatterns {
  return {
    urgent: {},
    fragile: {},
    heavy: {},
  };
}

/**
 * 次の phase と duration の対応表。
 * onboarding / countdown / ended は別管理（ユーザー操作 or 専用 effect）。
 */
const NEXT_PHASE_TABLE: Partial<
  Record<GamePhase, { next: GamePhase; duration: number }>
> = {
  normal: { next: 'rule-change-notice', duration: NORMAL_DURATION_MS },
  'rule-change-notice': {
    next: 'rule-changed-1',
    duration: RULE_CHANGE_NOTICE_DURATION_MS,
  },
  'rule-changed-1': {
    next: 'frozen-warning',
    duration: RULE_CHANGED_1_DURATION_MS,
  },
  'frozen-warning': { next: 'frozen', duration: FROZEN_WARNING_DURATION_MS },
  frozen: { next: 'recovery', duration: FROZEN_DURATION_MS },
  recovery: { next: 'rule-changed-2', duration: RECOVERY_DURATION_MS },
  'rule-changed-2': { next: 'ended', duration: RULE_CHANGED_2_DURATION_MS },
};

/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）全体のステート管理フック。
 *
 * フェーズ遷移は `setTimeout` チェーン、計測データは ref で蓄積。
 * 完了時に `SorterGameData` を組み立てて `onComplete(data)` を呼び出す。
 *
 * 設計メモ:
 *   - phase 遷移の副作用（packages 書き換え / submit / selected リセット）は
 *     **遷移用 setTimeout のコールバック内で同期実行** する。effect 本体での
 *     同期 setState は `react-hooks/set-state-in-effect` 違反になるため避ける
 *   - spawn interval は一度起動したら `ended` まで止めない（phase 切替でリセットしない）
 *   - 親から渡される `onComplete` は ref 経由で保持し、effect の依存配列を増やさない
 */
export function useSorterGame(options: {
  onComplete: (data: SorterGameData) => void;
}) {
  const { onComplete } = options;

  // =========================================================
  // UI に直接反映するステート
  // =========================================================
  const [phase, setPhase] = useState<GamePhase>('onboarding');
  const [onboardingSlideIndex, setOnboardingSlideIndex] = useState(0);
  /** 0 は「START」表示用。3 → 2 → 1 → 0(START) → ゲーム本編開始 */
  const [countdownValue, setCountdownValue] = useState<3 | 2 | 1 | 0>(3);
  const [packages, setPackages] = useState<ActivePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null
  );
  const [remainingTimeMs, setRemainingTimeMs] = useState(GAME_DURATION_MS);
  const [displayScore, setDisplayScore] = useState(0);
  /**
   * 直近の流出イベントのタイムスタンプ（Date.now() の値）。
   * MISS バッジを 0.6s フラッシュ表示するトリガーとして使う。
   * 同じ値でも再描画させたいので、流出のたびに `Date.now()` で更新する。
   */
  const [lastOutflowAt, setLastOutflowAt] = useState<number | null>(null);
  /**
   * 直近の仕分け結果（成功 / 失敗）のフィードバック。
   * クリックされた bin の上に「+10 OK」「-5 NG」ポップアップを 0.7s フラッシュ表示するために使う。
   */
  const [lastFeedback, setLastFeedback] = useState<SorterFeedback | null>(null);
  /**
   * 速度 2 倍予告バナーの表示フラグ。
   * rule-changed-2 phase 突入時に 3 秒間中央に表示する。
   * phase 遷移の setTimeout コールバック内で on/off を制御する。
   */
  const [showSpeedUpBanner, setShowSpeedUpBanner] = useState(false);

  // =========================================================
  // 計測データ（再 render 不要なので ref で管理）
  // =========================================================
  /** カウントダウン終了の Date.now()。SortEvent.timestamp の起点 */
  const gameStartAtRef = useRef<number | null>(null);
  /** 荷物を選択した瞬間の Date.now()。hesitation 算出用 */
  const selectedAtRef = useRef<number | null>(null);
  /** 荷物 ID のシーケンス */
  const packageIdSeqRef = useRef(0);

  const eventsRef = useRef<SortEvent[]>([]);
  const spawnedPackagesRef = useRef(0);
  const wrongSortCountRef = useRef(0);
  const wrongPatternsRef = useRef<WrongPatterns>(createEmptyWrongPatterns());
  const cancelCountRef = useRef(0);
  const outflowMissCountRef = useRef(0);
  const panicClickCountRef = useRef(0);
  const hesitationSumRef = useRef(0);
  const hesitationSamplesRef = useRef(0);

  /** rule-changed-1 突入時の Date.now()。ruleChangeAdaptMs 起点 */
  const ruleChangedAtRef = useRef<number | null>(null);
  /** ルール変更後の初正解までの ms（未適応なら null のまま） */
  const ruleChangeAdaptMsRef = useRef<number | null>(null);
  /** ルール変更後の初正解判定フラグ（true = まだ未適応） */
  const firstCorrectAfterRuleChangeRef = useRef(true);

  /** displayScore の最新値を ref で保持（ハンドラ内で setState 前の累計に加算する用） */
  const displayScoreRef = useRef(0);

  /** spawn / tick interval ハンドル */
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * フェーズ遷移用 effect の外で起動された一時的な setTimeout の id を集約する。
   * フィードバックポップアップの自動消去・MISS バッジの自動消去・速度 2 倍バナーの
   * 自動消去など、副作用として走るものを unmount cleanup で一括 clear するため。
   *
   * Set で管理し、各 setTimeout は完了時に自身を Set から `delete` する
   * （`trackTimeout` 内で wrap）。プレイ中に多数発火しても配列が肥大化しない。
   */
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );

  /** onComplete の二重実行防止 */
  const submittedRef = useRef(false);

  /**
   * phase の最新値を ref に同期保持する。
   * spawn の setInterval コールバックや、親 effect で closure に新しい phase を
   * 参照させるために必要。
   */
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /**
   * `onComplete` を ref に逃がす。phase 遷移の setTimeout コールバックから呼ぶ際、
   * 親から渡される関数の identity 変化で effect が再走しないようにする。
   */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // =========================================================
  // ユーティリティ
  // =========================================================

  /** SortEvent を 1 件追加。timestamp は gameStartAtRef からの経過時間（ms） */
  function pushEvent(event: Omit<SortEvent, 'timestamp'>): void {
    const startAt = gameStartAtRef.current;
    if (startAt == null) return;
    eventsRef.current.push({
      ...event,
      timestamp: Date.now() - startAt,
    });
  }

  /**
   * unmount 時に cleanup したい一時的な setTimeout を登録するヘルパー。
   * 内部で `setTimeout` を起動し、id を `pendingTimeoutsRef` の Set に追加する。
   * 実行完了時には Set から自身の id を `delete` するため、長時間プレイでも
   * Set が肥大化しない。unmount cleanup では Set 全体をまとめて clear する。
   *
   * フェーズ遷移 effect 内の setTimeout は effect 自体の return で cleanup できるので
   * このヘルパーを介さず直接 setTimeout を使う。
   */
  function trackTimeout(callback: () => void, ms: number): void {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      callback();
    }, ms);
    pendingTimeoutsRef.current.add(id);
  }

  /**
   * ゲーム終了時の `SorterGameData` 組み立て + `onComplete` 呼び出し。
   * phase 遷移の setTimeout コールバック内から同期的に呼ばれる。
   */
  function buildAndSubmit(): void {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const startAt = gameStartAtRef.current ?? Date.now();
    const totalTimeMs = Math.min(GAME_DURATION_MS, Date.now() - startAt);
    const averageHesitationMs =
      hesitationSamplesRef.current > 0
        ? hesitationSumRef.current / hesitationSamplesRef.current
        : 0;

    const data: SorterGameData = {
      totalTimeMs,
      finalScore: displayScoreRef.current,
      averageHesitationMs,
      spawnedPackages: spawnedPackagesRef.current,
      wrongSortCount: wrongSortCountRef.current,
      wrongPatterns: wrongPatternsRef.current,
      cancelCount: cancelCountRef.current,
      outflowMissCount: outflowMissCountRef.current,
      panicClickCount: panicClickCountRef.current,
      ruleChangeAdaptMs: ruleChangeAdaptMsRef.current,
      // shallow copy: 送信中の payload を後続イベントで書き換えないよう独立配列にする
      events: [...eventsRef.current],
    };

    onCompleteRef.current(data);
  }

  // =========================================================
  // unmount 時の全 timer cleanup
  // =========================================================
  useEffect(() => {
    // mount 時の Set インスタンスをローカル変数に控えておく。
    // cleanup 時に `pendingTimeoutsRef.current` を参照すると lint の
    // `react-hooks/exhaustive-deps` 警告（ref 値が変わっている可能性）に該当するため。
    // 本フックでは Set インスタンス自体を差し替えないので、ローカル参照のままで安全。
    const pendingTimeouts = pendingTimeoutsRef.current;
    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      pendingTimeouts.forEach((id) => clearTimeout(id));
      pendingTimeouts.clear();
    };
  }, []);

  // =========================================================
  // Phase 遷移: countdown 中の数字進行
  // =========================================================
  useEffect(() => {
    if (phase !== 'countdown') return;

    // 3 → 2 → 1 → 0(START) → normal
    const stepMs = COUNTDOWN_DURATION_MS / 4;
    const id1 = setTimeout(() => setCountdownValue(2), stepMs);
    const id2 = setTimeout(() => setCountdownValue(1), stepMs * 2);
    const id3 = setTimeout(() => setCountdownValue(0), stepMs * 3);
    const id4 = setTimeout(() => {
      // カウントダウン終了 → ゲーム本編開始
      gameStartAtRef.current = Date.now();
      setPhase('normal');
    }, COUNTDOWN_DURATION_MS);

    return () => {
      clearTimeout(id1);
      clearTimeout(id2);
      clearTimeout(id3);
      clearTimeout(id4);
    };
  }, [phase]);

  // =========================================================
  // Phase 遷移: 本編 phase（normal → ... → rule-changed-2 → ended）
  //
  // 各 phase の effect 内で次 phase への setTimeout を 1 個仕掛ける。
  // setTimeout コールバック内で副作用（packages 書き換え / submit / selected リセット）を
  // **同期実行**することで、`react-hooks/set-state-in-effect` ルール違反を避ける。
  // =========================================================
  useEffect(() => {
    const transition = NEXT_PHASE_TABLE[phase];
    if (!transition) return;

    const id = setTimeout(() => {
      const next = transition.next;

      // rule-changed-1 突入時刻を記録（ruleChangeAdaptMs の起点）
      if (next === 'rule-changed-1') {
        ruleChangedAtRef.current = Date.now();
      }

      // frozen 突入時に選択をリセット（凍結明けに古い選択が残らないようにする）
      if (next === 'frozen') {
        setSelectedPackageId(null);
        selectedAtRef.current = null;
      }

      // rule-changed-2 突入時に画面上の全荷物の flowDurationMs を半減する。
      // PackageItem 側で `controls.speed` を介してアニメに反映される（既存アニメ非リセット）。
      // 同時に「⚡ 速度 2 倍」予告バナーを 3 秒間表示する。
      if (next === 'rule-changed-2') {
        setPackages((prev) =>
          prev.map((pkg) =>
            pkg.flowDurationMs === PACKAGE_FLOW_DURATION_SPEED_UP_MS
              ? pkg
              : { ...pkg, flowDurationMs: PACKAGE_FLOW_DURATION_SPEED_UP_MS }
          )
        );
        setShowSpeedUpBanner(true);
        trackTimeout(() => setShowSpeedUpBanner(false), 3000);
      }

      // ended 突入時に submit + spawn 停止
      if (next === 'ended') {
        if (spawnIntervalRef.current) {
          clearInterval(spawnIntervalRef.current);
          spawnIntervalRef.current = null;
        }
        buildAndSubmit();
      }

      setPhase(next);
    }, transition.duration);

    return () => clearTimeout(id);
  }, [phase]);

  // =========================================================
  // ゲーム本編の経過時間タイマー（残り時間表示）
  //
  // マウント時に 1 回だけ起動し、unmount で停止する。
  // ゲーム本編に入る前（countdown 中）は `gameStartAtRef.current == null` なので
  // コールバック内で early return する。
  // =========================================================
  useEffect(() => {
    const intervalId = setInterval(() => {
      const startAt = gameStartAtRef.current;
      if (startAt == null) return;
      const elapsed = Date.now() - startAt;
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed);
      setRemainingTimeMs(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId);
        tickIntervalRef.current = null;
      }
    }, TIMER_TICK_MS);
    tickIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      tickIntervalRef.current = null;
    };
  }, []);

  // =========================================================
  // 荷物のスポーン
  //
  // 一度起動したら `ended` まで止めない設計。phase 切替で
  // clearInterval → 再起動するとスポーン間隔がリセットされてしまうため、
  // 「既に起動済みなら何もしない」ガードで in-game 期間は同じ interval を維持する。
  // =========================================================
  useEffect(() => {
    if (phase === 'ended') return; // 停止は phase 遷移 effect 側で実施済み
    if (!IN_GAME_PHASES.has(phase)) return;
    if (spawnIntervalRef.current) return; // 既に起動済み

    spawnIntervalRef.current = setInterval(() => {
      const startAt = gameStartAtRef.current;
      if (startAt == null) return;
      const nextId = packageIdSeqRef.current + 1;
      packageIdSeqRef.current = nextId;
      const type =
        PACKAGE_TYPES[Math.floor(Math.random() * PACKAGE_TYPES.length)] ??
        'urgent';
      // spawn 時の phase で速度を固定する（phaseRef 経由で常に最新を参照）
      const flowDurationMs =
        phaseRef.current === 'rule-changed-2'
          ? PACKAGE_FLOW_DURATION_SPEED_UP_MS
          : PACKAGE_FLOW_DURATION_MS;
      const newPkg: ActivePackage = {
        id: nextId,
        type,
        spawnedAt: Date.now() - startAt,
        flowDurationMs,
      };
      spawnedPackagesRef.current += 1;
      setPackages((prev) => [...prev, newPkg]);
    }, SPAWN_INTERVAL_MS);
  }, [phase]);

  // =========================================================
  // ハンドラ: 荷物クリック（選択 / 取り消し）
  // =========================================================
  function handlePackageClick(id: number): void {
    if (!IN_GAME_PHASES.has(phase)) return;
    if (phase === 'frozen') {
      // 凍結中のクリックは panicClickCount に集計するのみ（events には積まない）
      panicClickCountRef.current += 1;
      return;
    }

    if (selectedPackageId === id) {
      // 選択解除
      const pkg = packages.find((p) => p.id === id);
      if (!pkg) return; // 既に消えている荷物なら無視（集計データの汚染を防ぐ）
      cancelCountRef.current += 1;
      pushEvent({
        eventType: 'cancel',
        packageType: pkg.type,
        binChosen: null,
        hesitationMs: null,
        correct: false,
        duringRuleChange: RULE_CHANGED_PHASES.has(phase),
        duringFreeze: false,
      });
      setSelectedPackageId(null);
      selectedAtRef.current = null;
    } else {
      // 選択
      selectedAtRef.current = Date.now();
      setSelectedPackageId(id);
    }
  }

  // =========================================================
  // ハンドラ: 仕分け先クリック（仕分け実行）
  // =========================================================
  function handleBinClick(binType: PackageType): void {
    if (!IN_GAME_PHASES.has(phase)) return;
    if (phase === 'frozen') {
      panicClickCountRef.current += 1;
      return;
    }
    if (selectedPackageId == null) return;

    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;

    const isRuleChanged = RULE_CHANGED_PHASES.has(phase);
    const correctBin = isRuleChanged
      ? RULE_CHANGED_CORRECT_BIN[pkg.type]
      : pkg.type;
    const correct = binType === correctBin;
    const selectedAt = selectedAtRef.current ?? Date.now();
    const hesitationMs = Math.max(0, Date.now() - selectedAt);

    // スコア更新（固定値 +SCORE_CORRECT / -SCORE_WRONG_PENALTY、下限 0）
    const scoreChange = correct ? SCORE_CORRECT : -SCORE_WRONG_PENALTY;
    const nextScore = Math.max(0, displayScoreRef.current + scoreChange);
    displayScoreRef.current = nextScore;
    setDisplayScore(nextScore);

    // フィードバックポップアップ（0.7s 後に消す）。
    // unmount リーク防止のため `trackTimeout` 経由で id を ref に登録する。
    setLastFeedback({
      binType,
      correct,
      scoreChange,
      at: Date.now(),
    });
    trackTimeout(() => setLastFeedback(null), 700);

    // 誤仕分けの集計
    if (!correct) {
      wrongSortCountRef.current += 1;
      const row = wrongPatternsRef.current[pkg.type];
      row[binType] = (row[binType] ?? 0) + 1;
    }

    // ルール変更適応の初正解
    if (isRuleChanged && correct && firstCorrectAfterRuleChangeRef.current) {
      const changedAt = ruleChangedAtRef.current;
      if (changedAt != null) {
        ruleChangeAdaptMsRef.current = Date.now() - changedAt;
      }
      firstCorrectAfterRuleChangeRef.current = false;
    }

    // hesitation 蓄積
    hesitationSumRef.current += hesitationMs;
    hesitationSamplesRef.current += 1;

    pushEvent({
      eventType: 'sort',
      packageType: pkg.type,
      binChosen: binType,
      hesitationMs,
      correct,
      duringRuleChange: isRuleChanged,
      duringFreeze: false,
    });

    // 荷物リストから除去 + 選択解除
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    setSelectedPackageId(null);
    selectedAtRef.current = null;
  }

  // =========================================================
  // ハンドラ: 荷物の流出（PackageItem の onAnimationComplete 経由）
  // =========================================================
  function handlePackageOutflow(id: number): void {
    // submit 完了後（ended 後）に PackageItem の `controls.then` が遅延発火する
    // ケースに備え、二重実行ガードと同じ submittedRef で集計を弾く。
    if (submittedRef.current) return;
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    outflowMissCountRef.current += 1;
    pushEvent({
      eventType: 'outflow',
      packageType: pkg.type,
      binChosen: null,
      hesitationMs: null,
      correct: false,
      duringRuleChange: RULE_CHANGED_PHASES.has(phase),
      duringFreeze: phase === 'frozen',
    });

    // 流出ペナルティ（表示用スコアのみ、下限 0）
    const nextScore = Math.max(
      0,
      displayScoreRef.current - SCORE_OUTFLOW_PENALTY
    );
    displayScoreRef.current = nextScore;
    setDisplayScore(nextScore);

    // MISS バッジ用に流出時刻を更新し、600ms 後に自動で null へ戻す。
    // 連続流出時に古い setTimeout が新しい値をクリアしないよう関数型更新で照合する。
    // unmount リーク防止のため `trackTimeout` 経由で id を ref に登録する。
    const outflowAt = Date.now();
    setLastOutflowAt(outflowAt);
    trackTimeout(() => {
      setLastOutflowAt((cur) => (cur === outflowAt ? null : cur));
    }, 600);

    setPackages((prev) => prev.filter((p) => p.id !== id));
    if (selectedPackageId === id) {
      setSelectedPackageId(null);
      selectedAtRef.current = null;
    }
  }

  // =========================================================
  // ハンドラ: オンボーディング操作
  // =========================================================
  function handleOnboardingNext(): void {
    setOnboardingSlideIndex((i) => Math.min(ONBOARDING_SLIDE_COUNT - 1, i + 1));
  }

  function handleOnboardingPrev(): void {
    setOnboardingSlideIndex((i) => Math.max(0, i - 1));
  }

  function handleOnboardingStart(): void {
    setPhase('countdown');
  }

  // =========================================================
  // 派生値
  // =========================================================
  const isRuleChanged = RULE_CHANGED_PHASES.has(phase);
  const isFrozen = phase === 'frozen';
  /**
   * 速度 2 倍状態か（rule-changed-2 phase のみ）。
   * 凍結関連 phase が完了した後で発動するため、操作不能と速度 2 倍が重ならない。
   */
  const isSpeedUp = phase === 'rule-changed-2';
  /**
   * ゲーム本編プレイ中か（onboarding / countdown / ended 以外）。
   * タイマーゲージや HUD の表示制御に使う。
   */
  const isInGame = IN_GAME_PHASES.has(phase);

  return {
    // ステート
    phase,
    onboardingSlideIndex,
    countdownValue,
    packages,
    selectedPackageId,
    remainingTimeMs,
    displayScore,
    lastOutflowAt,
    lastFeedback,
    showSpeedUpBanner,
    // 派生値
    isRuleChanged,
    isFrozen,
    isSpeedUp,
    isInGame,
    // ハンドラ
    handlePackageClick,
    handleBinClick,
    handlePackageOutflow,
    handleOnboardingNext,
    handleOnboardingPrev,
    handleOnboardingStart,
  };
}
