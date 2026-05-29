'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { howToPlaySlides } from '@/features/top/components/HowToPlayModal';
import SlideModal from '@/components/common/SlideModal';
import { useSe } from '@/components/audio/useSe';
import SparklesExplosion from './SparklesExplosion';

/**
 * トップ画面のインタラクティブ部分（スタート / あそびかたボタン・爆発演出・
 * あそびかたモーダル）。クリック操作と状態を持つためここだけ Client Component。
 * 静的な背景・ロゴ・装飾は page.tsx（Server Component）側が描画する。
 */
export default function TopMenu() {
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
    <>
      <div className="relative flex flex-col items-center">
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
          className="transition-all duration-100 ease-out hover:scale-110 active:scale-95 active:opacity-50"
        >
          <Image
            src="/images/asobikata_button.png"
            alt="あそびかた"
            width={120}
            height={120}
            className="w-[20vw] max-w-[180px] min-w-[90px] drop-shadow-md"
          />
        </button>

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
    </>
  );
}
