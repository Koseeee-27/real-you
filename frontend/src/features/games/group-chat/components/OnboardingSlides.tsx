'use client';

import Image from 'next/image';
import {
  CHARACTERS,
  INTRO_CHARACTERS,
  ONBOARDING_DESC,
  ONBOARDING_TITLE,
  SITUATION_TEXT,
} from '../data/turns';

interface OnboardingSlidesProps {
  /** 0 = スライド1 / 1 = スライド2 */
  slideIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onStart: () => void;
}

/** スライド上部の進捗ドット（●●） */
function Indicator({ active }: { active: number }) {
  return (
    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-2">
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full border-2 border-black ${
            i === active ? 'bg-black' : 'bg-white'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * オンボーディング2スライド（PC サイズ中央モーダル）。
 * スライド1: タイトル + 説明 + 次へ / スライド2: 登場人物3人 + シチュ + START。
 */
export default function OnboardingSlides({
  slideIndex,
  onPrev,
  onNext,
  onStart,
}: OnboardingSlidesProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      {slideIndex === 0 ? (
        <div className="relative w-full max-w-[720px] animate-[fadeInUp_0.4s_ease-out] rounded-[20px] border-[6px] border-black bg-white px-8 py-12 shadow-[8px_8px_0_0_#000]">
          <Indicator active={0} />
          <h2 className="mt-10 text-center text-3xl font-black tracking-[0.12em] sm:text-4xl">
            {ONBOARDING_TITLE}
          </h2>
          <p className="mb-12 mt-7 whitespace-pre-line text-center text-base font-bold leading-loose text-gray-700 sm:text-lg">
            {ONBOARDING_DESC}
          </p>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl border-[3px] border-black bg-[#57d071] px-9 py-3.5 text-base font-black tracking-[0.2em] text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#000]"
            >
              次へ ▶
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-[880px] animate-[fadeInUp_0.4s_ease-out] rounded-[20px] border-[6px] border-black bg-white px-8 py-10 shadow-[8px_8px_0_0_#000]">
          <Indicator active={1} />
          <div className="text-center">
            <span className="mb-6 mt-8 inline-block rounded-lg border-[3px] border-black bg-[#f1cf44] px-5 py-2 text-lg font-black tracking-[0.15em] shadow-[2px_2px_0_0_#000]">
              登場人物
            </span>
          </div>
          <div className="mb-7 flex flex-wrap justify-around gap-4">
            {INTRO_CHARACTERS.map((c) => (
              <div
                key={c.characterId}
                className="flex max-w-[240px] flex-col items-center gap-2.5"
              >
                <Image
                  src={CHARACTERS[c.characterId].iconPath}
                  alt={c.role}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
                />
                <span className="text-lg font-black tracking-wide">{c.role}</span>
                <p className="text-center text-[13px] font-bold leading-relaxed text-gray-600">
                  {c.personality}
                </p>
              </div>
            ))}
          </div>
          <p className="mb-6 rounded-xl border-[3px] border-black bg-[#fffceb] px-6 py-4 text-sm font-bold leading-loose shadow-[2px_2px_0_0_#000] sm:text-[15px]">
            {SITUATION_TEXT}
          </p>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onPrev}
              className="text-sm font-bold text-gray-500 transition-colors hover:text-black"
            >
              ◀ 戻る
            </button>
            <button
              type="button"
              onClick={onStart}
              className="animate-pulse rounded-xl border-[3px] border-black bg-[#57d071] px-14 py-3.5 text-lg font-black tracking-[0.25em] text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-1 hover:animate-none hover:shadow-[5px_5px_0_0_#000]"
            >
              START
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
