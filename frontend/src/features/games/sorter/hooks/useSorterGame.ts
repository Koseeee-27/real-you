'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PackageType,
  SortEvent,
  SorterGameData,
  WrongPatterns,
} from '@/features/games/types';
import {
  COUNTDOWN_DURATION_MS,
  EVENT_ANCHORS,
  FROZEN_DURATION_MS,
  FROZEN_WARNING_DURATION_MS,
  ONBOARDING_SLIDE_COUNT,
  PACKAGE_FLOW_DURATION_MS,
  PACKAGE_FLOW_DURATION_SPEED_UP_MS,
  PACKAGE_TYPES,
  RECOVERY_DURATION_MS,
  RULE_CHANGE_NOTICE_DURATION_MS,
  RULE_CHANGED_CORRECT_BIN,
  SCORE_CORRECT,
  SCORE_WRONG_PENALTY,
  SPAWN_INTERVAL_MS,
  SPEED_UP_BANNER_DURATION_MS,
  TARGET_SCORE,
  TIME_CAP_MS,
  TIMER_TICK_MS,
} from '../data/sorterConstants';
import type { SorterEventKey } from '../data/sorterConstants';

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
   * spawn 時の速度状態に応じて値が決まる（通常時 / 速度上昇後で異なる）。
   * 速度上昇イベント発火時に既存荷物の値もまとめて書き換える（PackageItem 側で
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
 * ゲームの進行状態（大枠）。
 * 割り込みイベント（ルール変更 / 機械停止 / 速度上昇）の有無は phase とは独立した
 * ラッチ + サブ状態で管理する（後述の useSorterGame 内コメント参照）。
 *
 *   onboarding → 4 スライドのチュートリアル（ユーザー操作で進む）
 *   countdown  → 3 → 2 → 1 → START のオーバーレイ（COUNTDOWN_DURATION_MS）
 *   playing    → ゲーム本編。スコア到達 / 上限時間で ended へ
 *   ended      → 終了、submit 待ち
 */
export type GamePhase = 'onboarding' | 'countdown' | 'playing' | 'ended';

/** 勝敗結果。playing 中は null、ended 突入時に確定する */
export type GameOutcome = 'success' | 'failure' | null;

/**
 * 機械停止（freeze）のサブシーケンス。
 *   none     → 機械停止イベント未発火 or 完了
 *   warning  → 予告（赤バナー shake、まだ操作可）
 *   frozen   → 停止（クリック無効化 + panicClick 計測、ベルト・荷物は流れ続ける）
 *   recovery → 復旧（✓ 復旧バナー表示、操作可に戻る）
 */
export type FreezeStage = 'none' | 'warning' | 'frozen' | 'recovery';

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
 * 荷物仕分けゲーム（sorter_game / game_type=4）全体のステート管理フック。
 *
 * 進行モデル（meta: #121 改修後）:
 *   - 終了条件は「目標スコア TARGET_SCORE 到達で成功 / 上限 TIME_CAP_MS で未達なら失敗」。
 *     固定時間チェーンは廃止し、スコア到達（handleBinClick）/ 時間切れ（tick）の 2 系統で終了する。
 *   - 割り込みイベントはスコア閾値（主）+ 経過時間（保険）の早い方で 1 回ずつ・順序固定で発火（ラッチ）。
 *     発火ロジックは `maybeFireEvents` に一本化し、スコア経路・時間経路の両方から呼ぶ（DRY）。
 *   - 計測データは ref で蓄積。完了時に `SorterGameData` を組み立てて `onComplete(data)` を呼ぶ。
 *
 * 設計メモ:
 *   - イベント発火の副作用（packages 書き換え / バナー表示 / freeze サブシーケンス進行）は
 *     **タイマーコールバック内や、イベントハンドラ・tick コールバック内で同期実行** する。
 *     effect 本体での同期 setState は `react-hooks/set-state-in-effect` 違反になるため避ける。
 *   - spawn interval / tick interval は countdown 終了時に 1 回起動し、`ended` まで止めない。
 *   - 親から渡される `onComplete` は ref 経由で保持し、effect の依存配列を増やさない。
 */
export function useSorterGame(options: {
  onComplete: (data: SorterGameData) => void;
}) {
  const { onComplete } = options;

  // =========================================================
  // UI に直接反映するステート
  // =========================================================
  const [phase, setPhase] = useState<GamePhase>('onboarding');
  /** 勝敗結果。ended 突入時に確定（結果画面の成功 / 失敗表示に使う。スキーマには含めない） */
  const [outcome, setOutcome] = useState<GameOutcome>(null);
  const [onboardingSlideIndex, setOnboardingSlideIndex] = useState(0);
  /** 0 は「START」表示用。3 → 2 → 1 → 0(START) → ゲーム本編開始 */
  const [countdownValue, setCountdownValue] = useState<3 | 2 | 1 | 0>(3);
  const [packages, setPackages] = useState<ActivePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null
  );
  /** 経過時間（ms）。上限タイマー表示用。tick で更新 */
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
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

  // --- 割り込みイベントの表示状態（phase から独立して管理） ---
  /** ルール変更が一度でも発火したか（発火後は最後まで true、bin 正解判定に使う） */
  const [isRuleChanged, setIsRuleChanged] = useState(false);
  /** ルール変更通知バナーの表示フラグ（発火直後 RULE_CHANGE_NOTICE_DURATION_MS 表示） */
  const [showRuleChangeNotice, setShowRuleChangeNotice] = useState(false);
  /** 機械停止のサブシーケンス段階 */
  const [freezeStage, setFreezeStage] = useState<FreezeStage>('none');
  /** 速度上昇が発火したか（発火後は最後まで true、荷物 flow を ×SPEED_UP_MULTIPLIER に） */
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  /** 速度上昇予告バナーの表示フラグ（発火直後 SPEED_UP_BANNER_DURATION_MS 表示） */
  const [showSpeedUpBanner, setShowSpeedUpBanner] = useState(false);

  // =========================================================
  // 計測データ（再 render 不要なので ref で管理）
  // =========================================================
  /** カウントダウン終了の Date.now()。SortEvent.timestamp / 経過時間の起点 */
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

  /** ルール変更発火時の Date.now()。ruleChangeAdaptMs 起点 */
  const ruleChangedAtRef = useRef<number | null>(null);
  /** ルール変更後の初正解までの ms（未適応なら null のまま） */
  const ruleChangeAdaptMsRef = useRef<number | null>(null);
  /** ルール変更後の初正解判定フラグ（true = まだ未適応） */
  const firstCorrectAfterRuleChangeRef = useRef(true);

  /** displayScore の最新値を ref で保持（ハンドラ内で setState 前の累計に加算する用） */
  const displayScoreRef = useRef(0);

  /**
   * イベント発火のラッチ。各イベントが既に発火したかを保持する。
   * `maybeFireEvents` がスコア経路・時間経路の両方から呼ばれても、1 回限定・順序固定を担保する。
   */
  const firedEventsRef = useRef<Record<SorterEventKey, boolean>>({
    'rule-change': false,
    freeze: false,
    'speed-up': false,
  });

  /** 機械停止のサブシーケンス進行中フラグ（同期判定用。クリック無効化は freezeStage で判定） */
  const freezeStageRef = useRef<FreezeStage>('none');
  /** 速度上昇が発火済みか（spawn 時の flow 速度決定に同期参照する） */
  const isSpeedUpRef = useRef(false);

  /** spawn / tick interval ハンドル */
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 一時的な setTimeout の id を集約する。
   * フィードバックポップアップの自動消去・MISS バッジの自動消去・各イベントの
   * サブシーケンス進行・バナーの自動消去など、副作用として走るものを unmount cleanup で
   * 一括 clear するため。
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
   * `onComplete` を ref に逃がす。タイマー / ハンドラ内から呼ぶ際、
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
   */
  const trackTimeout = useCallback((callback: () => void, ms: number): void => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      callback();
    }, ms);
    pendingTimeoutsRef.current.add(id);
  }, []);

  /**
   * ゲーム終了時の `SorterGameData` 組み立て + `onComplete` 呼び出し。
   * スコア到達 / 時間切れの経路から同期的に呼ばれる。
   *
   * setState / ref / onCompleteRef のみ参照するため `useCallback([])` で identity 安定化し、
   * tick effect の依存に含めても effect が毎レンダー再走しないようにする。
   *
   * @param result 勝敗結果。outcome state に反映する（結果画面の成功 / 失敗表示用）
   */
  const endGame = useCallback((result: 'success' | 'failure'): void => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // spawn / tick を停止
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    // 保留中の setTimeout（freeze サブシーケンス進行 / バナー・MISS バッジ・フィードバックの
    // 自動消去）を一括 clear する。終了後にこれらのコールバックが走り、ended 突入後の不要な
    // setState（凍結演出の継続・バナー消去など）が発火するのを防ぐ。
    pendingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    pendingTimeoutsRef.current.clear();

    const startAt = gameStartAtRef.current ?? Date.now();
    const totalTimeMs = Math.min(TIME_CAP_MS, Date.now() - startAt);
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

    setOutcome(result);
    setPhase('ended');
    onCompleteRef.current(data);
  }, []);

  // =========================================================
  // 割り込みイベントの発火（スコア経路・時間経路から共通で呼ぶ）
  //
  // 各発火関数 / maybeFireEvents は setState / ref / trackTimeout（安定）/ 定数のみ参照する。
  // tick effect の依存に maybeFireEvents を含めても effect が毎レンダー再走しないよう、
  // useCallback([]) で identity を安定化する。
  // =========================================================

  /** ルール変更を発火する（ラッチ済みなら何もしない） */
  const fireRuleChange = useCallback((): void => {
    ruleChangedAtRef.current = Date.now();
    setIsRuleChanged(true);
    setShowRuleChangeNotice(true);
    trackTimeout(
      () => setShowRuleChangeNotice(false),
      RULE_CHANGE_NOTICE_DURATION_MS
    );
  }, [trackTimeout]);

  /**
   * 機械停止を発火する。予告 → 停止 → 復旧 のサブシーケンスを短いタイマーで進める。
   * 停止突入時に選択をリセットし（凍結明けに古い選択が残らないようにする）、
   * 復旧完了で freezeStage を none に戻す。ベルト・荷物のアニメは止めない。
   */
  const fireFreeze = useCallback((): void => {
    // 予告
    freezeStageRef.current = 'warning';
    setFreezeStage('warning');

    trackTimeout(() => {
      // 停止
      freezeStageRef.current = 'frozen';
      setFreezeStage('frozen');
      setSelectedPackageId(null);
      selectedAtRef.current = null;

      trackTimeout(() => {
        // 復旧
        freezeStageRef.current = 'recovery';
        setFreezeStage('recovery');

        trackTimeout(() => {
          freezeStageRef.current = 'none';
          setFreezeStage('none');
        }, RECOVERY_DURATION_MS);
      }, FROZEN_DURATION_MS);
    }, FROZEN_WARNING_DURATION_MS);
  }, [trackTimeout]);

  /**
   * 速度上昇を発火する。発火以降ゲーム終了まで荷物 flow を ×SPEED_UP_MULTIPLIER に。
   * 画面上の全荷物の flowDurationMs を切り替え（PackageItem 側で controls.speed に反映）、
   * 予告バナーを SPEED_UP_BANNER_DURATION_MS 表示する。
   */
  const fireSpeedUp = useCallback((): void => {
    isSpeedUpRef.current = true;
    setIsSpeedUp(true);
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.flowDurationMs === PACKAGE_FLOW_DURATION_SPEED_UP_MS
          ? pkg
          : { ...pkg, flowDurationMs: PACKAGE_FLOW_DURATION_SPEED_UP_MS }
      )
    );
    setShowSpeedUpBanner(true);
    trackTimeout(
      () => setShowSpeedUpBanner(false),
      SPEED_UP_BANNER_DURATION_MS
    );
  }, [trackTimeout]);

  /**
   * スコア / 経過時間を受け取り、未発火のイベントを順序固定で発火する。
   *
   * EVENT_ANCHORS を先頭から走査し、未発火イベントについて
   * 「score >= scoreAnchor または elapsed >= timeAnchor」を満たせば発火（ラッチ）。
   * 配列順に処理し、未発火イベントが条件を満たさなければそこで打ち切る
   * （後段イベントが先に発火しないよう順序を担保）。
   *
   * スコア更新後（commitSort）と tick の両経路から呼ぶことで二系統を 1 本化する。
   */
  const maybeFireEvents = useCallback(
    (score: number, elapsed: number): void => {
      const fireFns: Record<SorterEventKey, () => void> = {
        'rule-change': fireRuleChange,
        freeze: fireFreeze,
        'speed-up': fireSpeedUp,
      };
      for (const anchor of EVENT_ANCHORS) {
        if (firedEventsRef.current[anchor.key]) continue;
        const shouldFire =
          score >= anchor.scoreAnchor || elapsed >= anchor.timeAnchor;
        if (!shouldFire) break; // 順序固定: 未発火の手前イベントが条件未達なら後段も発火させない
        firedEventsRef.current[anchor.key] = true;
        fireFns[anchor.key]();
      }
    },
    [fireRuleChange, fireFreeze, fireSpeedUp]
  );

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

    // 3 → 2 → 1 → 0(START) → playing
    const stepMs = COUNTDOWN_DURATION_MS / 4;
    const id1 = setTimeout(() => setCountdownValue(2), stepMs);
    const id2 = setTimeout(() => setCountdownValue(1), stepMs * 2);
    const id3 = setTimeout(() => setCountdownValue(0), stepMs * 3);
    const id4 = setTimeout(() => {
      // カウントダウン終了 → ゲーム本編開始
      gameStartAtRef.current = Date.now();
      setPhase('playing');
    }, COUNTDOWN_DURATION_MS);

    return () => {
      clearTimeout(id1);
      clearTimeout(id2);
      clearTimeout(id3);
      clearTimeout(id4);
    };
  }, [phase]);

  // =========================================================
  // ゲーム本編の経過時間タイマー + 時間系トリガー（イベント発火フォールバック / 失敗判定）
  //
  // playing に入ったら起動し、`ended` まで動かす。
  // tick ごとに:
  //   - 経過時間 state を更新（HUD の上限タイマー表示用）
  //   - maybeFireEvents(score, elapsed) でイベントの時間フォールバックを判定
  //   - elapsed >= TIME_CAP_MS かつ TARGET_SCORE 未達なら失敗で終了
  // =========================================================
  useEffect(() => {
    if (phase !== 'playing') return;
    if (tickIntervalRef.current) return; // 既に起動済み

    const intervalId = setInterval(() => {
      const startAt = gameStartAtRef.current;
      if (startAt == null) return;
      if (submittedRef.current) return;

      const elapsed = Date.now() - startAt;
      setElapsedTimeMs(Math.min(TIME_CAP_MS, elapsed));

      // イベントの時間フォールバック（スコア経路と共通の発火関数）
      maybeFireEvents(displayScoreRef.current, elapsed);

      // 上限時間到達 → 未達なら失敗で終了
      if (elapsed >= TIME_CAP_MS && displayScoreRef.current < TARGET_SCORE) {
        endGame('failure');
      }
    }, TIMER_TICK_MS);
    tickIntervalRef.current = intervalId;
    // cleanup は unmount effect / endGame 側で実施（phase 切替では止めない）
  }, [phase, maybeFireEvents, endGame]);

  // =========================================================
  // 荷物のスポーン
  //
  // playing に入ったら起動し、`ended` まで止めない設計。phase 切替で
  // clearInterval → 再起動するとスポーン間隔がリセットされてしまうため、
  // 「既に起動済みなら何もしない」ガードで in-game 期間は同じ interval を維持する。
  // =========================================================
  useEffect(() => {
    if (phase !== 'playing') return;
    if (spawnIntervalRef.current) return; // 既に起動済み

    spawnIntervalRef.current = setInterval(() => {
      const startAt = gameStartAtRef.current;
      if (startAt == null) return;
      if (submittedRef.current) return;
      const nextId = packageIdSeqRef.current + 1;
      packageIdSeqRef.current = nextId;
      const type =
        PACKAGE_TYPES[Math.floor(Math.random() * PACKAGE_TYPES.length)] ??
        'urgent';
      // spawn 時の速度状態で flow を固定する（速度上昇発火後は半減）
      const flowDurationMs = isSpeedUpRef.current
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
  // 仕分け確定の共通処理（クリック方式 / D&D 方式の両方から呼ぶ）
  //
  // packageId と binType を受け取り、正誤判定・スコア更新・計測・イベント発火を行う。
  // hesitation の起点（選択 / 掴んだ瞬間）は selectedAtRef に統一して扱う。
  //
  // 返り値は「荷物を packages から除去したか（= 仕分けが成立し unmount されるか）」。
  // - true:  仕分け成立。荷物を除去した（呼び出し側 = PackageItem は何もしなくてよい）
  // - false: phase / frozen / 未検出 のいずれかで早期 return し、荷物を除去していない。
  //          この場合、D&D の追従オフセットが残ったままだと荷物がドロップ位置に取り残される
  //          ため、呼び出し側で流れに戻す必要がある。
  //
  // freezeStageRef（同期 ref）と PackageItem 側の isFrozen（prop = 非同期 state）の窓ズレで、
  // PackageItem が「有効な仕分け」と判断したのにここで frozen 早期 return する競合があり得る。
  // 返り値で「除去できなかった」を確実に伝え、PackageItem 側で必ず流れに戻すことで取り残しを防ぐ。
  // =========================================================
  function commitSort(packageId: number, binType: PackageType): boolean {
    if (phase !== 'playing') return false;
    if (freezeStageRef.current === 'frozen') {
      panicClickCountRef.current += 1;
      return false;
    }

    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return false;

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
    const feedbackAt = Date.now();
    setLastFeedback({ binType, correct, scoreChange, at: feedbackAt });
    trackTimeout(
      () => setLastFeedback((cur) => (cur?.at === feedbackAt ? null : cur)),
      700
    );

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

    // スコア経路のイベント発火判定 + 勝敗判定（スコア更新直後）
    const elapsed =
      gameStartAtRef.current != null ? Date.now() - gameStartAtRef.current : 0;
    maybeFireEvents(nextScore, elapsed);
    if (nextScore >= TARGET_SCORE) {
      endGame('success');
    }

    // 荷物を除去した（仕分け成立）。呼び出し側は追従を戻す処理を行わない。
    return true;
  }

  /**
   * 選択 / 掴みの起点を記録する共通処理（クリック選択 / D&D 掴みの両方から呼ぶ）。
   * hesitation の起点 selectedAtRef をセットし、選択中の荷物 id を state に反映する。
   */
  function beginSelection(id: number): void {
    selectedAtRef.current = Date.now();
    setSelectedPackageId(id);
  }

  /**
   * 選択 / 掴みの取り消し共通処理（クリック再クリック解除 / D&D 振り分け先外ドロップ）。
   * cancelCount を加算し cancel イベントを積み、選択状態をクリアする。
   * 既に消えている荷物（流出済みなど）は集計しない。
   */
  function cancelSelection(id: number): void {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    cancelCountRef.current += 1;
    pushEvent({
      eventType: 'cancel',
      packageType: pkg.type,
      binChosen: null,
      hesitationMs: null,
      correct: false,
      duringRuleChange: isRuleChanged,
      duringFreeze: false,
    });
    setSelectedPackageId(null);
    selectedAtRef.current = null;
  }

  // =========================================================
  // ハンドラ: 荷物クリック（選択 / 取り消し）
  // =========================================================
  function handlePackageClick(id: number): void {
    if (phase !== 'playing') return;
    if (freezeStageRef.current === 'frozen') {
      // 凍結中のクリックは panicClickCount に集計するのみ（events には積まない）
      panicClickCountRef.current += 1;
      return;
    }

    if (selectedPackageId === id) {
      cancelSelection(id);
    } else {
      beginSelection(id);
    }
  }

  // =========================================================
  // ハンドラ: 仕分け先クリック（クリック 2 ステップの仕分け実行）
  // =========================================================
  function handleBinClick(binType: PackageType): void {
    if (phase !== 'playing') return;
    if (freezeStageRef.current === 'frozen') {
      panicClickCountRef.current += 1;
      return;
    }
    if (selectedPackageId == null) return;
    commitSort(selectedPackageId, binType);
  }

  // =========================================================
  // ハンドラ: D&D（pointer events 経由）
  // =========================================================

  /** 荷物を掴んだ（pointerdown）。選択の起点を記録する */
  function handlePackageGrab(id: number): void {
    if (phase !== 'playing') return;
    if (freezeStageRef.current === 'frozen') {
      panicClickCountRef.current += 1;
      return;
    }
    beginSelection(id);
  }

  /**
   * D&D のドロップ確定（pointerup）。
   * binType が非 null（振り分け先の上で離した）なら仕分け、null（振り分け先外で離した）なら取り消し。
   *
   * 返り値は「荷物を packages から除去したか（= unmount されるか）」。
   * - 仕分け成立（commitSort が除去した）→ true
   * - 取り消し（cancelSelection。荷物は流れに残す）→ false
   * - phase / frozen の早期 return → false
   *
   * false のときは PackageItem 側で追従オフセットを戻しフローを再開する（取り残し防止）。
   * commitSort の返り値をそのまま返すことで、frozen 競合・未検出など「除去されなかった」全経路で
   * 確実に false を伝える。
   */
  function handlePackageDrop(id: number, binType: PackageType | null): boolean {
    if (phase !== 'playing') return false;
    if (freezeStageRef.current === 'frozen') {
      panicClickCountRef.current += 1;
      return false;
    }
    if (binType == null) {
      // 取り消し: 荷物は除去せず流れに戻す対象 → false
      cancelSelection(id);
      return false;
    }
    return commitSort(id, binType);
  }

  // =========================================================
  // ハンドラ: 荷物の流出（PackageItem の onAnimationComplete 経由）
  // =========================================================
  function handlePackageOutflow(id: number): void {
    // submit 完了後（ended 後）に PackageItem の `controls.then` が遅延発火する
    // ケースに備え、二重実行ガードと同じ submittedRef で集計を弾く。
    if (submittedRef.current) return;
    // pkg が見つからない = この荷物は既に仕分け / 取り消し済みで packages から除去されている。
    // その場合は流出ではないため集計せずスキップするのが正（流出は「未操作のまま流れ切った」時のみ）。
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    outflowMissCountRef.current += 1;
    pushEvent({
      eventType: 'outflow',
      packageType: pkg.type,
      binChosen: null,
      hesitationMs: null,
      correct: false,
      duringRuleChange: isRuleChanged,
      duringFreeze: freezeStageRef.current === 'frozen',
    });

    // 流出は失点なし（±0）。スコアは変更しない。

    // MISS バッジ用に流出時刻を更新し、600ms 後に自動で null へ戻す。
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
  /** 機械停止中（操作無効）か。BinTray / 荷物のクリック無効化判定に使う */
  const isFrozen = freezeStage === 'frozen';

  return {
    // ステート
    phase,
    outcome,
    onboardingSlideIndex,
    countdownValue,
    packages,
    selectedPackageId,
    elapsedTimeMs,
    displayScore,
    lastOutflowAt,
    lastFeedback,
    showRuleChangeNotice,
    showSpeedUpBanner,
    freezeStage,
    // 派生値
    isRuleChanged,
    isFrozen,
    isSpeedUp,
    // ハンドラ（クリック方式）
    handlePackageClick,
    handleBinClick,
    // ハンドラ（D&D 方式）
    handlePackageGrab,
    handlePackageDrop,
    // ハンドラ（共通）
    handlePackageOutflow,
    handleOnboardingNext,
    handleOnboardingPrev,
    handleOnboardingStart,
  };
}
