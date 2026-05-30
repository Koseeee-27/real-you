'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HelpCircle, Volume2 } from 'lucide-react';
import { howToPlaySlides } from '@/features/top/components/HowToPlayModal';
import SlideModal from '@/components/common/SlideModal';
import { useSe } from '@/components/audio/useSe';
import SparklesExplosion from './SparklesExplosion';
import VolumeModal from './VolumeModal';

/**
 * トップ画面のインタラクティブ部分（スタート / あそびかた / おとボタン・爆発演出・
 * あそびかた / 音量モーダル）。クリック操作と状態を持つためここだけ Client Component。
 * 静的な背景・ロゴ・装飾は page.tsx（Server Component）側が描画する。
 */
export default function TopMenu() {
  const router = useRouter();
  const playSe = useSe();
  const [showExplosion, setShowExplosion] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

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
    playSe('buttonClick');
    setShowHowToPlay(true);
  };

  const openVolume = () => {
    playSe('buttonClick');
    setShowVolume(true);
  };

  return (
    <>
      <div className="relative flex flex-col items-center gap-4">
        {/* スタート（主役の rose pill） */}
        <button
          type="button"
          onClick={handleStartClick}
          className="w-[80vw] max-w-xs min-w-[200px] rounded-full border-4 border-gray-800 bg-gradient-to-br from-rose-400 to-rose-500 py-4 text-[28px] font-black text-white shadow-[0_7px_0_#1f2937] transition-transform hover:-translate-y-0.5 active:translate-y-[5px] active:shadow-[0_2px_0_#1f2937]"
        >
          スタート ▶
        </button>

        {/* あそびかた / おと（丸アイコン＋ラベル） */}
        <div className="flex gap-7">
          <button
            type="button"
            onClick={openHowToPlay}
            aria-label="あそびかた"
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-gray-800 bg-[#f1cf44] text-gray-900 shadow-[0_5px_0_#1f2937] transition-transform active:translate-y-[3px] active:shadow-[0_2px_0_#1f2937]">
              <HelpCircle size={28} strokeWidth={2.25} aria-hidden />
            </span>
            <span className="rounded-full border-2 border-gray-800 bg-[#fff8dc] px-3 py-0.5 text-[13px] font-extrabold tracking-wide text-gray-800">
              あそびかた
            </span>
          </button>

          <button
            type="button"
            onClick={openVolume}
            aria-label="おと"
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-gray-800 bg-[#FFD77B] text-gray-800 shadow-[0_5px_0_#1f2937] transition-transform active:translate-y-[3px] active:shadow-[0_2px_0_#1f2937]">
              <Volume2 size={28} strokeWidth={2.5} aria-hidden />
            </span>
            <span className="rounded-full border-2 border-gray-800 bg-white px-2.5 py-px text-[13px] font-black text-gray-900">
              おと
            </span>
          </button>
        </div>

        {showExplosion && <SparklesExplosion />}
      </div>

      <SlideModal
        open={showHowToPlay}
        onComplete={() => setShowHowToPlay(false)}
        completeLabel="完了！"
        ariaLabel="あそびかた 説明"
        classNames={{
          card: 'relative bg-white overflow-hidden [&>*]:relative [&>*]:z-10',
        }}
      >
        {howToPlaySlides}
      </SlideModal>

      <VolumeModal open={showVolume} onClose={() => setShowVolume(false)} />
    </>
  );
}
