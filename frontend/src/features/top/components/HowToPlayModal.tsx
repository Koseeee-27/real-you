'use client';

import type { JSX, ReactNode } from 'react';
import Image from 'next/image';

/** 背景なしで文字サイズだけ大きくして強調 */
function EmphasisText({
  children,
  size = 'md',
}: {
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg'
      ? 'text-[1.45em] sm:text-[1.55em]'
      : 'text-[1.3em] sm:text-[1.35em]';
  return (
    <span className={`font-black text-rose-500 ${sizeClass}`}>{children}</span>
  );
}

/** 数字など単体の強調 */
function AccentText({ children }: { children: ReactNode }) {
  return <span className="text-[1.15em] font-black text-rose-500">{children}</span>;
}

export const howToPlaySlides: JSX.Element[] = [
  <div key="page1" className="mt-0 flex flex-col items-center">
    <Image
      src="/images/fukidashi.png"
      alt=""
      width={1000}
      height={1000}
      className="pointer-events-none absolute inset-4 -z-10 m-auto max-h-[90%] w-auto object-contain"
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

    <h2 className="mb-1 text-5xl font-black tracking-wide text-gray-900 sm:text-6xl">
      Real Youとは？
    </h2>
    <p className="mb-2 text-center text-xl font-bold leading-relaxed text-gray-800 sm:text-2xl">
      <EmphasisText>「本当のあなた」</EmphasisText>
      が分かる、新しい性格診断アプリ。
    </p>
    <div className="mt-5 space-y-1 text-base font-bold leading-relaxed text-gray-800">
      <p>直感のままにプレイするだけ。</p>
      <p>あなたらしさが、自然とあらわれます。</p>
    </div>
  </div>,

  <div key="page2" className="mt-4 flex flex-col items-center">
    <Image
      src="/images/fukidashi.png"
      alt=""
      width={1000}
      height={1000}
      className="pointer-events-none absolute inset-4 -z-10 m-auto max-h-[90%] w-auto object-contain"
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
      className="absolute top-1 left-5 w-30 rotate-[-25deg]"
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

    <h2 className="mb-1 text-4xl font-black tracking-wide text-gray-900 sm:text-5xl">
      プレイ時間は約
      <AccentText>5</AccentText>
      分！
    </h2>
    <p className="mb-5 text-xl font-bold leading-relaxed text-gray-800 sm:text-2xl">
      ゲームでサクッと、診断完了！
    </p>
    <div className="space-y-1 text-left text-base font-bold leading-relaxed text-gray-800">
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
      className="pointer-events-none absolute inset-4 -z-10 m-auto max-h-[90%] w-auto object-contain"
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

    <h2 className="text-3xl font-black leading-relaxed tracking-wide text-gray-900 sm:text-4xl">
      さあ！
      <EmphasisText size="lg">「本当の自分」</EmphasisText>
      に会いに行こう！
    </h2>
  </div>,
];
