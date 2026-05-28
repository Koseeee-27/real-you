'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { GroupChatGameData } from '@/features/games/types';
import {
  CHARACTERS,
  CUTIN_DURATION_MS,
  getTurn2BossLine,
  isOptionIntentId,
  T1_CATCHUP_ADVANCE_MS,
  T1_CATCHUP_TYPING_MS,
  T1_CATCHUP_USER_MESSAGE_MS,
  T1_PREEMPT_MESSAGE,
  T1_PREEMPT_REVEAL_DELAY_MS,
  T1_TYPING_INDICATOR_DELAY_MS,
  TOTAL_TURNS,
  TURN2_BOSS_LINE_DELAY_MS,
  TURN2_FOLLOW_MESSAGES,
  TURNS,
} from '../data/turns';
import type {
  BotMessage,
  Character,
  CharacterId,
  OptionIntentId,
  TurnDefinition,
} from '../data/turns';

/** タイマーの更新間隔（ms） */
const TIMER_TICK_MS = 100;
/** hoverSequence の上限件数（超過は切り捨て）。仕様書「データ構造」準拠 */
const HOVER_SEQUENCE_CAP = 10;

/** OpenAPI 生成型から 1 ターン分 / 入力デバイス種別の型を取り出す */
type GroupChatGameTurn = GroupChatGameData['turns'][number];
type InputDeviceType = GroupChatGameData['inputDeviceType'];

/**
 * ゲームの進行状態。
 *
 * onboarding  → オンボーディング表示中（OnboardingSlides 内の SlideModal が描画）
 * turn-cutin  → 「ターン N」カットイン演出中
 * turn-active → 選択肢 + タイマー稼働中。bot メッセージは並行して順次表示
 * submitting  → 全ターン完了、GroupChatGameData を組み立てて onComplete に渡す
 * completed   → 送信完了、次画面への遷移待ち
 */
export type GamePhase =
  | 'onboarding'
  | 'turn-cutin'
  | 'turn-active'
  | 'submitting'
  | 'completed';

/** チャットタイムラインの1要素 */
export type ChatMessage =
  | { type: 'separator'; label: string }
  | {
      type: 'bot';
      speaker: Exclude<CharacterId, 'player'>;
      text: string;
      hasMention?: boolean;
    }
  | { type: 'user'; text: string };

/** data 層の BotMessage を ChatMessage（bot）へ変換する */
function toChatBotMessage(m: BotMessage): ChatMessage {
  return {
    type: 'bot',
    speaker: m.speaker,
    text: m.text,
    hasMention: m.hasMention,
  };
}

/**
 * 空気読みグループチャット（group_chat_game / Game 3）新3ターン仕様のステート管理フック。
 *
 * フロー: onboarding → turn-cutin → turn-active →（×3ターン）→ submitting → completed
 *
 * 設計メモ:
 * - UI に反映する値のみ useState、計測値は useRef に蓄積する
 * - effect 本体での同期 setState を避けるため、状態更新は setTimeout / setInterval の
 *   コールバック内で行う（react-hooks/set-state-in-effect 対策）
 * - 一時 timeout は Set で追跡し、ターン遷移・unmount でまとめて解除する
 *
 * 取得データ（仕様書「データ構造 → GroupChatGameData」準拠）はホバー・マウス軌跡・
 * 履歴スクロール・入力デバイスを含めすべて実計測する。
 */
export function useGroupChatGame(options: {
  onComplete: (data: GroupChatGameData) => void;
}) {
  const { onComplete } = options;

  // =========================================================
  // UI に反映するステート
  // =========================================================
  const [gamePhase, setGamePhase] = useState<GamePhase>('onboarding');
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remainingTimeMs, setRemainingTimeMs] = useState<number>(
    () => TURNS[0]?.timerMs ?? 0
  );
  /**
   * 回答確定済みだが、まだ次ターンへ進んでいない「確定中」状態。
   * ターン1の早押し時に同期Aの挙手ビートを差し込む間 true になり、その間は
   * ChoicePad を隠して選択肢の誤操作・SE 誤発火・固まったタイマーバー表示を防ぐ。
   */
  const [isTurnResolving, setIsTurnResolving] = useState(false);
  const [isTypingIndicatorVisible, setIsTypingIndicatorVisible] =
    useState(false);
  const [typingSpeakerId, setTypingSpeakerId] = useState<Exclude<
    CharacterId,
    'player'
  > | null>(null);

  // =========================================================
  // 計測 / 制御用の ref（再レンダリング不要）
  // =========================================================
  const onboardingOpenedAtRef = useRef(0);
  const tutorialViewTimeRef = useRef(0);
  /** turn-active 開始時刻（reactionTimeMs / firstHoverElapsedMs の起点） */
  const optionsShownAtRef = useRef(0);
  /** ターン1「入力中」表示時刻（未表示は null） */
  const t1TypingIndicatorShownAtRef = useRef<number | null>(null);
  /** ターン1 同期A 先回り発言が表示済みか */
  const t1PreemptShownRef = useRef(false);
  /** ターン1: 同期A より先に回答したか（true=先回り / false=譲った / null=タイムアウト） */
  const turn1AnsweredBeforeColleagueARef = useRef<boolean | null>(null);
  /** ターン1:「入力中」表示 → 操作までの ms（未計測は null） */
  const turn1TypingIndicatorReactTimeMsRef = useRef<number | null>(null);
  /** ターン1:「入力中」表示の前後でホバー先が変わったか（null=ホバーなし/表示前に確定） */
  const turn1HoverChangedAfterColleagueATypingRef = useRef<boolean | null>(
    null
  );

  // --- 現ターンのホバー / マウス / スクロール計測（turn-active 開始時にリセット）---
  /** 選択肢表示 → 初ホバーまでの時刻（未ホバーは null） */
  const firstHoverAtRef = useRef<number | null>(null);
  /** ホバーした選択肢 ID の順番（上限 HOVER_SEQUENCE_CAP） */
  const hoverSequenceRef = useRef<number[]>([]);
  /** distinct な初ホバー順（finalChoiceHoverOrder 算出用） */
  const distinctHoverOrderRef = useRef<OptionIntentId[]>([]);
  /** 直近にホバーした選択肢 ID（連続重複の除外 + 現在ホバー） */
  const lastHoverChoiceRef = useRef<OptionIntentId | null>(null);
  /** 直近ホバー開始時刻（decisionConfidenceMs 算出用） */
  const lastHoverEnterAtRef = useRef<number | null>(null);
  /** 選択肢表示 → 決定までのマウス総移動距離（px） */
  const mouseDistanceRef = useRef(0);
  /** 直近の pointer 座標（移動距離の差分計算用） */
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  /** チャット履歴を遡るスクロール回数 */
  const scrollUpCountRef = useRef(0);
  /** ターン1で「入力中」表示が出たか（hover変化判定の起点フラグ） */
  const typingShownForHoverRef = useRef(false);
  /** ターン1「入力中」表示時点でホバーしていた選択肢 ID（未ホバーは null） */
  const hoverChoiceAtTypingRef = useRef<OptionIntentId | null>(null);

  /**
   * 入力デバイス種別（初回操作で確定）。
   * 既定値は `'keyboard'` とし、検出前 / 無操作で送信した場合に `'mouse'` と
   * 誤判定されないようにする（BE 側で `inputDeviceType !== 'mouse'` のとき
   * マウス移動距離由来の指標を無効化する判定があるため）。
   */
  const inputDeviceTypeRef = useRef<InputDeviceType>('keyboard');
  const inputDeviceDetectedRef = useRef(false);

  /** 各ターンの結果ログ */
  const turnResultsRef = useRef<GroupChatGameTurn[]>([]);
  /** 現ターンが選択 or タイムアウトで確定済みか（二重確定防止） */
  const turnResolvedRef = useRef(false);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );
  const submittedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // =========================================================
  // ユーティリティ
  // =========================================================
  const trackTimeout = useCallback((cb: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      cb();
    }, ms);
    pendingTimeoutsRef.current.add(id);
  }, []);

  const clearAllPendingTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    pendingTimeoutsRef.current.clear();
  }, []);

  /** 現ターンのホバー / マウス / スクロール計測をリセット */
  const resetTurnMetrics = useCallback(() => {
    firstHoverAtRef.current = null;
    hoverSequenceRef.current = [];
    distinctHoverOrderRef.current = [];
    lastHoverChoiceRef.current = null;
    lastHoverEnterAtRef.current = null;
    mouseDistanceRef.current = 0;
    lastPointerPosRef.current = null;
    scrollUpCountRef.current = 0;
    typingShownForHoverRef.current = false;
    hoverChoiceAtTypingRef.current = null;
  }, []);

  /**
   * ターン1「入力中」表示の前後でホバー先が変わったかを判定する。
   * - 入力中表示が出る前に確定 → null
   * - ターン中に一度もホバーなし → null
   * - それ以外 → 表示時点のホバー先と確定時点のホバー先が異なれば true
   */
  const computeTurn1HoverChanged = useCallback((): boolean | null => {
    if (!typingShownForHoverRef.current) return null;
    if (firstHoverAtRef.current === null) return null;
    return lastHoverChoiceRef.current !== hoverChoiceAtTypingRef.current;
  }, []);

  // onComplete の最新参照を保持（submitting effect の依存を最小化するため）
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // オンボーディング表示開始時刻を記録（tutorialViewTime 用）
  useEffect(() => {
    onboardingOpenedAtRef.current = Date.now();
  }, []);

  // 入力デバイス種別を「初回 turn-active 開始後の最初の操作」で確定する。
  // オンボーディング中の Tab / Cmd+R / Esc 等のキー操作で誤確定しないよう、
  // turn-active 中のみリスナーを有効にする（pen / 空文字は 'mouse' に丸める）。
  // 描画完了直後に同期実行する useLayoutEffect で登録し、turn-active 切替直後の
  // 最初の操作（pointerdown / keydown）を取りこぼさないようにする。
  useLayoutEffect(() => {
    if (gamePhase !== 'turn-active') return;
    const onPointerDown = (e: PointerEvent) => {
      if (inputDeviceDetectedRef.current) return;
      inputDeviceDetectedRef.current = true;
      inputDeviceTypeRef.current =
        e.pointerType === 'touch' ? 'touch' : 'mouse';
    };
    const onKeyDown = () => {
      if (inputDeviceDetectedRef.current) return;
      inputDeviceDetectedRef.current = true;
      inputDeviceTypeRef.current = 'keyboard';
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [gamePhase]);

  // =========================================================
  // ターン確定 → 次ターン or 送信へ
  // =========================================================
  /**
   * ターン結果を記録して次フェーズ（次ターンのカットイン or 送信）へ進める。
   *
   * 二重確定ガード・タイマー停止・予約 timeout の解除は **呼び出し側の責務**とする。
   * 通常は recordTurnAndAdvance がそれらを行ってから呼ぶが、ターン1の早押し時は
   * 「同期Aの挙手ビートを差し込んでから確定する」ため、確定を遅延させて直接呼ぶ。
   */
  const finalizeTurn = useCallback(
    (selectedOptionId: number, reactionTimeMs: number, isTimeout: boolean) => {
      const turn = TURNS[currentTurnIndex];
      if (!turn) return;
      setIsTypingIndicatorVisible(false);

      // 選択クリック由来の派生値（タイムアウト時は両方 null）。
      // ホバー refs から導出することで、selectOption 側のロジックを薄く保つ。
      const isClickedOption = !isTimeout && isOptionIntentId(selectedOptionId);
      const finalChoiceHoverOrder = (() => {
        if (!isClickedOption) return null;
        const idx = distinctHoverOrderRef.current.indexOf(selectedOptionId);
        return idx >= 0 ? idx + 1 : null;
      })();
      // 「クリックした選択肢に直近 hover していたか」を厳密に判定する。
      // 直近 hover 先と一致しない場合（キーボード操作・別の選択肢中のクリック等）は null。
      const decisionConfidenceMs =
        isClickedOption &&
        lastHoverEnterAtRef.current !== null &&
        lastHoverChoiceRef.current === selectedOptionId
          ? Date.now() - lastHoverEnterAtRef.current
          : null;

      const result: GroupChatGameTurn = {
        turnId: turn.turnId,
        selectedOptionId,
        reactionTimeMs,
        isTimeout,
        firstHoverElapsedMs:
          firstHoverAtRef.current !== null
            ? firstHoverAtRef.current - optionsShownAtRef.current
            : null,
        finalChoiceHoverOrder,
        decisionConfidenceMs,
        mouseMovementDistance: Math.round(mouseDistanceRef.current),
        hoverSequence: [...hoverSequenceRef.current],
        scrolledChatHistoryCount: scrollUpCountRef.current,
      };
      turnResultsRef.current = [...turnResultsRef.current, result];

      const nextIndex = currentTurnIndex + 1;
      if (nextIndex >= TOTAL_TURNS) {
        setGamePhase('submitting');
      } else {
        // 次ターンのタイマーバーを満タンで先出しして、カットイン中の表示崩れを防ぐ
        setRemainingTimeMs(TURNS[nextIndex]?.timerMs ?? 0);
        setCurrentTurnIndex(nextIndex);
        setGamePhase('turn-cutin');
      }
    },
    [currentTurnIndex]
  );

  /** 通常の確定: 二重確定ガード + タイマー停止 + 予約解除 + 結果記録/遷移 */
  const recordTurnAndAdvance = useCallback(
    (selectedOptionId: number, reactionTimeMs: number, isTimeout: boolean) => {
      if (turnResolvedRef.current) return;
      turnResolvedRef.current = true;
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      clearAllPendingTimeouts();
      finalizeTurn(selectedOptionId, reactionTimeMs, isTimeout);
    },
    [finalizeTurn, clearAllPendingTimeouts]
  );

  // =========================================================
  // ユーザー操作: 選択肢ホバー / クリック / 履歴スクロール
  // =========================================================

  /**
   * 選択肢にホバーしたとき（pointerenter）。
   * - `hoverSequence` への push は連続重複を抑制（同じ選択肢への連続 pointerenter を 1 件にまとめる）
   * - `lastHoverEnterAtRef` は同一選択肢への再ホバーでも更新する（`decisionConfidenceMs` を「直近の pointerenter からクリックまで」に保つため）
   */
  const handleOptionHover = useCallback(
    (optionId: OptionIntentId) => {
      if (gamePhase !== 'turn-active' || turnResolvedRef.current) return;

      const now = Date.now();
      if (firstHoverAtRef.current === null) firstHoverAtRef.current = now;

      const isSameAsLast = lastHoverChoiceRef.current === optionId;
      if (
        !isSameAsLast &&
        hoverSequenceRef.current.length < HOVER_SEQUENCE_CAP
      ) {
        hoverSequenceRef.current.push(optionId);
      }
      if (!distinctHoverOrderRef.current.includes(optionId)) {
        distinctHoverOrderRef.current.push(optionId);
      }
      lastHoverChoiceRef.current = optionId;
      lastHoverEnterAtRef.current = now;
    },
    [gamePhase]
  );

  /** チャット履歴を上方向にスクロールしたとき（1ジェスチャーにつき1回呼ばれる想定） */
  const handleHistoryScroll = useCallback(() => {
    if (gamePhase !== 'turn-active' || turnResolvedRef.current) return;
    scrollUpCountRef.current += 1;
  }, [gamePhase]);

  /** 選択肢をクリックしたとき */
  const selectOption = useCallback(
    (selectedOptionId: OptionIntentId) => {
      if (gamePhase !== 'turn-active' || turnResolvedRef.current) return;
      const turn = TURNS[currentTurnIndex];
      if (!turn) return;

      const now = Date.now();
      const reactionTimeMs = now - optionsShownAtRef.current;

      if (turn.turnId === 1) {
        // 先回り発言が出る前に答えたか
        turn1AnsweredBeforeColleagueARef.current = !t1PreemptShownRef.current;
        turn1TypingIndicatorReactTimeMsRef.current =
          t1TypingIndicatorShownAtRef.current !== null
            ? now - t1TypingIndicatorShownAtRef.current
            : null;
        turn1HoverChangedAfterColleagueATypingRef.current =
          computeTurn1HoverChanged();
      }

      // 選択した選択肢のテキストを user メッセージとして chat に表示する。
      //「（黙って様子を見る）」のような無反応系の選択肢も、プレイヤーに「反応した」ことが
      // 伝わるよう表示する（無表示だと反応の有無が分かりにくいため）。なお BE には
      // selectedOptionId のみ送るので、表示の有無は分析に影響しない。上司の反応分岐
      //（TURN2_BOSS_BRANCH）は selectedOptionId 基準のため「無反応扱い」の挙動は変わらない。
      const choice = turn.choices.find(
        (c) => c.selectedOptionId === selectedOptionId
      );
      const userMessage: ChatMessage | null = choice
        ? { type: 'user', text: choice.text }
        : null;

      // ターン1で、同期Aの先回り発言がまだ出ていないうちに答えた（早押し）場合:
      // 「同期Aの挙手 → 自分の発言」の順を必ず保つため、自分の発言の表示とターン遷移を
      // 遅延させ、先に同期Aの挙手ビート（入力中 → 私やりましょうか！）を差し込む。
      // 本筋シナリオ（同期Aが引き受ける）を全パターンで成立させるための演出。
      if (turn.turnId === 1 && !t1PreemptShownRef.current) {
        // 確定フラグだけ先に立て、タイマーと既存の時間ベース挙手予約(2.5s/5.0s)を止める。
        // 結果記録/遷移はビート終了後に finalizeTurn で行う。
        turnResolvedRef.current = true;
        // ビート進行中は選択肢を閉じる（誤操作・SE誤発火・固まったタイマー表示の防止）
        setIsTurnResolving(true);
        if (timerIdRef.current) {
          clearInterval(timerIdRef.current);
          timerIdRef.current = null;
        }
        clearAllPendingTimeouts();

        // この「入力中」は回答後に差し込む純粋な演出であり、プレイヤーの判断中に
        // 出た同期Aのタイピングではない。反応時間・hover変化などの計測値は上の
        // `turn.turnId === 1` ブロックでクリック時点の状態から既に確定記録済みのため、
        // 計測用 ref（t1TypingIndicatorShownAtRef / typingShownForHoverRef /
        // hoverChoiceAtTypingRef）はここでは意図的に更新しない。
        // 同期A「入力中」をすぐ表示（クリック→自分の発言までの「間」を埋める）
        setTypingSpeakerId('colleague-a');
        setIsTypingIndicatorVisible(true);

        // 自分の発言を表示する分の待ち時間（choice 不在の防御で userMessage が null の場合のみ 0）
        const userMessageDelay = userMessage ? T1_CATCHUP_USER_MESSAGE_MS : 0;

        // 同期A「私やりましょうか！」
        trackTimeout(() => {
          t1PreemptShownRef.current = true;
          setIsTypingIndicatorVisible(false);
          setChatMessages((prev) => [
            ...prev,
            toChatBotMessage(T1_PREEMPT_MESSAGE),
          ]);
        }, T1_CATCHUP_TYPING_MS);
        // 自分の発言（「（黙って様子を見る）」等も含めて表示する）
        if (userMessage) {
          trackTimeout(() => {
            setChatMessages((prev) => [...prev, userMessage]);
          }, T1_CATCHUP_TYPING_MS + userMessageDelay);
        }
        // ターン確定 → ターン2へ
        trackTimeout(
          () => finalizeTurn(selectedOptionId, reactionTimeMs, false),
          T1_CATCHUP_TYPING_MS + userMessageDelay + T1_CATCHUP_ADVANCE_MS
        );
        return;
      }

      // 通常: 同期Aの挙手が既に出ている / ターン2・3。自分の発言を即表示して確定。
      if (userMessage) {
        setChatMessages((prev) => [...prev, userMessage]);
      }
      recordTurnAndAdvance(selectedOptionId, reactionTimeMs, false);
    },
    [
      gamePhase,
      currentTurnIndex,
      recordTurnAndAdvance,
      finalizeTurn,
      trackTimeout,
      clearAllPendingTimeouts,
      computeTurn1HoverChanged,
    ]
  );

  // タイムアウト時の確定処理
  const handleTimeout = useCallback(() => {
    if (turnResolvedRef.current) return;
    const turn = TURNS[currentTurnIndex];
    if (!turn) return;

    if (turn.turnId === 1) {
      turn1AnsweredBeforeColleagueARef.current = null;
      turn1TypingIndicatorReactTimeMsRef.current = null;
      turn1HoverChangedAfterColleagueATypingRef.current =
        computeTurn1HoverChanged();
    }
    // タイムアウトは「無反応」扱い: user メッセージを chat に追加しない。
    // BE には selectedOptionId=0 / isTimeout=true で送るため分析側で識別可能。
    // クリックがないため finalChoiceHoverOrder / decisionConfidenceMs は
    // recordTurnAndAdvance 内で自動的に null になる。
    // 仕様: タイムアウトは reactionTimeMs を実時間（≒制限時間）として記録
    recordTurnAndAdvance(0, turn.timerMs, true);
  }, [currentTurnIndex, recordTurnAndAdvance, computeTurn1HoverChanged]);

  // =========================================================
  // カットイン演出: CUTIN_DURATION_MS 後に turn-active へ
  // =========================================================
  // この単発 timeout は共有 timeout 群（pendingTimeoutsRef / trackTimeout）に
  // 入れず、ローカル id で自前管理する。turn-active の useLayoutEffect は
  // コミット時（描画前）に bot メッセージ・「入力中」表示の timeout を予約するが、
  // この effect は useEffect（描画後）でクリーンアップが走る。共有 Set を
  // clearAllPendingTimeouts() で一括解除すると、直前のコミットで turn-active が
  // 予約したばかりの timeout まで消してしまい、メッセージ・入力中が表示されない。
  useEffect(() => {
    if (gamePhase !== 'turn-cutin') return;
    const id = setTimeout(() => {
      // 次ターン開始時に「確定中」を解除して ChoicePad を再表示できるようにする
      setIsTurnResolving(false);
      setGamePhase('turn-active');
    }, CUTIN_DURATION_MS);
    return () => clearTimeout(id);
  }, [gamePhase]);

  // =========================================================
  // turn-active: タイマー稼働 + メッセージ順次表示 + マウス軌跡計測
  // =========================================================
  // useLayoutEffect で描画完了直後に同期実行することで、ユーザーが
  // ChoicePad のボタンをクリック/ホバーできるようになる前に refs を
  // 確実に初期化する（reactionTimeMs / firstHoverElapsedMs の起点ズレ防止）。
  useLayoutEffect(() => {
    if (gamePhase !== 'turn-active') return;
    const turn = TURNS[currentTurnIndex];
    if (!turn) return;

    // 初期化（ref 代入のみ。setState は下のコールバックで行う）
    turnResolvedRef.current = false;
    optionsShownAtRef.current = Date.now();
    resetTurnMetrics();
    if (turn.turnId === 1) {
      t1PreemptShownRef.current = false;
      t1TypingIndicatorShownAtRef.current = null;
    }

    // マウス総移動距離の計測（turn-active 中のみ）。
    // ターン確定後（recordTurnAndAdvance で turnResolvedRef=true）から
    // effect cleanup までの pointermove は加算しない（防御的）。
    const onPointerMove = (e: PointerEvent) => {
      if (turnResolvedRef.current) return;
      const prev = lastPointerPosRef.current;
      if (prev) {
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        mouseDistanceRef.current += Math.sqrt(dx * dx + dy * dy);
      }
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', onPointerMove);

    // タイマー（interval コールバック内で setState）
    const start = Date.now();
    const intervalId = setInterval(() => {
      const remaining = Math.max(0, turn.timerMs - (Date.now() - start));
      setRemainingTimeMs(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId);
        timerIdRef.current = null;
        handleTimeout();
      }
    }, TIMER_TICK_MS);
    timerIdRef.current = intervalId;

    // ターン区切りセパレーター（連続タイムラインに追記）
    trackTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { type: 'separator', label: `--- TURN ${turn.turnId} ---` },
      ]);
    }, 0);

    if (turn.turnId === 1) {
      // 上司の依頼 → 同期A「入力中」→ 先回り発言
      trackTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          ...turn.initialBotMessages.map(toChatBotMessage),
        ]);
      }, 0);
      trackTimeout(() => {
        t1TypingIndicatorShownAtRef.current = Date.now();
        // 「入力中」表示時点のホバー先を記録（hover変化判定の起点）
        typingShownForHoverRef.current = true;
        hoverChoiceAtTypingRef.current = lastHoverChoiceRef.current;
        setTypingSpeakerId('colleague-a');
        setIsTypingIndicatorVisible(true);
      }, T1_TYPING_INDICATOR_DELAY_MS);
      trackTimeout(() => {
        t1PreemptShownRef.current = true;
        setIsTypingIndicatorVisible(false);
        setChatMessages((prev) => [
          ...prev,
          toChatBotMessage(T1_PREEMPT_MESSAGE),
        ]);
      }, T1_TYPING_INDICATOR_DELAY_MS + T1_PREEMPT_REVEAL_DELAY_MS);
    } else if (turn.turnId === 2) {
      // ターン1選択に応じた上司の冒頭セリフ → 同期A → 同期B を段階表示
      const turn1Result = turnResultsRef.current[0];
      const t1OptionId =
        turn1Result &&
        !turn1Result.isTimeout &&
        isOptionIntentId(turn1Result.selectedOptionId)
          ? turn1Result.selectedOptionId
          : null;
      const followSteps: { msg: ChatMessage; at: number }[] = [
        {
          msg: {
            type: 'bot',
            speaker: 'boss',
            text: getTurn2BossLine(t1OptionId),
          },
          at: TURN2_BOSS_LINE_DELAY_MS,
        },
        ...TURN2_FOLLOW_MESSAGES.map((f) => ({
          msg: toChatBotMessage(f.message),
          at: f.delayMs,
        })),
      ];
      followSteps.forEach(({ msg, at }) => {
        trackTimeout(() => setChatMessages((prev) => [...prev, msg]), at);
      });
    } else {
      // ターン3: 上司の名指しメッセージ
      trackTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          ...turn.initialBotMessages.map(toChatBotMessage),
        ]);
      }, 0);
    }

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      clearAllPendingTimeouts();
    };
  }, [
    gamePhase,
    currentTurnIndex,
    trackTimeout,
    handleTimeout,
    clearAllPendingTimeouts,
    resetTurnMetrics,
  ]);

  // =========================================================
  // submitting: GroupChatGameData を組み立てて onComplete
  // =========================================================
  useEffect(() => {
    if (gamePhase !== 'submitting' || submittedRef.current) return;
    submittedRef.current = true;

    const data: GroupChatGameData = {
      tutorialViewTime: tutorialViewTimeRef.current,
      turns: [...turnResultsRef.current],
      turn1AnsweredBeforeColleagueA: turn1AnsweredBeforeColleagueARef.current,
      turn1TypingIndicatorReactTimeMs:
        turn1TypingIndicatorReactTimeMsRef.current,
      turn1HoverChangedAfterColleagueATyping:
        turn1HoverChangedAfterColleagueATypingRef.current,
      inputDeviceType: inputDeviceTypeRef.current,
    };
    // onComplete（送信）は非同期だが、完了を待たずに completed へ進める。
    // 終了オーバーレイ内で submitStatus に応じた送信中 / 成功表示を出す設計のため。
    onCompleteRef.current(data);
    trackTimeout(() => setGamePhase('completed'), 0);
  }, [gamePhase, trackTimeout]);

  // =========================================================
  // unmount 時の全リソース解放
  // =========================================================
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      clearAllPendingTimeouts();
    };
  }, [clearAllPendingTimeouts]);

  // =========================================================
  // ゲーム開始（オンボーディングからの遷移）
  // =========================================================
  const startGame = useCallback(() => {
    if (gamePhase !== 'onboarding') return;
    tutorialViewTimeRef.current = Date.now() - onboardingOpenedAtRef.current;
    turnResultsRef.current = [];
    submittedRef.current = false;
    turnResolvedRef.current = false;
    turn1AnsweredBeforeColleagueARef.current = null;
    turn1TypingIndicatorReactTimeMsRef.current = null;
    turn1HoverChangedAfterColleagueATypingRef.current = null;
    t1PreemptShownRef.current = false;
    t1TypingIndicatorShownAtRef.current = null;
    // リトライ時に初回プレイの入力デバイス種別を持ち越さない（既定値に戻す）
    inputDeviceDetectedRef.current = false;
    inputDeviceTypeRef.current = 'keyboard';
    resetTurnMetrics();
    setIsTurnResolving(false);
    setChatMessages([]);
    setCurrentTurnIndex(0);
    setRemainingTimeMs(TURNS[0]?.timerMs ?? 0);
    setGamePhase('turn-cutin');
  }, [gamePhase, resetTurnMetrics]);

  // =========================================================
  // 派生値
  // =========================================================
  const currentTurn: TurnDefinition | null = TURNS[currentTurnIndex] ?? null;
  const typingSpeaker: Character | null =
    isTypingIndicatorVisible && typingSpeakerId
      ? CHARACTERS[typingSpeakerId]
      : null;

  return {
    gamePhase,
    chatMessages,
    remainingTimeMs,
    currentTurn,
    currentTurnIndex,
    totalTurns: TOTAL_TURNS,
    isTypingIndicatorVisible,
    isTurnResolving,
    typingSpeaker,
    startGame,
    selectOption,
    handleOptionHover,
    handleHistoryScroll,
  };
}
