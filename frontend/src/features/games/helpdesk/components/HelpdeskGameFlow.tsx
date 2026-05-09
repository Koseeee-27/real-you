'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HelpdeskGameData } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';
import { useHelpdeskGame } from '../hooks/useHelpdeskGame';
import Spinner from '@/components/ui/Spinner';
import ErrorScreen from '@/components/common/ErrorScreen';
import { GAME_TOPIC } from '../data/supportResponses';

type SubmitStatus = 'loading' | 'success' | 'error';

/**
 * `ErrorScreen` に渡す variant。
 * - `'retry'`   … 一時的な通信エラー（サーバ 5xx / ネットワーク失敗）想定
 * - `'restart'` … `RESTART_CODES`（user_not_found / invalid_user_id 等）、
 *                 user_id 欠損、またはリトライ上限超過
 */
type ErrorVariant = 'retry' | 'restart';

export default function HelpdeskGameFlow() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('loading');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('retry');
  const pendingDataRef = useRef<HelpdeskGameData | null>(null);

  // リトライ回数は描画ロジックに直接影響しない（catch 内で variant を決める材料
  // としてのみ使う）ため、useState ではなく useRef で扱う。
  // useResult.ts / BaselineSurvey.tsx と同じ流儀に揃えている。
  const retryCountRef = useRef(0);

  // 次画面への遷移用 setTimeout の ID を保持する。再スケジュール時のキャンセルと
  // unmount 時の cleanup で使う。タイマーを放置すると、unmount 後に router.push が
  // 走って意図しない遷移を引き起こす可能性があるため明示的に管理する。
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- サウンド管理用のRefとヘルパー ---
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const playSE = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  // 次画面への遷移を 2 秒後にスケジュールする。前回のタイマーが残っていれば
  // クリアしてから新しいタイマーを設定する。
  const scheduleRedirect = useCallback(
    (path: string) => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = setTimeout(() => {
        redirectTimeoutRef.current = null;
        router.push(path);
      }, 2000);
    },
    [router]
  );

  // BGMの初期化と再生管理
  useEffect(() => {
    const bgm = new Audio('/sounds/helpdesk-game-bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.2;
    bgmRef.current = bgm;

    const playBGM = () => {
      bgm.play().catch(() => {});
      window.removeEventListener('click', playBGM);
    };

    window.addEventListener('click', playBGM);
    playBGM(); // 前の画面（規約）から遷移した場合は、既にユーザー操作済みなので即再生される可能性が高い

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
   * submitGame(game_type=2) 呼び出しの共通処理。
   * 業務エラーコードに応じて以下の挙動を行う:
   *
   * - `duplicate_submission` … 既にサーバ側で受理済みなので次画面へ自動進行
   * - `RESTART_CODES`（user_not_found / invalid_user_id 等） … `restart` variant
   * - その他 … リトライ可能扱い。`MAX_RETRY_COUNT` 回に達した場合は `restart` に切替
   *
   * 成功時は `retryCountRef.current = 0` でリセットして次画面へ遷移する。
   * user_id 欠損は localStorage が空のままで回復不能なので即 `restart`。
   */
  const submitHelpdeskGame = useCallback(
    async (data: HelpdeskGameData) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setErrorVariant('restart');
        setSubmitStatus('error');
        return;
      }

      try {
        await submitGame({
          user_id: userId,
          game_type: 2,
          data,
        });
        retryCountRef.current = 0;
        setSubmitStatus('success');
        scheduleRedirect('/games/group-chat');
      } catch (err: unknown) {
        // duplicate_submission（同一 user_id で同じゲームを再送信）は
        // 既にサーバ側で受理済みなので、エラーにせず次画面へ自動進行する。
        // BaselineSurvey.tsx の terms_game 送信と同じ流儀。
        const isDuplicate =
          isApiClientError(err) && err.code === 'duplicate_submission';
        if (isDuplicate) {
          retryCountRef.current = 0;
          setSubmitStatus('success');
          scheduleRedirect('/games/group-chat');
          return;
        }

        // 業務エラーコードが「最初からやり直し」系の場合は restart。
        // それ以外（ネットワーク失敗・5xx・未知コード等）はリトライ可能扱いだが、
        // 既に MAX_RETRY_COUNT 回リトライ済みなら restart に切り替える。
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
    async (data: HelpdeskGameData) => {
      pendingDataRef.current = data;
      setSubmitStatus('loading');

      // 終了時にBGMを停止
      if (bgmRef.current) {
        bgmRef.current.pause();
      }

      await submitHelpdeskGame(data);
    },
    [submitHelpdeskGame]
  );

  const {
    instructionText,
    inputMethod,
    chatHistory,
    gamePhase,
    remainingTimeMs,
    speech,
    startGame: originalStartGame,
    endVoiceTurnManually: originalEndVoiceTurnManually,
    submitTextTurn,
    switchToText: originalSwitchToText,
    onKeyDown,
    resetTyping,
    voiceApiRetrying,
    voiceApiErrorVariant,
    retryVoiceApi: originalRetryVoiceApi,
    startInstruction: originalStartInstruction,
    gameTopic,
    hints,
  } = useHelpdeskGame({ onComplete: handleComplete });

  // voice-api-error フェーズで restart variant に切り替わったら ErrorScreen を全画面で
  // 表示するため、ゲーム中の BGM を裏で鳴らし続けるのは違和感がある。明示的に停止する。
  useEffect(() => {
    if (gamePhase === 'voice-api-error' && voiceApiErrorVariant === 'restart') {
      bgmRef.current?.pause();
    }
  }, [gamePhase, voiceApiErrorVariant]);

  // --- アクションをラップしてSEを追加 ---
  const startInstruction = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    originalStartInstruction();
  }, [originalStartInstruction, playSE]);

  const startGame = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    originalStartGame();
  }, [originalStartGame, playSE]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    playSE('/sounds/general-button-se.mp3');
    submitTextTurn(textInput);
    setTextInput('');
    resetTyping();
  }, [textInput, submitTextTurn, resetTyping, playSE]);

  const endVoiceTurnManually = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    originalEndVoiceTurnManually();
  }, [originalEndVoiceTurnManually, playSE]);

  const switchToText = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    originalSwitchToText();
  }, [originalSwitchToText, playSE]);

  const retryVoiceApi = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    originalRetryVoiceApi();
  }, [originalRetryVoiceApi, playSE]);

  const handleRetry = useCallback(async () => {
    playSE('/sounds/general-button-se.mp3');
    const data = pendingDataRef.current;
    if (!data) return;
    retryCountRef.current += 1;
    setSubmitStatus('loading');
    await submitHelpdeskGame(data);
  }, [submitHelpdeskGame, playSE]);

  const handleGoTop = useCallback(() => {
    playSE('/sounds/general-button-se.mp3');
    // RESTART_CODES（user_not_found / invalid_user_id 等）でトップに戻すケースでは、
    // 古い user_id を握ったまま再開しても同じエラーで詰むため localStorage を掃除する。
    // ResultPage.tsx / BaselineSurvey.tsx の handleGoTop と挙動を揃えている。
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_id');
    }
    // ErrorScreen 表示中も BGM が鳴り続けるのを防ぐ。
    // unmount 時の cleanup でも止まるが、ボタン押下前の状態を考慮して明示的に停止。
    bgmRef.current?.pause();
    router.push('/');
  }, [playSE, router]);

  const [hintIndex, setHintIndex] = useState(0);
  const [prevHints, setPrevHints] = useState(hints);

  if (hints !== prevHints) {
    setPrevHints(hints);
    setHintIndex(0);
  }

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#99c2ff] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/helpdesk-game-background.png')" }}
    >
      {/* 画面右上: キーボード入力 切替ボタン */}
      {inputMethod === 'voice' &&
        gamePhase !== 'tutorial' &&
        gamePhase !== 'instruction' && (
          <button
            onClick={switchToText}
            className="absolute right-4 top-4 z-20 rounded-full border-[3px] border-black bg-[#e0e0e0] px-4 py-1.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000] transition-transform hover:translate-y-0.5 hover:shadow-none"
          >
            キーボード入力
          </button>
        )}

      {/* --- AI応答取得失敗オーバーレイ ---
       * variant='retry' は既存のゲーム演出に馴染むカスタムオーバーレイで再試行を促す。
       * variant='restart'（user_id 欠損 / RESTART_CODES / リトライ上限超過）は
       * 共通の ErrorScreen に切り替えてトップに戻す。
       */}
      {gamePhase === 'voice-api-error' && voiceApiErrorVariant === 'retry' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 backdrop-blur-sm">
          <div className="rounded-2xl border-[4px] border-black bg-white p-8 text-center shadow-[8px_8px_0_0_#000]">
            <p className="text-xl font-bold text-red-600">通信に失敗しました</p>
            {voiceApiRetrying ? (
              <div className="mt-4">
                <Spinner message="リトライ中..." />
              </div>
            ) : (
              <button
                type="button"
                onClick={retryVoiceApi}
                className="mt-6 rounded-full border-[3px] border-black bg-[#3b82f6] px-8 py-3 font-bold text-white shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-1 hover:shadow-none"
              >
                リトライ
              </button>
            )}
          </div>
        </div>
      )}

      {gamePhase === 'voice-api-error' &&
        voiceApiErrorVariant === 'restart' && (
          <ErrorScreen variant="restart" onGoTop={handleGoTop} />
        )}

      {/* --- ルールポップアップ (チュートリアルフェーズ) --- */}
      {gamePhase === 'tutorial' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-[24px] border-[6px] border-black bg-white pt-10 pb-6 px-6 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.3s_ease-out]">
            <button
              onClick={startInstruction}
              className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-xl border-[4px] border-black bg-[#ff4d4f] text-xl font-black text-black shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-1 hover:shadow-none"
            >
              ×
            </button>
            <h2 className="mb-4 text-center text-2xl font-black tracking-widest text-black">
              ルール
            </h2>
            <div className="rounded-xl border-[4px] border-black bg-[#d9d9d9] p-4 text-sm font-bold leading-relaxed text-black h-48 overflow-y-auto">
              {instructionText}
            </div>
          </div>
        </div>
      )}

      {/* --- お題提示カットイン (インストラクションフェーズ) --- */}
      {gamePhase === 'instruction' && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/70 backdrop-blur-sm transition-all"
        >
          <div className="animate-[scaleIn_0.4s_ease-out] px-6 text-center">
            <p className="text-3xl lg:text-4xl font-black tracking-widest text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] leading-tight">
              {GAME_TOPIC.replace('【トラブル】', '')}
              <br />
              を相談せよ！
            </p>
            <p className="mt-8 animate-pulse text-sm font-bold text-white/70 tracking-widest">
              ▶︎ タップして開始
            </p>
          </div>
        </button>
      )}

      {/* --- 終了画面 (completed オーバーレイ) --- */}
      {gamePhase === 'completed' && submitStatus !== 'error' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          {submitStatus === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner message="結果を送信中..." />
            </div>
          ) : (
            <h2 className="text-6xl font-black tracking-widest text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-[scaleIn_0.5s_ease-out]">
              終了！
            </h2>
          )}
        </div>
      )}

      {/* --- 完了時のエラー: ErrorScreen に variant 別で委譲 --- */}
      {gamePhase === 'completed' &&
        submitStatus === 'error' &&
        (errorVariant === 'restart' ? (
          <ErrorScreen variant="restart" onGoTop={handleGoTop} />
        ) : (
          <ErrorScreen variant="retry" onRetry={handleRetry} />
        ))}

      {/* --- 画面下部の会話エリア --- */}
      <div className="absolute bottom-8 left-0 right-0 px-4 z-30">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          {gamePhase === 'awaiting-api' && (
            <div className="relative rounded-[24px] border-[6px] border-black bg-[#d9d9d9] px-6 py-8 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.3s_ease-out]">
              <div className="absolute -top-7 right-8 rounded-t-xl border-x-[6px] border-t-[6px] border-black bg-[#d9d9d9] px-6 py-1 text-lg font-black tracking-widest text-black">
                AI
              </div>
              <p className="text-xl font-bold leading-relaxed text-black">
                少々お待ちください。
              </p>
            </div>
          )}

          {gamePhase === 'support-speaking' && (
            <div className="relative rounded-[24px] border-[6px] border-black bg-[#d9d9d9] px-6 py-8 shadow-[8px_8px_0_0_#000] animate-[scaleIn_0.2s_ease-out]">
              <div className="absolute -top-7 right-8 rounded-t-xl border-x-[6px] border-t-[6px] border-black bg-[#d9d9d9] px-6 py-1 text-lg font-black tracking-widest text-black">
                AI
              </div>
              <p className="text-xl font-bold leading-relaxed text-black">
                {chatHistory.length > 0
                  ? chatHistory[chatHistory.length - 1].text
                  : ''}
              </p>
              <div className="absolute bottom-4 right-6 animate-bounce">
                <svg
                  width="24"
                  height="20"
                  viewBox="0 0 24 20"
                  fill="none"
                  stroke="black"
                  strokeWidth="4"
                  strokeLinejoin="round"
                >
                  <path d="M2 2L12 16L22 2" />
                </svg>
              </div>
            </div>
          )}

          {gamePhase === 'user-input' && (
            <>
              <div className="relative rounded-[24px] border-[6px] border-black bg-[#a6a6a6] px-6 py-4 shadow-[8px_8px_0_0_#000] opacity-90 mx-4 animate-[fadeInDown_0.3s_ease-out]">
                <div className="absolute -bottom-7 right-8 rounded-b-xl border-x-[6px] border-b-[6px] border-black bg-[#a6a6a6] px-4 py-1 text-sm font-black tracking-widest text-black">
                  AI
                </div>
                <p className="text-lg font-bold leading-relaxed text-black">
                  {chatHistory.length > 0
                    ? chatHistory[chatHistory.length - 1].text
                    : ''}
                </p>
              </div>

              <div className="relative mt-6 rounded-[24px] border-[6px] border-black bg-[#d9d9d9] px-6 py-8 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.3s_ease-out]">
                <div className="absolute -top-7 left-8 rounded-t-xl border-x-[6px] border-t-[6px] border-black bg-[#d9d9d9] px-6 py-1 text-lg font-black tracking-widest text-black">
                  あなた
                </div>

                {/* --- ヒント表示領域 --- */}
                <div className="absolute -right-4 -top-12 z-10 w-64 animate-[fadeIn_0.5s_ease-out] lg:-right-12">
                  <div className="relative rounded-2xl border-[4px] border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                    <div className="absolute -top-3 left-3 bg-[#f0f380] px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black border-[2px] border-black rounded-lg">
                      Advice
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-bold leading-snug text-gray-800">
                        {hints[hintIndex]}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          playSE('/sounds/general-button-se.mp3');
                          setHintIndex((prev) => (prev + 1) % hints.length);
                        }}
                        className="mt-0.5 shrink-0 rounded-full border-2 border-black bg-gray-100 p-1 hover:bg-gray-200 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          <path d="m9 10 3 3 3-3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-right">
                    <p className="text-[8px] font-black uppercase tracking-widest text-black/30">
                      Mission: {gameTopic.replace('【トラブル】', '')}
                    </p>
                  </div>
                </div>

                {inputMethod === 'voice' ? (
                  <p className="min-h-[3rem] text-xl font-bold leading-relaxed text-black">
                    {speech.interimText || (
                      <span className="text-gray-400">（お話ください...）</span>
                    )}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        onKeyDown();
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          handleTextSubmit();
                        }
                      }}
                      placeholder="キーボードで入力..."
                      className="flex-1 rounded-xl border-[4px] border-black bg-white px-4 py-3 text-lg font-bold text-black outline-none focus:bg-[#f0f0f0]"
                    />
                    <button
                      type="button"
                      onClick={handleTextSubmit}
                      className="rounded-xl border-[4px] border-black bg-[#57d071] px-6 py-2 text-lg font-black text-black shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-1 hover:shadow-none"
                    >
                      送信
                    </button>
                  </div>
                )}

                {inputMethod === 'voice' && speech.isListening && (
                  <div className="mt-6 flex justify-between items-end">
                    <div className="text-xs font-bold text-red-600 animate-pulse">
                      ● 録音中... 残り {Math.ceil(remainingTimeMs / 1000)}秒
                    </div>
                    <button
                      type="button"
                      onClick={endVoiceTurnManually}
                      className="rounded-xl border-[4px] border-black bg-[#57d071] px-8 py-2 text-lg font-black text-black shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-1 hover:shadow-none"
                    >
                      送信
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
