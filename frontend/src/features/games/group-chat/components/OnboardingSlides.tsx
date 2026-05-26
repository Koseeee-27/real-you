'use client';

import Image from 'next/image';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  INTRO_CHARACTERS,
  ONBOARDING_TITLE,
  SITUATION_TEXT,
  TIMEOUT_OK_NOTE,
} from '../data/turns';

interface OnboardingSlidesProps {
  /** 「START」押下時にゲームを開始する */
  onStart: () => void;
}

/**
 * 空気読みチャットゲームのオンボーディング（1スライド）。
 * タイトル・状況説明・登場人物（名前のみ）を 1 枚にまとめ、START でゲーム開始する。
 * 共通の `SlideModal`（強制チュートリアル=onClose 未指定）を利用する。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
    >
      <div className="flex flex-col items-center gap-6 sm:gap-7">
        {/* タイトル */}
        <h2 className="text-center text-2xl font-black tracking-[0.08em] sm:text-3xl lg:text-4xl">
          {ONBOARDING_TITLE}
        </h2>

        {/* 状況説明 */}
        <p className="max-w-2xl text-center text-sm font-bold leading-loose text-gray-700 sm:text-base">
          {SITUATION_TEXT}
        </p>

        {/* 「無視も選択肢」の注記（タイムアウト=悪い印象を緩和する） */}
        <p className="text-xs font-bold text-gray-500 sm:text-sm">
          {TIMEOUT_OK_NOTE}
        </p>

        {/* 登場人物（アイコン + 名前のみ） */}
        <div className="mt-1 flex flex-wrap items-start justify-center gap-6 sm:gap-10">
          {INTRO_CHARACTERS.map((c) => (
            <div
              key={c.characterId}
              className="flex flex-col items-center gap-2"
            >
              <Image
                src={CHARACTERS[c.characterId].iconPath}
                alt={c.role}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
              />
              <span className="text-base font-black tracking-wide sm:text-lg">
                {c.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideModal>
  );
}
