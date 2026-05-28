'use client';

import type { JSX } from 'react';

export const howToPlaySlides: JSX.Element[] = [
  <div key="page1" className="flex flex-col items-center mt-0">
    <h2 className="mb-1 text-7xl font-bold leading-relaxed">Real Youとは？</h2>
    <div className="mb-2 text-2xl leading-relaxed relative">
      <span className="relative z-10"><span className="text-blue-500 font-extrabold  [-webkit-text-stroke:1px_#000] [-webkit-text-fill-color:#3b82f6]">"本当のあなた"</span>が分かる、新しい性格診断アプリ。</span>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-[555px] bg-blue-500 rounded-full opacity-30 [-z-10]" />
    </div>
    <div className="space-y-1 text-base font-bold leading-relaxed text-[#111] mt-5">
      <p>直感のままにプレイするだけ。</p>
      <p>あなたらしさが、自然とあらわれます。</p>
    </div>
  </div>,
  <div key="page2" className="flex flex-col items-center mt-4">
    <h2 className="mb-1 text-6xl font-bold leading-relaxed">
      プレイ時間は約<span className="text-blue-500 font-extrabold  [-webkit-text-stroke:2px_#000] [-webkit-text-fill-color:#3b82f6]">5</span>分！
      <div className="absolute right-[17.5%] top-1/3 -translate-x-1/2 -translate-y-1/4 h-15 w-[175px] bg-blue-500 rounded-full opacity-30 [-z-10]" />
    </h2>
    <p className="mb-5 text-2xl leading-relaxed">ゲームでサクッと、診断完了！</p>
    <div className="space-y-1 text-base leading-relaxed text-[#111] text-left text-gray-600">
      <p>※PCでのプレイをおすすめします</p>
      <p>※ゲーム中、BGMや効果音が流れます</p>
    </div>
  </div>,
  <div key="page3" className="flex flex-col items-center justify-center text-center">
    <h2 className="text-5xl font-bold leading-relaxed">さあ！<span className="text-yellow-500 font-extrabold [-webkit-text-stroke:2px_#000] [-webkit-text-fill-color:#f59e0b]">”本当の自分”</span>に会いに行こう！</h2>
    <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-15 w-[300px] bg-yellow-500 rounded-full opacity-30 [-z-10]" />
  </div>,
];
