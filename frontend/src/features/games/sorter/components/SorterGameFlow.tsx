'use client';

import { useState } from 'react';
import { SORTER_AUDIO_PATHS, SORTER_UI_COLORS } from '../data/sorterConstants';
import OnboardingSlides from './OnboardingSlides';

/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）のオーケストレーター。
 *
 * **本 PR ではオンボーディング表示までを対象とする最小骨格版**。
 * ゲーム本編のロジック・ベルト/荷物表示・結果画面・送信は次の PR で実装予定。
 * 「スタート」押下後は実装予定プレースホルダーを表示する。
 */
export default function SorterGameFlow() {
  const [phase, setPhase] = useState<'onboarding' | 'pending'>('onboarding');
  const [slideIndex, setSlideIndex] = useState(0);

  function playSE() {
    const audio = new Audio(SORTER_AUDIO_PATHS.generalSE);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

  const onPrev = () => {
    playSE();
    setSlideIndex((i) => Math.max(0, i - 1));
  };
  const onNext = () => {
    playSE();
    setSlideIndex((i) => Math.min(3, i + 1));
  };
  const onStart = () => {
    playSE();
    setPhase('pending');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden py-4"
      style={{
        // ゲーム独自の緑背景（共通ユーティリティ `bg-page-pattern` の黄色とは意図的に別色）
        backgroundColor: SORTER_UI_COLORS.pageBg,
        backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
        backgroundSize: '20px 20px',
      }}
    >
      {phase === 'onboarding' && (
        <OnboardingSlides
          slideIndex={slideIndex}
          onPrev={onPrev}
          onNext={onNext}
          onStart={onStart}
        />
      )}

      {phase === 'pending' && (
        <div className="mx-auto max-w-md rounded-3xl border-[6px] border-black bg-white p-8 text-center shadow-[8px_8px_0_0_#000]">
          <p
            className="text-xl font-black tracking-widest"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            ゲーム本編は次の PR で実装予定です
          </p>
          <p className="mt-4 text-sm font-bold text-gray-600">
            （オンボーディング表示の動作確認用プレースホルダー）
          </p>
        </div>
      )}
    </div>
  );
}
