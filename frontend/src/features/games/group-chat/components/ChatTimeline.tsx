'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CHARACTERS } from '../data/turns';
import type { Character } from '../data/turns';
import type { ChatMessage } from '../hooks/useGroupChatGame';

interface ChatTimelineProps {
  messages: ChatMessage[];
  /** 入力中インジケータの話者（非表示時は null） */
  typingSpeaker: Character | null;
  /** チャット履歴を上方向にスクロールしたとき（1ジェスチャーにつき1回）。履歴遡り計測用 */
  onHistoryScroll?: () => void;
}

/** 上方向スクロールと判定する最小移動量（px） */
const SCROLL_UP_THRESHOLD_PX = 4;
/** 連続スクロールを1ジェスチャーにまとめるデバウンス（ms） */
const SCROLL_UP_DEBOUNCE_MS = 300;

/** 「@あなた」を赤＋下線で強調する（T3 上司メッセージ用） */
function renderText(text: string, hasMention?: boolean): ReactNode {
  if (!hasMention) return text;
  const parts = text.split('@あなた');
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 && (
        <span className="font-black text-[#e03131] underline decoration-[3px] underline-offset-2">
          @あなた
        </span>
      )}
      {part}
    </span>
  ));
}

/** 連続したチャットタイムライン。新規追記時に末尾へ自動スクロールする。 */
export default function ChatTimeline({
  messages,
  typingSpeaker,
  onHistoryScroll,
}: ChatTimelineProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const prevScrollTopRef = useRef(0);
  const lastScrollUpAtRef = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingSpeaker]);

  // 上方向スクロール（履歴遡り）を1ジェスチャー単位で検知する。
  // 自動スクロール（scrollIntoView）は下方向なので誤カウントしない。
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const prev = prevScrollTopRef.current;
    prevScrollTopRef.current = scrollTop;
    if (scrollTop < prev - SCROLL_UP_THRESHOLD_PX) {
      const now = Date.now();
      if (now - lastScrollUpAtRef.current > SCROLL_UP_DEBOUNCE_MS) {
        lastScrollUpAtRef.current = now;
        onHistoryScroll?.();
      }
    }
  };

  return (
    <div
      className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#dae5f3] px-9 py-[26px]"
      onScroll={handleScroll}
    >
      {messages.map((msg, i) => {
        if (msg.type === 'separator') {
          return (
            <div key={i} className="flex justify-center">
              <span className="rounded-full border-2 border-gray-300 bg-white/75 px-4 py-1 text-[11px] font-bold tracking-wider text-gray-500">
                {msg.label}
              </span>
            </div>
          );
        }
        if (msg.type === 'bot') {
          const speaker = CHARACTERS[msg.speaker];
          return (
            <div
              key={i}
              className="flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3.5"
            >
              <Image
                src={speaker.iconPath}
                alt={speaker.name}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
              />
              <div className="flex max-w-[560px] flex-col">
                <span className="mb-1 ml-1 text-xs font-bold text-gray-600">
                  {speaker.name}
                </span>
                <div className="rounded-[18px] rounded-tl-none border-[3px] border-black bg-white px-4 py-3 text-[15px] font-bold leading-relaxed text-black shadow-[2px_2px_0_0_#000]">
                  {renderText(msg.text, msg.hasMention)}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div
            key={i}
            className="flex animate-[fadeInUp_0.4s_ease-out] items-start justify-end gap-3.5"
          >
            <div className="flex max-w-[560px] flex-col items-end">
              <span className="mb-1 mr-1 text-xs font-bold text-gray-600">
                あなた
              </span>
              <div className="rounded-[18px] rounded-tr-none border-[3px] border-black bg-[#57d071] px-4 py-3 text-[15px] font-bold leading-relaxed text-white shadow-[2px_2px_0_0_#000]">
                {msg.text}
              </div>
            </div>
            <Image
              src={CHARACTERS.player.iconPath}
              alt="あなた"
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
            />
          </div>
        );
      })}

      {typingSpeaker && (
        <div className="flex animate-pulse items-center gap-2.5 self-center rounded-full border-[3px] border-black bg-white px-5 py-2.5 shadow-[2px_2px_0_0_#000]">
          <Image
            src={typingSpeaker.iconPath}
            alt={typingSpeaker.name}
            width={26}
            height={26}
            className="h-[26px] w-[26px] rounded-full border-2 border-black object-cover"
          />
          <span className="text-[13px] font-bold text-black">
            {typingSpeaker.name} が入力中
          </span>
          <span className="inline-flex gap-1.5">
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
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
