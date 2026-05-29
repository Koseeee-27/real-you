'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { howToPlaySlides } from '@/features/top/components/HowToPlayModal';
import SlideModal from '@/components/common/SlideModal';
import { useSe } from '@/components/audio/useSe';
import { VolumeControl } from '@/components/audio/VolumeControl';

// --- まる爆発アニメーションコンポーネント ---
const SparklesExplosion = () => {
  const count = 20;
  const colors = ['#e9eb7c', '#ee7ee6', '#6eb8ca', '#e17a78', '#91ec77'];

  const sparkles = Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index;
    const distance = 60 + index * 3;
    const style = {
      position: 'absolute',
      backgroundColor: colors[index % colors.length],
      width: `${6 + (index % 5) * 2}px`,
      height: `${6 + (index % 5) * 2}px`,
      borderRadius: '50%',
      top: '50%',
      left: '50%',
      '--angle': `${angle}deg`,
      '--distance': `${distance}px`,
      opacity: 0,
      animation: 'sparkle-burst 600ms ease-out forwards',
    } as CSSProperties;

    return { id: index, style };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      <style>{`
        @keyframes sparkle-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0px) scale(0);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance)) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance)) scale(0);
          }
        }
      `}</style>

      {sparkles.map((s) => (
        <div key={s.id} style={s.style} />
      ))}
    </div>
  );
};

// --- メインのトップページコンポーネント ---
export default function TopPage() {
  const router = useRouter();
  const playSe = useSe();
  const [showExplosion, setShowExplosion] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleStartClick = () => {
    setShowExplosion(true);

    playSe('start');

    setTimeout(() => {
      router.push('/games/terms');
    }, 800);

    setTimeout(() => {
      setShowExplosion(false);
    }, 800);
  };

  const openHowToPlay = () => {
    setShowHowToPlay(true);
  };

  const closeHowToPlay = () => {
    setShowHowToPlay(false);
  };

  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-top-pattern"
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(255,255,255,0.8) 1.0px, transparent 4px),
          url('/images/bg-pattern.svg')
        `,
        backgroundSize: '16px 16px, cover',
        backgroundPosition: '0 0, center',
        backgroundRepeat: 'repeat, no-repeat',
      }}
    >
      <div className="relative flex flex-col items-center gap-[2vh] w-full">
        <Image
          src="/images/RealYouLogo.png"
          alt="Real You -本当の私じゃだめですか？-"
          width={800}
          height={500}
          className="max-h-[65vh] w-auto object-contain drop-shadow-2xl animate-[fadeInUp_0.5s_ease-out] pointer-events-none"
        />

        {/** MBTIキャラの追加 */}
        <Image
          src="/images/mbti/ESFP.png"
          alt=""
          width={100}
          height={100}
          className="absolute top-10 right-20 w-60 rotate-[-15deg] pointer-events-none"
          style={{
            filter: `
            drop-shadow(5px 0 0 white)
            drop-shadow(-5px 0 0 white)
            drop-shadow(0 5px 0 white)
            drop-shadow(0 -5px 0 white)
            `,
          }}
        />

        <Image
          src="/images/mbti/INTJ.png"
          alt=""
          width={100}
          height={100}
          className="absolute bottom-10 right-45 w-65 rotate-[15deg] pointer-events-none"
          style={{
            filter: `
            drop-shadow(5px 0 0 white)
            drop-shadow(-5px 0 0 white)
            drop-shadow(0 5px 0 white)
            drop-shadow(0 -5px 0 white)
            `,
          }}
        />

        <Image
          src="/images/mbti/INFP.png"
          alt=""
          width={100}
          height={100}
          className="absolute top-8 left-20 w-60 rotate-[3deg] pointer-events-none"
          style={{
            filter: `
            drop-shadow(5px 0 0 white)
            drop-shadow(-5px 0 0 white)
            drop-shadow(0 5px 0 white)
            drop-shadow(0 -5px 0 white)
            `,
          }}
        />

        <Image
          src="/images/mbti/ISFJ.png"
          alt=""
          width={100}
          height={100}
          className="absolute bottom-10 left-45 w-65 rotate-[-10deg]"
          style={{
            filter: `
            drop-shadow(5px 0 0 white)
            drop-shadow(-5px 0 0 white)
            drop-shadow(0 5px 0 white)
            drop-shadow(0 -5px 0 white)
            `,
          }}
        />

        <div className="relative flex flex-col items-center gap-4">
          <button
            onClick={handleStartClick}
            className="transition-all duration-100 ease-out hover:scale-110 active:scale-95 active:opacity-50"
          >
            <Image
              src="/images/StartButton.png"
              alt="診断スタート"
              width={320}
              height={120}
              className="w-[40vw] max-w-xs min-w-[180px] drop-shadow-md"
            />
          </button>

          <button
            onClick={openHowToPlay}
            className="rounded-full border border-black bg-white/90 px-6 py-3 text-sm font-bold text-black shadow-md transition hover:bg-white active:scale-95"
          >
            あそびかた
          </button>

          {/* 音量設定（トップページのみ） */}
          <div className="mt-1 rounded-2xl border-[3px] border-gray-800 bg-white/90 px-5 py-3 shadow-[0_3px_0_#1f2937]">
            <p className="mb-2 text-center text-xs font-bold text-gray-700">
              音量設定
            </p>
            <VolumeControl />
          </div>

          {showExplosion && <SparklesExplosion />}
        </div>

        {/* SlideModal に children 配列を渡す（SlideModal が children 配列を受け取る実装の前提） */}
        <SlideModal
          open={showHowToPlay}
          onComplete={closeHowToPlay}
          completeLabel="完了！"
          ariaLabel="あそびかた 説明"
          classNames={{
            // 背景画像をカード内に収める（切れないように contain 指定、真ん中に）
            card: 'relative bg-white overflow-hidden [&>*]:relative [&>*]:z-10',
          }}
        >
          {howToPlaySlides}
        </SlideModal>
      </div>
    </div>
  );
}
