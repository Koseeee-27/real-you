'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import type { Game3Data } from '@/features/games/types';
import { BOTS } from '../data/stages';
import { useGroupChatGame } from '../hooks/useGroupChatGame';
// TODO: バックエンド接続時にコメント解除 → import { submitGame } from '@/lib/api';

const TUTORIAL_TEXT = `あなたは職場のグループチャットに
参加しています。

自由に返信せよ！！`;

function getBotByBotId(botId: string) {
  return BOTS.find((b) => b.id === botId);
}

export default function GroupChatGameFlow() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(
    async (data: Game3Data) => {
      console.log('Game3Data:', data);
      // TODO: バックエンド接続時に以下を有効化
      // const userId = localStorage.getItem('user_id');
      // if (userId) await submitGame({ user_id: userId, game_type: 3, data });
      setTimeout(() => {
        router.push('/result');
      }, 2000);
    },
    [router]
  );

  const {
    gamePhase,
    currentStage,
    currentStageIndex,
    chatMessages,
    remainingTimeMs,
    isTypingIndicatorVisible,
    typingBotName,
    startGame,
    selectOption,
    handleOptionHover,
    stageTimeLimitMs,
    totalStages,
    groupName,
    groupMemberCount,
  } = useGroupChatGame({ onComplete: handleComplete });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTypingIndicatorVisible, gamePhase]);

  if (gamePhase === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-lg font-bold">完了しました</p>
          <p className="mt-2 text-sm text-gray-500">
            Loading画面へ移動します...
          </p>
        </div>
      </div>
    );
  }

  const timerRatio = remainingTimeMs / stageTimeLimitMs;
  const timerColorClass =
    timerRatio > 0.5
      ? 'bg-green-500'
      : timerRatio > 0.2
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      {/* --- チュートリアルオーバーレイ --- */}
      {gamePhase === 'tutorial' && (
        <div
          role="button"
          tabIndex={0}
          onClick={startGame}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') startGame();
          }}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/30"
        >
          <div className="animate-[fadeInUp_0.4s_ease-out] px-6 text-center">
            <p className="text-lg font-black tracking-widest text-white drop-shadow-lg">
              指示‼️
            </p>
            <p className="mt-6 whitespace-pre-line text-xl font-bold leading-relaxed text-white drop-shadow-lg">
              {TUTORIAL_TEXT}
            </p>
            <p className="mt-8 animate-pulse text-sm text-white/70">
              タップして開始
            </p>
          </div>
        </div>
      )}

      {/* --- カットイン演出 --- */}
      {gamePhase === 'stage-cutin' && currentStage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="animate-[fadeInUp_0.3s_ease-out] text-center">
            <p className="text-4xl font-black text-white drop-shadow-lg">
              場面{currentStageIndex + 1}
            </p>
            <p className="mt-2 text-lg font-bold tracking-widest text-amber-300">
              {
                (['First', 'Second', 'Third', 'Fourth', 'Final'][
                  currentStageIndex
                ] ?? 'Unknown')
              }{' '}
              Situation!
            </p>
          </div>
        </div>
      )}

      {/* --- スマホフレーム --- */}
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border-2 border-gray-800 bg-white shadow-2xl"
        style={{ height: 'min(90vh, 700px)' }}
      >
        {/* ヘッダー: LINE風 */}
        <header className="flex items-center justify-between bg-blue-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-300" />
            <h1 className="text-sm font-bold">
              {groupName}({groupMemberCount})
            </h1>
          </div>
          {currentStage && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
              {currentStageIndex + 1}/{totalStages}
            </span>
          )}
        </header>

        {/* チャットエリア */}
        <div className="flex-1 overflow-y-auto bg-sky-100 px-3 py-3">
          <div className="space-y-3">
            {/* DAYラベル */}
            {currentStage && (
              <>
                <p className="text-center text-[10px] text-gray-400">TODAY</p>
                <p className="text-center">
                  <span className="inline-block rounded-full bg-gray-300/60 px-3 py-0.5 text-[10px] text-gray-500">
                    — {currentStage.dayLabel} —
                  </span>
                </p>
              </>
            )}

            {chatMessages.map((msg, i) =>
              msg.type === 'bot' ? (
                <div key={`s${currentStageIndex}-${i}-${msg.botId}`} className="flex items-start gap-2">
                  {(() => {
                    const bot = getBotByBotId(msg.botId);
                    return (
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            bot?.color ?? 'bg-gray-400 text-white'
                          }`}
                        >
                          {bot?.avatarLabel ?? '?'}
                        </div>
                        <span className="text-[9px] text-gray-500">
                          {bot?.name}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="max-w-[70%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm shadow-sm">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={`s${currentStageIndex}-${i}-user`} className="flex justify-end">
                  <div className="max-w-[70%] rounded-lg rounded-tr-none bg-green-400 px-3 py-2 text-sm text-white shadow-sm">
                    {msg.text}
                  </div>
                </div>
              )
            )}

            {/* 入力中インジケータ */}
            {isTypingIndicatorVisible && typingBotName && (
              <div className="flex items-center justify-center gap-2 rounded-full bg-white/80 px-4 py-1.5 shadow-sm mx-auto w-fit">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500"
                    style={{ animationDelay: '0.3s' }}
                  />
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {typingBotName}が返信中
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* 下部: タイマー + 選択肢 */}
        <div className="border-t border-gray-800 bg-amber-50">
          {gamePhase === 'waiting-input' && currentStage && (
            <div className="px-3 pb-3 pt-2">
              {/* タイマーゲージ */}
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full transition-all duration-100 ${timerColorClass}`}
                  style={{ width: `${timerRatio * 100}%` }}
                />
              </div>
              {/* 選択肢 */}
              {currentStage.options.some((o) => o.label) ? (
                <div className="flex flex-col gap-1.5">
                  {currentStage.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={handleOptionHover}
                      onFocus={handleOptionHover}
                      onClick={() => selectOption(idx + 1)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="text-base">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {currentStage.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={handleOptionHover}
                      onFocus={handleOptionHover}
                      onClick={() => selectOption(idx + 1)}
                      className="flex items-center justify-center rounded-lg border border-gray-300 bg-white py-3 text-3xl transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                      {opt.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {(gamePhase === 'chat-playing' || gamePhase === 'stage-cutin') && (
            <p className="py-3 text-center text-xs text-gray-400">
              メッセージを表示しています...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
