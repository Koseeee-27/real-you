'use client';

import type { JSX } from 'react';

export const howToPlaySlides: JSX.Element[] = [
  <div key="page1" className="flex flex-col items-center mt-0">
    <h2 className="mb-1 text-6xl font-bold leading-relaxed">Real Youとは？</h2>
    <p className="mb-2 text-base leading-relaxed">
      “本当のあなた”が分かる、新しい性格診断アプリ。
    </p>
    <div className="space-y-1 text-base font-bold leading-relaxed text-[#111]">
      <p>直感のままにプレイするだけ。</p>
      <p>あなたらしさが、自然とあらわれます。</p>
    </div>
  </div>,
  <div key="page2" className="flex flex-col items-center mt-4">
    <h2 className="mb-1 text-5xl font-bold leading-relaxed">プレイ時間は約5分！</h2>
    <p className="mb-5 text-base leading-relaxed">ゲームでサクッと、診断完了！</p>
    <div className="space-y-1 text-base leading-relaxed text-[#111] text-left text-gray-600">
      <p>※PCでのプレイをおすすめします</p>
      <p>※ゲーム中、BGMや効果音が流れます</p>
    </div>
  </div>,
  <div key="page3" className="flex flex-col items-center justify-center text-center">
    <h2 className="text-3xl font-bold leading-relaxed">さあ！”本当の自分”に会いに行こう！</h2>
  </div>,
];
