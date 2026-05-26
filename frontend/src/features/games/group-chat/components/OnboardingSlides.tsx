'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  INTRO_CHARACTERS,
  ONBOARDING_TITLE,
  RULES,
  SCENE_TEXT,
  SITUATION_TEXT,
} from '../data/turns';

interface OnboardingSlidesProps {
  /** 「START」押下時にゲームを開始する */
  onStart: () => void;
}

/**
 * セクション見出し付きの一区画。ラベル左に黒の縦バーを付けて
 * 「▍場面」のような見え方にする。
 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-black tracking-wide text-black sm:text-base">
        <span aria-hidden className="inline-block h-4 w-1 bg-black" />
        {label}
      </h3>
      <div className="pl-3 text-sm font-bold leading-relaxed text-gray-700 sm:text-base">
        {children}
      </div>
    </section>
  );
}

/**
 * 空気読みチャットゲームのオンボーディング（1スライド・4ブロック構造）。
 * 仕様書: `notion-docs/screen-design.md` の Game 3 新実装「オンボーディング画面の内容」。
 * 共通の `SlideModal`（強制チュートリアル = onClose 未指定）を 1 スライドで使用。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* タイトル */}
        <h2 className="text-center text-2xl font-black tracking-[0.08em] sm:text-3xl lg:text-4xl">
          {ONBOARDING_TITLE}
        </h2>

        <Section label="場面">{SCENE_TEXT}</Section>

        <Section label="状況">{SITUATION_TEXT}</Section>

        <Section label="ルール">
          <ul className="list-disc space-y-1 pl-5">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Section>

        <Section label="登場人物">
          <div className="flex flex-wrap items-start justify-center gap-5 sm:gap-8">
            {INTRO_CHARACTERS.map((c) => (
              <div
                key={c.characterId}
                className="flex flex-col items-center gap-1.5"
              >
                <Image
                  src={CHARACTERS[c.characterId].iconPath}
                  alt={c.role}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
                />
                <span className="text-sm font-black tracking-wide sm:text-base">
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </SlideModal>
  );
}
