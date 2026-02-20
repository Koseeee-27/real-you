'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game2Data } from '@/features/games/types';
import { useHelpdeskGame } from '../hooks/useHelpdeskGame';

export default function HelpdeskGameFlow() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(
    (data: Game2Data) => {
      // TODO: バックエンド接続時に API 送信に差し替える
      console.log('Game2Data:', data);
      setTimeout(() => {
        router.push('/games/group-chat');
      }, 2000);
    },
    [router]
  );

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
    return (
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="relative flex h-screen flex-col bg-gray-50">
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
            <p className="mt-10 animate-pulse text-sm text-white/70">
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
