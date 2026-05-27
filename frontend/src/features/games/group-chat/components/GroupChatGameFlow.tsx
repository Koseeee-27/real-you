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
const BGM_PATH = '/sounds/group-chat-game-bgm.mp3';

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
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // リトライ回数は描画に直接影響しないため useRef で扱う（既存ゲームと同流儀）。
  const retryCountRef = useRef(0);
  // 次画面遷移用 setTimeout の ID。unmount 時の cleanup と再スケジュールに使う。
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSE = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
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

  // BGM の初期化と再生管理
  useEffect(() => {
    const bgm = new Audio(BGM_PATH);
    bgm.loop = true;
    bgm.volume = 0.3;
    bgmRef.current = bgm;

    // 自動再生がブロックされた場合に備え、再生に成功したときだけ
    // click リスナーを解除する（失敗時は次のクリックで再試行できるよう残す）。
    const playBGM = () => {
      bgm
        .play()
        .then(() => {
          window.removeEventListener('click', playBGM);
        })
        .catch(() => {});
    };
    window.addEventListener('click', playBGM);
    // 前の画面から継続している場合は即再生
    playBGM();

    return () => {
      bgm.pause();
      window.removeEventListener('click', playBGM);
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
      bgmRef.current?.pause();
      await submitGroupChatGame(data);
    },
    [submitGroupChatGame]
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
    bgmRef.current?.pause();
    router.push('/');
  }, [playSE, router]);

  const {
    gamePhase,
    chatMessages,
    remainingTimeMs,
    currentTurn,
    currentTurnIndex,
    totalTurns,
    typingSpeaker,
    startGame: rawStartGame,
    selectOption: rawSelectOption,
  } = useGroupChatGame({ onComplete: handleComplete });

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

          <ChatTimeline messages={chatMessages} typingSpeaker={typingSpeaker} />

          {gamePhase === 'turn-active' && currentTurn ? (
            <ChoicePad
              turn={currentTurn}
              remainingTimeMs={remainingTimeMs}
              onSelect={selectOption}
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
