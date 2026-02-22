'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game2Data } from '@/features/games/types';
import { submitGame } from '@/lib/api';
import { useHelpdeskGame } from '../hooks/useHelpdeskGame';
import Spinner from '@/components/ui/Spinner';

type SubmitStatus = 'loading' | 'success' | 'error';

export default function HelpdeskGameFlow() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
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
    isVoiceSupported,
    voiceApiRetrying,
    retryVoiceApi,
  } = useHelpdeskGame({ onComplete: handleComplete });

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    submitTextTurn(textInput);
    setTextInput('');
    resetTyping();
  }, [textInput, submitTextTurn, resetTyping]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // --- 完了画面 ---
  if (gamePhase === 'completed') {
    if (submitStatus === 'loading') {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-top-pattern">
          <Spinner message="送信中..." />
        </div>
      );
    }
    if (submitStatus === 'error') {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-top-pattern">
          <p className="text-lg font-semibold text-red-600">
            通信に失敗しました
          </p>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            リトライ
          </button>
        </div>
      );
    }
    return (
      <div className="flex min-h-dvh items-center justify-center bg-top-pattern">
        <div className="text-center">
          <p className="text-lg font-bold">完了しました</p>
          <p className="mt-2 text-sm text-gray-500">
            次のゲームに移動します...
          </p>
        </div>
      </div>
    );
  }

  // --- チャット画面 ---
  return (
    <div className="relative flex min-h-dvh flex-col bg-top-pattern">
      {/* --- AI応答取得失敗オーバーレイ --- */}
      {gamePhase === 'voice-api-error' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/30 px-6">
          <div className="rounded-lg bg-white p-6 text-center shadow-lg">
            <p className="text-lg font-semibold text-red-600">
              通信に失敗しました
            </p>
            {voiceApiRetrying ? (
              <Spinner message="リトライ中..." />
            ) : (
              <button
                type="button"
                onClick={retryVoiceApi}
                className="mt-4 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                リトライ
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- 指示ポップアップ（オーバーレイ / 全体タップで進む） --- */}
      {gamePhase === 'instruction' && (
        <button
          type="button"
          onClick={startGame}
          className="absolute inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/30"
        >
          <div className="animate-[fadeInUp_0.4s_ease-out] px-6 text-center">
            <p className="text-lg font-black tracking-widest text-white drop-shadow-lg">
              指示‼️
            </p>
            <p className="mt-6 whitespace-pre-line text-xl font-bold leading-relaxed text-white drop-shadow-lg">
              {instructionText}
            </p>
            <p className="mt-6 text-sm leading-relaxed text-white/80">
              ※ 一部の環境では音声入力が利用できない場合があります。{'\n'}
              その場合はテキスト入力で返答してください。
            </p>
            <p className="mt-8 animate-pulse text-sm text-white/70">
              タップして開始
            </p>
          </div>
        </button>
      )}

      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-center text-sm font-bold">
          カスタマーサポートセンター
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {chatHistory.map((msg, i) =>
            msg.role === 'support' ? (
              <div key={`msg-${i}`} className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs">
                  担当
                </div>
                <div className="max-w-[75%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm shadow-sm">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div
                key={`msg-${i}`}
                className="flex items-start justify-end gap-2"
              >
                <div className="max-w-[75%] rounded-lg rounded-tr-none bg-blue-600 px-3 py-2 text-sm text-white shadow-sm">
                  {msg.text}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs">
                  あなた
                </div>
              </div>
            )
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="relative border-t bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {gamePhase === 'support-speaking' && (
            <p className="animate-pulse text-center text-xs text-gray-500">
              サポート担当が話しています...
            </p>
          )}
          {gamePhase === 'user-input' && (
            <p className="text-center text-xs text-gray-500">
              {inputMethod === 'voice'
                ? `残り ${Math.ceil(remainingTimeMs / 1000)} 秒`
                : 'テキスト入力（時間制限なし）'}
            </p>
          )}

          {inputMethod === 'voice' ? (
            <div className="flex flex-col items-center gap-2">
              {speech.isListening && (
                <>
                  <span className="text-sm text-red-600">録音中...</span>
                  <button
                    type="button"
                    onClick={endVoiceTurnManually}
                    className="rounded-full border border-red-300 bg-red-50 px-6 py-2 text-sm text-red-700 hover:bg-red-100"
                  >
                    送信
                  </button>
                </>
              )}
              {!isVoiceSupported && (
                <p className="text-xs text-amber-600">
                  お使いのブラウザでは音声認識に未対応です。テキスト入力に切り替えてください。
                </p>
              )}
            </div>
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
                placeholder="メッセージを入力..."
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleTextSubmit}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                送信
              </button>
            </div>
          )}
        </div>

        {inputMethod === 'voice' && (
          <button
            type="button"
            onClick={switchToText}
            className="absolute bottom-3 left-4 text-[10px] text-gray-400 underline hover:text-gray-600"
          >
            テキスト入力に切り替え
          </button>
        )}
      </div>
    </div>
  );
}
