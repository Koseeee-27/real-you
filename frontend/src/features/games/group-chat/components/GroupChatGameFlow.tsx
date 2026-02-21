'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game3Data } from '@/features/games/types';
import { BOTS } from '../data/stages';
import { useGroupChatGame } from '../hooks/useGroupChatGame';
import { submitGame } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';

const TUTORIAL_TEXT = `あなたは職場のグループチャットに
参加しています。

自由に返信せよ！！`;

type SubmitStatus = 'loading' | 'success' | 'error';

function getBotByBotId(botId: string) {
  return BOTS.find((b) => b.id === botId);
}

export default function GroupChatGameFlow() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('loading');
  const pendingDataRef = useRef<Game3Data | null>(null);

  const submitGame3 = useCallback(async (data: Game3Data) => {
    const userId = localStorage.getItem('user_id');
    if (!userId) throw new Error('user_id が見つかりません');
    await submitGame({
      user_id: userId,
      game_type: 3,
      data: data as unknown as Record<string, unknown>,
    });
  }, []);

  const handleComplete = useCallback(
    async (data: Game3Data) => {
      pendingDataRef.current = data;
      setSubmitStatus('loading');

      try {
        await submitGame3(data);
        setSubmitStatus('success');
        setTimeout(() => {
          router.push('/result');
        }, 2000);
      } catch {
        setSubmitStatus('error');
      }
    },
    [router, submitGame3]
  );

  const handleRetry = useCallback(async () => {
    const data = pendingDataRef.current;
    if (!data) return;
    setSubmitStatus('loading');
    try {
      await submitGame3(data);
      setSubmitStatus('success');
      setTimeout(() => {
        router.push('/result');
      }, 2000);
    } catch {
      setSubmitStatus('error');
    }
  }, [router, submitGame3]);

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

  const timerRatio = remainingTimeMs / stageTimeLimitMs;
  const timerColorClass =
    timerRatio > 0.5
      ? 'bg-green-500'
      : timerRatio > 0.2
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4"
      style={{ backgroundColor: '#F0D44A' }}
    >
      {/* 背景のドット模様（CSSで描画） */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#b8a030 3px, transparent 3px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* --- チュートリアルオーバーレイ --- */}
      {gamePhase === 'tutorial' && (
        <div
          role="button"
          tabIndex={0}
          onClick={startGame}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') startGame();
          }}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/60"
        >
          <div className="absolute inset-0 z-0 opacity-40 bg-[radial-gradient(#b8a030_3px,transparent_3px)] [background-size:24px_24px]" />
          <div className="z-10 animate-[fadeInUp_0.4s_ease-out] px-6 text-center">
            <p className="text-3xl font-black tracking-widest text-white drop-shadow-md">
              適切に応答せよ！
            </p>
            <p className="mt-6 whitespace-pre-line text-lg font-bold leading-relaxed text-white drop-shadow-md">
              {TUTORIAL_TEXT}
            </p>
            <p className="mt-8 animate-pulse text-sm font-bold text-white/80">
              タップして開始
            </p>
          </div>
        </div>
      )}

      {/* --- カットイン演出 --- */}
      {gamePhase === 'stage-cutin' && currentStage && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/60">
          <div className="animate-[fadeInUp_0.3s_ease-out] text-center">
            <p className="text-4xl font-black text-white drop-shadow-lg">
              場面{currentStageIndex + 1}
            </p>
            <p className="mt-2 text-lg font-bold tracking-widest text-amber-300">
              {['First', 'Second', 'Third', 'Fourth', 'Final'][
                currentStageIndex
              ] ?? 'Unknown'}{' '}
              Situation!
            </p>
          </div>
        </div>
      )}

      {/* --- 終了（完了）オーバーレイ --- */}
      {gamePhase === 'completed' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60">
          <div className="absolute inset-0 z-0 opacity-40 bg-[radial-gradient(#b8a030_3px,transparent_3px)] [background-size:24px_24px]" />

          <div className="z-10 animate-[fadeInUp_0.4s_ease-out] px-6 text-center">
            {submitStatus === 'error' ? (
              <>
                <p className="text-4xl font-black tracking-widest text-[#e03131] drop-shadow-md bg-white px-6 py-2 rounded-xl border-[4px] border-black">
                  通信エラー！
                </p>
                <button
                  onClick={handleRetry}
                  className="mt-6 flex items-center justify-center rounded-xl border-[4px] border-black bg-white px-8 py-3 text-xl font-black text-black shadow-[4px_4px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] mx-auto"
                >
                  リトライする
                </button>
              </>
            ) : (
              <>
                <p className="text-6xl font-black tracking-widest text-white drop-shadow-lg">
                  終了！
                </p>
                {submitStatus === 'loading' && (
                  <div className="mt-8 flex justify-center text-white">
                    <Spinner message="送信中..." />
                  </div>
                )}
                {submitStatus === 'success' && (
                  <p className="mt-6 text-lg font-bold text-white/80">
                    Loading画面へ移動します...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* --- スマホフレーム --- */}
      <div
        className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-[24px] border-[6px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] transition-all"
        style={{ height: 'min(90vh, 700px)' }}
      >
        {/* ヘッダー: LINE風 */}
        <header className="flex items-center justify-between border-b-[6px] border-black bg-[#2d5be3] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-[2px] border-black bg-[#57d071]" />
            <h1 className="text-lg font-black tracking-widest">
              {groupName}({groupMemberCount})
            </h1>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center rounded-full border-[3px] border-black bg-[#e03131] px-4 py-1 text-xs font-black shadow-[2px_2px_0_0_#000] transition-all hover:translate-y-0.5 hover:shadow-[0_0_0_0_#000]"
          >
            RESET
          </button>
        </header>

        {/* チャットエリア */}
        <div className="flex-1 overflow-y-auto bg-[#dae5f3] px-3 py-4">
          <div className="space-y-4">
            {/* DAYラベル */}
            {currentStage && (
              <>
                <div className="my-2 flex justify-center">
                  <span className="rounded-full border-[2px] border-gray-300 bg-white/50 px-4 py-1 text-[10px] font-bold text-gray-500">
                    TODAY
                  </span>
                </div>
                <div className="my-2 flex justify-center">
                  <span className="rounded-full border-[2px] border-gray-300 bg-white/50 px-4 py-1 text-[10px] font-bold text-gray-500">
                    --- {currentStage.dayLabel} ---
                  </span>
                </div>
              </>
            )}

            {chatMessages.map((msg, i) =>
              msg.type === 'bot' ? (
                <div
                  key={`s${currentStageIndex}-${i}-${msg.botId}`}
                  className="flex items-start gap-2"
                >
                  {(() => {
                    const bot = getBotByBotId(msg.botId);
                    return (
                      <div className="mt-1 flex flex-col items-center gap-1">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-black text-sm font-black shadow-[2px_2px_0_0_#000] ${bot?.color ?? 'bg-gray-400 text-white'
                            }`}
                        >
                          {bot?.avatarLabel ?? '?'}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex flex-col">
                    <span className="mb-1 ml-1 text-[10px] font-bold text-gray-600">
                      {getBotByBotId(msg.botId)?.name}
                    </span>
                    <div className="max-w-[80%] rounded-2xl rounded-tl-none border-[3px] border-black bg-white px-4 py-3 text-sm font-bold text-black shadow-[2px_2px_0_0_#000]">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={`s${currentStageIndex}-${i}-user`}
                  className="flex justify-end"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-tr-none border-[3px] border-black bg-[#57d071] px-4 py-3 text-sm font-bold text-white shadow-[2px_2px_0_0_#000]">
                    {msg.text}
                  </div>
                </div>
              )
            )}

            {/* 入力中インジケータ */}
            {isTypingIndicatorVisible && typingBotName && (
              <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2 shadow-[2px_2px_0_0_#000]">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black" />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-black"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-black"
                    style={{ animationDelay: '0.3s' }}
                  />
                </span>
                <span className="text-sm font-bold text-black">
                  {typingBotName}が返信中
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* 下部: タイマー + 選択肢 */}
        <div className="border-t-[6px] border-black bg-[#f1cf44] pb-6">
          {gamePhase === 'waiting-input' && currentStage && (
            <>
              {/* タイマーゲージ */}
              <div className="h-2 w-full bg-black">
                <div
                  className="h-full bg-[#e03131] transition-all duration-100"
                  style={{ width: `${timerRatio * 100}%` }}
                />
              </div>
              {/* 選択肢 */}
              <div className="px-5 pt-5 pb-2">
                {currentStage.options.some((o) => o.label) ? (
                  <div className="flex flex-col gap-3">
                    {currentStage.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseEnter={() => handleOptionHover(idx + 1)}
                        onFocus={() => handleOptionHover(idx + 1)}
                        onClick={() => selectOption(idx + 1)}
                        className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-white px-5 py-3.5 text-left font-bold transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="text-[13px] text-black">
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {currentStage.options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseEnter={() => handleOptionHover(idx + 1)}
                        onFocus={() => handleOptionHover(idx + 1)}
                        onClick={() => selectOption(idx + 1)}
                        className="flex items-center justify-center rounded-xl border-[3px] border-black bg-white py-4 text-3xl font-bold transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                      >
                        {opt.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {(gamePhase === 'chat-playing' || gamePhase === 'stage-cutin') && (
            <p className="py-6 text-center text-sm font-bold text-black/60">
              メッセージを表示しています...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
