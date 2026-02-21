'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import type { Game2Data } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import { useHelpdeskGame } from '../hooks/useHelpdeskGame';
import Spinner from '@/components/ui/Spinner';
import { GAME_TOPIC } from '../data/supportResponses';

type SubmitStatus = 'loading' | 'success' | 'error';

export default function HelpdeskGameFlow() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('loading');
  const pendingDataRef = useRef<Game2Data | null>(null);

  const submitGame2 = useCallback(async (data: Game2Data) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) throw new Error('user_id が見つかりません');
    await submitGame({
      user_id: userId,
      game_type: 2,
      data: data as unknown as Record<string, unknown>,
    });
  }, []);

  const handleComplete = useCallback(
    async (data: Game2Data) => {
      pendingDataRef.current = data;
      setSubmitStatus('loading');

      try {
        await submitGame2(data);
        setSubmitStatus('success');
        setTimeout(() => {
          router.push('/games/group-chat');
        }, 2000);
      } catch {
        setSubmitStatus('error');
      }
    },
    [router, submitGame2]
  );

  const handleRetry = useCallback(async () => {
    const data = pendingDataRef.current;
    if (!data) return;
    setSubmitStatus('loading');
    try {
      await submitGame2(data);
      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/games/group-chat');
      }, 2000);
    } catch {
      setSubmitStatus('error');
    }
  }, [router, submitGame2]);

  const {
    instructionText,
    inputMethod,
    chatHistory,
    gamePhase,
    remainingTimeMs,
    speech,
    startGame,
    endVoiceTurnManually,
    submitTextTurn,
    switchToText,
    onKeyDown,
    resetTyping,
    voiceApiRetrying,
    retryVoiceApi,
    startInstruction,
  } = useHelpdeskGame({ onComplete: handleComplete });

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    submitTextTurn(textInput);
    setTextInput('');
    resetTyping();
  }, [textInput, submitTextTurn, resetTyping]);

  // --- チャット画面 (ゲームメイン画面) ---
  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#99c2ff] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/game2_backcground.png')" }}
    >
      {/* 画面左上: カスタマーサポートセンター ラベル */}
      <div className="absolute left-0 top-0 z-20 rounded-br-lg border-b-[4px] border-r-[4px] border-black bg-gray-400 px-4 py-2 shadow-sm font-black text-black">
        カスタマーサポートセンター
      </div>

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

      {/* --- AI応答取得失敗オーバーレイ --- */}
      {gamePhase === 'voice-api-error' && (
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

      {/* --- ルールポップアップ (チュートリアルフェーズ) --- */}
      {gamePhase === 'tutorial' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-[24px] border-[6px] border-black bg-white pt-10 pb-6 px-6 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.3s_ease-out]">
            {/* 閉じるボタン */}
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
      {gamePhase === 'completed' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          {submitStatus === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner message="結果を送信中..." />
            </div>
          ) : submitStatus === 'error' ? (
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-3xl font-black text-red-500 drop-shadow-md">
                通信に失敗しました
              </h2>
              <button
                onClick={handleRetry}
                className="rounded-xl border-[4px] border-black bg-[#3b82f6] px-8 py-3 text-xl font-bold text-white shadow-[4px_4px_0_0_#000] transition-transform hover:translate-y-1 hover:shadow-none"
              >
                リトライ
              </button>
            </div>
          ) : (
            <h2 className="text-6xl font-black tracking-widest text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-[scaleIn_0.5s_ease-out]">
              終了！
            </h2>
          )}
        </div>
      )}

      {/* --- 画面下部の会話エリア --- */}
      <div className="absolute bottom-8 left-0 right-0 px-4 z-30">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          {/* AI 思考中 */}
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

          {/* AI 発話中 */}
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
              {/* ▼ 進むアイコン風 */}
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

          {/* ユーザー入力中（ストーリーモード風 2段） */}
          {gamePhase === 'user-input' && (
            <>
              {/* 上段：AIの直前の発言履歴 */}
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

              {/* 下段：あなたの現在の入力 */}
              <div className="relative mt-6 rounded-[24px] border-[6px] border-black bg-[#d9d9d9] px-6 py-8 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.3s_ease-out]">
                <div className="absolute -top-7 left-8 rounded-t-xl border-x-[6px] border-t-[6px] border-black bg-[#d9d9d9] px-6 py-1 text-lg font-black tracking-widest text-black">
                  あなた
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

                {/* 音声入力時の送信ボタン */}
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
