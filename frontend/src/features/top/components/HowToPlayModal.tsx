'use client';

import type { JSX } from 'react';

export const howToPlaySlides: JSX.Element[] = [
  <div key="page1" className="flex flex-col items-center mt-0">
    <img src="/images/mbti/INFP.png" alt="" className="absolute top-18 right-28 w-20" />
    <img src="/images/mbti/ISFJ.png" alt="" className="absolute top-4 right-70 w-20" />
    <img src="/images/mbti/ESFP.png" alt="" className="absolute top-3 left-65 w-20" />
    <img src="/images/mbti/INTJ.png" alt="" className="absolute top-12 left-32 w-20" />
    <img src="/images/mbti/ENTP.png" alt="" className="absolute bottom-20 right-30 w-20" />
    <img src="/images/mbti/ISFP.png" alt="" className="absolute bottom-5 right-52 w-20" />
    <img src="/images/mbti/ESTJ.png" alt="" className="absolute bottom-6 left-45 w-20" />
    <img src="/images/mbti/ENFP.png" alt="" className="absolute bottom-25 left-20 w-20" />

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
    <img src="/images/heart.png" alt="" className="absolute top-4 right-18 w-25" />
    <img src="/images/light.png" alt="" className="absolute top-2 left-10 w-30" />
    <img src="/images/PC.png" alt="" className="absolute bottom-1 right-10 w-30" />
    <img src="/images/tunes.png" alt="" className="absolute bottom-5 left-9 w-28" />

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
    <img src="/images/mbti/ISTP.png" alt="" className="absolute top-18 right-28 w-20" />
    <img src="/images/mbti/INFJ.png" alt="" className="absolute top-4 right-85 w-20" />
    <img src="/images/mbti/ESFJ.png" alt="" className="absolute top-3 left-85 w-20" />
    <img src="/images/mbti/INTP.png" alt="" className="absolute top-12 left-32 w-20" />
    <img src="/images/mbti/ENTJ.png" alt="" className="absolute bottom-20 right-30 w-20" />
    <img src="/images/mbti/ISTJ.png" alt="" className="absolute bottom-5 right-88 w-20" />
    <img src="/images/mbti/ESTP.png" alt="" className="absolute bottom-4 left-85 w-20" />
    <img src="/images/mbti/ENFJ.png" alt="" className="absolute bottom-18 left-20 w-20" />

    <h2 className="text-5xl font-bold leading-relaxed">さあ！<span className="text-yellow-500 font-extrabold [-webkit-text-stroke:2px_#000] [-webkit-text-fill-color:#f59e0b]">”本当の自分”</span>に会いに行こう！</h2>
    <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-15 w-[300px] bg-yellow-500 rounded-full opacity-30 [-z-10]" />
  </div>,
];
