'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

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
  const [showExplosion, setShowExplosion] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [howToPlayPage, setHowToPlayPage] = useState(1);

  // BGMを保持するための Ref
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // BGMの初期化と再生管理
  useEffect(() => {
    // パスは public/sounds/start-bgm.mp3 を想定
    const bgm = new Audio('/sounds/start-bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.4;
    bgmRef.current = bgm;

    const playBGM = () => {
      bgm.play().catch(() => {
        // 自動再生制限がかかった場合は何もしない
      });
      // 一度クリックされたらイベントリスナーを削除
      window.removeEventListener('click', playBGM);
    };

    window.addEventListener('click', playBGM);

    // クリーンアップ
    return () => {
      bgm.pause();
      window.removeEventListener('click', playBGM);
    };
  }, []);

  const handleStartClick = () => {
    setShowExplosion(true);

    // SEの再生（パスを修正）
    const audio = new Audio('/sounds/start-se.mp3');
    audio.play().catch(() => {});

    // ボタン押下時にBGMを停止
    if (bgmRef.current) {
      bgmRef.current.pause();
    }

    setTimeout(() => {
      router.push('/games/terms');
    }, 800);

    setTimeout(() => {
      setShowExplosion(false);
    }, 800);
  };

  const openHowToPlay = () => {
    setHowToPlayPage(1);
    setShowHowToPlay(true);
  };

  const closeHowToPlay = () => {
    setShowHowToPlay(false);
  };

  // あそびかたの内容
  const howToPlaySteps = [
    {
      title: 'Real Youとは？',
      subtitle: '3つのミニゲームで本当の性格を知ろう！！',
      bullets: [
        '3つのミニゲームを通して、本当の性格に迫る診断です。',
        'ひとつずつじっくり答えていきましょう。',
      ],
    },
    {
      title: '所要時間は約5分！',
      subtitle: 'スキマ時間でサクッと診断⭐︎',
      bullets: ['短時間で遊べるので、休憩時間や移動中にもおすすめです！'],
    },
    {
      title: '始める前に',
      subtitle: '注意事項をチェック⚠️',
      bullets: [
        'マイクを使用します🎤',
        'BGM・効果音が流れます🎵',
        'イヤホン推奨🎧',
      ],
    },
  ];

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
      <div className="flex flex-col items-center gap-[2vh] w-full">
        <Image
          src="/images/RealYouLogo.png"
          alt="Real You -本当の私じゃだめですか？-"
          width={800}
          height={500}
          className="max-h-[65vh] w-auto object-contain drop-shadow-2xl animate-[fadeInUp_0.5s_ease-out]"
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

          {showExplosion && <SparklesExplosion />}
        </div>

        {showHowToPlay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            onClick={closeHowToPlay}
          >
            {/* ポップアップ本体 */}
            <div
              className="relative w-full max-w-xl min-h-[460px] rounded-[24px] border-[6px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.35s_ease-out] flex flex-col mx-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeHowToPlay}
                className="absolute top-3 right-3 inline-flex rounded-full border border-zinc-900 px-3 py-1.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                ✕
              </button>

              {/* 進行状況バー */}
              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-zinc-700">
                  <span>
                    {howToPlayPage} / {howToPlaySteps.length}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-black transition-all duration-300"
                    style={{
                      width: `${(howToPlayPage / howToPlaySteps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* メインコンテンツ */}
              <div className="flex-1 flex flex-col justify-center">
                <h2
                  id="how-to-play-title"
                  className="mb-4 text-3xl font-bold leading-relaxed text-center"
                >
                  {howToPlaySteps[howToPlayPage - 1].title}
                </h2>

                <div className="mt-8">
                  <p className="mb-4 text-base font-semibold text-zinc-600 leading-relaxed">
                    {howToPlaySteps[howToPlayPage - 1].subtitle}
                  </p>

                  <ul className="min-h-[130px] space-y-3 text-base leading-relaxed text-[#111] list-disc pl-5">
                    {howToPlaySteps[howToPlayPage - 1].bullets.map(
                      (line, index) => (
                        <li key={index}>{line}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* ナビゲーションボタン */}
              <div className="mt-5 flex min-h-[64px] items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setHowToPlayPage((page) => Math.max(1, page - 1))
                  }
                  disabled={howToPlayPage === 1}
                  className="inline-flex rounded-full border border-zinc-900 px-8 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-100"
                >
                  前へ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (howToPlayPage < howToPlaySteps.length) {
                      setHowToPlayPage((page) => page + 1);
                    } else {
                      closeHowToPlay();
                    }
                  }}
                  className="inline-flex rounded-full bg-black px-8 py-3 text-base font-bold text-white transition hover:bg-zinc-900"
                >
                  {howToPlayPage < howToPlaySteps.length ? '次へ' : '完了'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
