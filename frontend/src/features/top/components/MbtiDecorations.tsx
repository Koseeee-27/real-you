import Image from 'next/image';
import type { CSSProperties } from 'react';

/** MBTI キャラ画像共通の白フチ（drop-shadow 4 方向）。 */
const WHITE_OUTLINE: CSSProperties = {
  filter: `
    drop-shadow(5px 0 0 white)
    drop-shadow(-5px 0 0 white)
    drop-shadow(0 5px 0 white)
    drop-shadow(0 -5px 0 white)
  `,
};

/** トップ画面の四隅に配置する MBTI キャラ装飾（位置・回転のみ個別）。 */
const MBTI_DECORATIONS = [
  { code: 'ESFP', className: 'top-5 right-20 w-60 rotate-[-15deg]' },
  { code: 'INTJ', className: 'bottom-8 right-50 w-65 rotate-[15deg]' },
  { code: 'INFP', className: 'top-5 left-20 w-60 rotate-[3deg]' },
  { code: 'ISFJ', className: 'bottom-8 left-50 w-65 rotate-[-10deg]' },
] as const;

/**
 * トップ画面の背景を彩る MBTI キャラ装飾画像。
 * 静的な装飾のみで状態を持たないため Server Component として描画する。
 *
 * 四隅への絶対配置が前提のため、ロゴ・ボタンと重なる狭い画面（lg 未満）では非表示にする。
 */
export default function MbtiDecorations() {
  return (
    <>
      {MBTI_DECORATIONS.map(({ code, className }) => (
        <Image
          key={code}
          src={`/images/mbti/${code}.png`}
          alt=""
          width={100}
          height={100}
          className={`absolute hidden pointer-events-none lg:block ${className}`}
          style={WHITE_OUTLINE}
        />
      ))}
    </>
  );
}
