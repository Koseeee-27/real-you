import Image from 'next/image';
import MbtiDecorations from '@/features/top/components/MbtiDecorations';
import TopMenu from '@/features/top/components/TopMenu';

/**
 * トップ画面。背景・ロゴ・MBTI 装飾などの静的要素を Server Component として描画し、
 * インタラクション（ボタン・モーダル・SE）は末端の TopMenu（Client）に委譲する。
 */
export default function TopPage() {
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
      <div className="relative flex flex-col items-center w-full">
        <Image
          src="/images/RealYouLogo.png"
          alt="Real You -本当の私じゃだめですか？-"
          width={800}
          height={500}
          className="max-h-[65vh] w-auto object-contain drop-shadow-2xl animate-[fadeInUp_0.5s_ease-out] pointer-events-none mt-[4vh]"
        />

        <MbtiDecorations />

        <TopMenu />
      </div>
    </div>
  );
}
