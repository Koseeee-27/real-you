'use client';

import type { JSX } from 'react';
import Image from 'next/image';

export const howToPlaySlides: JSX.Element[] = [
  <div key="page1" className="flex flex-col items-center mt-0">
    <Image
      src="/images/fukidashi.png"
      alt=""
      width={1000}
      height={1000}
      className="pointer-events-none absolute inset-4 m-auto w-auto max-h-[90%] object-contain -z-10"
    />

    <Image
      src="/images/mbti/INFP.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-10 right-28 w-23"
    />
    <Image
      src="/images/mbti/ISFJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-1 right-60 w-23"
    />
    <Image
      src="/images/mbti/ESFP.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-2 left-63 w-23"
    />
    <Image
      src="/images/mbti/INTJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-12 left-25 w-23"
    />
    <Image
      src="/images/mbti/ENTP.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-20 right-20 w-23"
    />
    <Image
      src="/images/mbti/ISFP.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-5 right-50 w-23"
    />
    <Image
      src="/images/mbti/ESTJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-4 left-45 w-23"
    />
    <Image
      src="/images/mbti/ENFP.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-20 left-20 w-25"
    />

    <h2 className="mb-1 text-7xl font-bold leading-relaxed">Real Youとは？</h2>
    <div className="mb-2 text-2xl leading-relaxed relative">
      <span className="relative z-10">
        <span className="text-blue-500 font-extrabold  [-webkit-text-stroke:1px_#000] [-webkit-text-fill-color:#ff00ff]">
          「本当のあなた」
        </span>
        が分かる、新しい性格診断アプリ。
      </span>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-[555px] bg-yellow-500 rounded-full opacity-30 [-z-10]" />
    </div>
    <div className="space-y-1 text-base font-bold leading-relaxed text-[#111] mt-5">
      <p>直感のままにプレイするだけ。</p>
      <p>あなたらしさが、自然とあらわれます。</p>
    </div>
  </div>,

  <div key="page2" className="flex flex-col items-center mt-4">
    <Image
      src="/images/fukidashi.png"
      alt=""
      width={1000}
      height={1000}
      className="pointer-events-none absolute inset-4 m-auto w-auto max-h-[90%] object-contain -z-10"
    />

    <Image
      src="/images/heart.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-4 right-10 w-25 rotate-[25deg]"
    />
    <Image
      src="/images/light.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-1 left-5 w-30 rotate-[-25deg] "
    />
    <Image
      src="/images/PC.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-1 right-5 w-30"
    />
    <Image
      src="/images/tunes.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-4 left-4 w-28"
    />

    <h2 className="mb-1 text-6xl font-bold leading-relaxed">
      プレイ時間は約
      <span className="text-blue-500 font-extrabold  [-webkit-text-stroke:2px_#000] [-webkit-text-fill-color:#ff00ff]">
        5
      </span>
      分！
      <div className="absolute right-[17.5%] top-1/3 -translate-x-1/2 -translate-y-1/4 h-15 w-[175px] bg-yellow-500 rounded-full opacity-30 [-z-10]" />
    </h2>
    <p className="mb-5 text-2xl leading-relaxed">
      ゲームでサクッと、診断完了！
    </p>
    <div className="space-y-1 text-base leading-relaxed text-[#111] text-left text-gray-600">
      <p>※PCでのプレイをおすすめします</p>
      <p>※ゲーム中、BGMや効果音が流れます</p>
    </div>
  </div>,

  <div
    key="page3"
    className="flex flex-col items-center justify-center text-center"
  >
    <Image
      src="/images/fukidashi.png"
      alt=""
      width={1000}
      height={1000}
      className="pointer-events-none absolute inset-4 m-auto w-auto max-h-[90%] object-contain -z-10"
    />

    <Image
      src="/images/mbti/ISTP.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-10 right-20 w-25"
    />
    <Image
      src="/images/mbti/INFJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-1 right-80 w-25"
    />
    <Image
      src="/images/mbti/ESFJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-1 left-75 w-25"
    />
    <Image
      src="/images/mbti/INTP.png"
      alt=""
      width={92}
      height={92}
      className="absolute top-9 left-20 w-25"
    />
    <Image
      src="/images/mbti/ENTJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-10 right-20 w-25"
    />
    <Image
      src="/images/mbti/ISTJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-2 right-75 w-25"
    />
    <Image
      src="/images/mbti/ESTP.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-2 left-75 w-25"
    />
    <Image
      src="/images/mbti/ENFJ.png"
      alt=""
      width={92}
      height={92}
      className="absolute bottom-12 left-18 w-25"
    />

    <h2 className="text-5xl font-bold leading-relaxed">
      さあ！
      <span className="text-yellow-500 font-extrabold [-webkit-text-stroke:2px_#000] [-webkit-text-fill-color:#ff00ff]">
        「本当の自分」
      </span>
      に会いに行こう！
    </h2>
    <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-15 w-[300px] bg-yellow-500 rounded-full opacity-30 [-z-10]" />
  </div>,
];
