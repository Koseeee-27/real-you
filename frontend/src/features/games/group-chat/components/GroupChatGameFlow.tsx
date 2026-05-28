'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GroupChatGameData } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';
import ErrorScreen from '@/components/common/ErrorScreen';
import { GROUP_HEADER, GROUP_MEMBER_COUNT } from '../data/turns';
import type { OptionIntentId } from '../data/turns';
import { useGroupChatGame } from '../hooks/useGroupChatGame';
import OnboardingSlides from './OnboardingSlides';
import DesktopBackdrop from './DesktopBackdrop';
import WindowChromeBar from './WindowChromeBar';
import TurnCutinOverlay from './TurnCutinOverlay';
import ChatTimeline from './ChatTimeline';
import ChoicePad from './ChoicePad';
import GroupChatEndedOverlay from './GroupChatEndedOverlay';

const SE_PATH = '/sounds/general-button-se.mp3';
/** オンボーディング中に流す RealYou 共通 BGM（トップページ等と同じ start-bgm） */
const COMMON_BGM_PATH = '/sounds/start-bgm.mp3';
/** ゲーム本編（turn-cutin / turn-active）で流すゲーム BGM */
const GAME_BGM_PATH = '/sounds/group-chat-game-bgm.mp3';

type SubmitStatus = 'loading' | 'success' | 'error';

/**
 * `ErrorScreen` に渡す variant。
 * - `'retry'`   … 一時的な通信エラー（サーバ 5xx / ネットワーク失敗）想定
 * - `'restart'` … `RESTART_CODES`、user_id 欠損、またはリトライ上限超過
 */
type ErrorVariant = 'retry' | 'restart';

/**
 * 空気読みグループチャット（game_type=3）のオーケストレーター。
 * 進行ロジックは useGroupChatGame に委譲し、本コンポーネントは
 * レイアウト・BGM/SE・送信・エラーハンドリングを担当する。
 */
export default function GroupChatGameFlow() {
  const router = useRouter();
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('loading');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('retry');
  const pendingDataRef = useRef<GroupChatGameData | null>(null);

  // BGM 管理。オンボーディング中は共通 BGM、ゲーム開始（turn-cutin 以降）でゲーム BGM に
  // 切り替える（仕分けゲームと同流儀）。「いま鳴らすべき BGM」は gamePhase から下の
  // reconciler effect が一元決定し、activeBgmRef が現在再生中の要素を指す。
  const commonBgmRef = useRef<HTMLAudioElement | null>(null);
  const gameBgmRef = useRef<HTMLAudioElement | null>(null);
  const activeBgmRef = useRef<HTMLAudioElement | null>(null);

  // リトライ回数は描画に直接影響しないため useRef で扱う（既存ゲームと同流儀）。
  const retryCountRef = useRef(0);
  // 次画面遷移用 setTimeout の ID。unmount 時の cleanup と再スケジュールに使う。
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSE = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  /** BGM を全系統まとめて停止する（送信開始 / トップ遷移時に使う） */
  const stopAllBgm = useCallback(() => {
    commonBgmRef.current?.pause();
    gameBgmRef.current?.pause();
  }, []);

  const scheduleRedirect = useCallback(
    (path: string) => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = setTimeout(() => {
        redirectTimeoutRef.current = null;
        router.push(path);
      }, 2000);
    },
    [router]
  );

  // BGM の初期化と自動再生制限の解除。
  // 共通 BGM（オンボーディング）とゲーム BGM（本編）を生成する。「どちらを鳴らすか」は
  // gamePhase から下の reconciler effect が決める。ここでは生成と、autoplay 制限の解除
  //（最初のクリックで現在の active BGM を再生し直す）だけ行う。
  useEffect(() => {
    const common = new Audio(COMMON_BGM_PATH);
    common.loop = true;
    // 共通 BGM はトップページ等と音量を揃える（0.4）
    common.volume = 0.4;
    commonBgmRef.current = common;

    const game = new Audio(GAME_BGM_PATH);
    game.loop = true;
    game.volume = 0.3;
    gameBgmRef.current = game;

    // 自動再生制限の解除: マウント直後の play() は弾かれることがあるため、最初のクリックで
    // 「いま鳴らすべき BGM」(activeBgmRef、初期はオンボーディングの共通 BGM) を再生し直す。
    const unlockPlay = () => {
      activeBgmRef.current?.play().catch(() => {});
      window.removeEventListener('click', unlockPlay);
    };
    window.addEventListener('click', unlockPlay);

    return () => {
      common.pause();
      game.pause();
      window.removeEventListener('click', unlockPlay);
    };
  }, []);

  // unmount 時に予約済みの遷移タイマーをキャンセルする。
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * submitGame(game_type=3) 呼び出しの共通処理。
   * - `duplicate_submission` … 受理済みとして次画面へ自動進行
   * - `RESTART_CODES` / user_id 欠損 / リトライ上限超過 … `restart`
   * - その他 … `retry`
   */
  const submitGroupChatGame = useCallback(
    async (data: GroupChatGameData) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setErrorVariant('restart');
        setSubmitStatus('error');
        return;
      }

      try {
        await submitGame({ user_id: userId, game_type: 3, data });
        retryCountRef.current = 0;
        setSubmitStatus('success');
        scheduleRedirect('/result');
      } catch (err: unknown) {
        const isDuplicate =
          isApiClientError(err) && err.code === 'duplicate_submission';
        if (isDuplicate) {
          retryCountRef.current = 0;
          setSubmitStatus('success');
          scheduleRedirect('/result');
          return;
        }

        if (isApiClientError(err) && isRestartCode(err.code)) {
          setErrorVariant('restart');
        } else if (retryCountRef.current >= MAX_RETRY_COUNT) {
          setErrorVariant('restart');
        } else {
          setErrorVariant('retry');
        }
        setSubmitStatus('error');
      }
    },
    [scheduleRedirect]
  );

  const handleComplete = useCallback(
    async (data: GroupChatGameData) => {
      pendingDataRef.current = data;
      setSubmitStatus('loading');
      // 送信開始時点で BGM を停止（成功・duplicate・error すべての経路で止める）。
      // 通常は gamePhase が submitting に移った時点で reconciler が止めるが、防御的に明示する。
      stopAllBgm();
      await submitGroupChatGame(data);
    },
    [submitGroupChatGame, stopAllBgm]
  );

  const handleRetry = useCallback(async () => {
    playSE(SE_PATH);
    const data = pendingDataRef.current;
    if (!data) return;
    retryCountRef.current += 1;
    setSubmitStatus('loading');
    await submitGroupChatGame(data);
  }, [submitGroupChatGame, playSE]);

  const handleGoTop = useCallback(() => {
    playSE(SE_PATH);
    // 古い user_id を握ったままだと同じエラーで詰むため掃除する（他画面と同流儀）。
    if (typeof window !== 'undefined') localStorage.removeItem('user_id');
    stopAllBgm();
    router.push('/');
  }, [playSE, router, stopAllBgm]);

  const {
    gamePhase,
    chatMessages,
    remainingTimeMs,
    currentTurn,
    currentTurnIndex,
    totalTurns,
    isTurnResolving,
    typingSpeaker,
    startGame: rawStartGame,
    selectOption: rawSelectOption,
    handleOptionHover,
    handleHistoryScroll,
  } = useGroupChatGame({ onComplete: handleComplete });

  // 「いま鳴らすべき BGM」を gamePhase から一元的に決めて1系統だけ再生する。
  //   - onboarding              … 共通 BGM（トップページ等と同じ start-bgm）
  //   - turn-cutin / turn-active … ゲーム BGM
  //   - submitting / completed   … 無音（結果・送信表示中は BGM を流さない）
  // 切替は「前の要素を pause → 対象を play」。対象が未生成（null）の間は無音。
  useEffect(() => {
    const target =
      gamePhase === 'onboarding'
        ? commonBgmRef.current
        : gamePhase === 'turn-cutin' || gamePhase === 'turn-active'
          ? gameBgmRef.current
          : null;
    if (activeBgmRef.current === target) return;
    activeBgmRef.current?.pause();
    activeBgmRef.current = target;
    target?.play().catch(() => {});
  }, [gamePhase]);

  // SE を鳴らすようにラップ
  const startGame = useCallback(() => {
    playSE(SE_PATH);
    rawStartGame();
  }, [rawStartGame, playSE]);

  const selectOption = useCallback(
    (id: OptionIntentId) => {
      playSE(SE_PATH);
      rawSelectOption(id);
    },
    [rawSelectOption, playSE]
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden p-4"
      style={{ height: '100dvh' }}
    >
      {/* デスクトップ背景（壁紙 + 装飾ウィンドウ） */}
      <DesktopBackdrop />

      {gamePhase === 'onboarding' && <OnboardingSlides onStart={startGame} />}

      {gamePhase !== 'onboarding' && (
        <div className="relative z-10 flex h-[800px] max-h-[92vh] w-[1240px] max-w-[96vw] flex-col overflow-hidden rounded-[22px] border-[6px] border-black bg-white shadow-[10px_10px_0_0_rgba(0,0,0,0.35),0_36px_90px_rgba(0,0,0,0.32)]">
          {/* PC アプリウィンドウ風タイトルバー（信号機ボタン） */}
          <WindowChromeBar title="メッセージ" />

          {/* ヘッダー */}
          <header className="flex h-[66px] shrink-0 items-center justify-between border-b-[6px] border-black bg-[#2d5be3] px-[30px] text-white">
            <div className="flex items-center gap-3 text-xl font-black tracking-wider">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-black bg-[#57d071]" />
              {GROUP_HEADER}({GROUP_MEMBER_COUNT})
            </div>
            <span className="rounded-full border-[3px] border-black bg-white px-4 py-1.5 text-sm font-black text-black shadow-[3px_3px_0_0_#000]">
              {Math.min(currentTurnIndex + 1, totalTurns)}/{totalTurns}
            </span>
          </header>

          <ChatTimeline
            messages={chatMessages}
            typingSpeaker={typingSpeaker}
            onHistoryScroll={handleHistoryScroll}
          />

          {/* 回答確定中（早押し時の同期A挙手ビート進行中）は ChoicePad を閉じる */}
          {gamePhase === 'turn-active' && currentTurn && !isTurnResolving ? (
            <ChoicePad
              turn={currentTurn}
              remainingTimeMs={remainingTimeMs}
              onSelect={selectOption}
              onHover={handleOptionHover}
            />
          ) : (
            <div className="shrink-0 border-t-[6px] border-black bg-[#f1cf44] py-6 text-center text-sm font-bold text-black/60">
              メッセージを表示しています...
            </div>
          )}

          {/* カットイン演出（アプリウィンドウ内に重ねる） */}
          {gamePhase === 'turn-cutin' && (
            <TurnCutinOverlay turnNumber={currentTurnIndex + 1} />
          )}
        </div>
      )}

      {/* 終了オーバーレイ: 成功 / 送信中 */}
      {gamePhase === 'completed' && submitStatus !== 'error' && (
        <GroupChatEndedOverlay submitStatus={submitStatus} />
      )}

      {/* 終了時のエラー: ErrorScreen に variant 別で委譲 */}
      {gamePhase === 'completed' &&
        submitStatus === 'error' &&
        (errorVariant === 'restart' ? (
          <ErrorScreen variant="restart" onGoTop={handleGoTop} />
        ) : (
          <ErrorScreen variant="retry" onRetry={handleRetry} />
        ))}
    </div>
  );
}
