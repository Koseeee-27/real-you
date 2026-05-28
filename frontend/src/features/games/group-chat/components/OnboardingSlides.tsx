'use client';

import Image from 'next/image';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  INTRO_CHARACTERS,
  ONBOARDING_INSTRUCTION,
  ONBOARDING_TITLE,
  PLAYER_INTRO_TEXT,
  SCENE_DESCRIPTION,
} from '../data/turns';

interface OnboardingSlidesProps {
  /** 「START」押下時にゲームを開始する */
  onStart: () => void;
}

/**
 * 空気読みチャットゲームのオンボーディング（1スライド）。
 * 仕様書: `notion-docs/screen-design.md` の Game 3 新実装「オンボーディング画面の内容」。
 * 共通の `SlideModal`（強制チュートリアル = onClose 未指定）を 1 スライドで使用。
 *
 * 構成（仕分けゲームのオンボーディングとデザインを揃える）:
 * 1. タイトル: 黒文字のシンプルな見出し（枠なし）
 * 2. 指示文: タイトル直下に 1 行（「空気を読んで返信しよう」）
 * 3. 状況説明: 黄色ベタ枠。プレイヤーの役割（PLAYER_INTRO_TEXT）+ シーンのナレーション
 * 4. 「登場人物」見出し（黄色ステッカー）+ キャラアイコン 4 人並べ（密に）
 *
 * モーダル body は flex-col + justify-center でコンテンツを縦中央寄せする。
 * 中身はスクロールが出ないよう、各要素を控えめなサイズ・余白に収める。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
      // body の高さ = この min-h。中身（タイトル + 指示文 + 黄色枠 + 登場人物）が
      // 収まる高さを確保しないと SlideModal 側でスライドが overflow-y-auto になり
      // スクロールが出る。SlideModal 既定（440/420/400）よりわずかに低い値にしつつ、
      // 下の gap・サイズ調整で中身をコンパクトにして余白に収める。
      classNames={{ body: 'min-h-[430px] sm:min-h-[400px] lg:min-h-[380px]' }}
    >
      <div className="flex h-full flex-col justify-center gap-2 sm:gap-3">
        {/* タイトル: 黒文字のシンプルな見出し（仕分けゲームと同様、枠なし） */}
        <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
          {ONBOARDING_TITLE}
        </h2>

        {/* 指示文: タイトル直下に 1 行 */}
        <p className="-mt-1 text-center text-sm font-bold sm:text-base lg:text-lg">
          {ONBOARDING_INSTRUCTION}
        </p>

        {/* 状況説明: 黄色ベタ枠。プレイヤーの役割 + シーンのナレーションを 1 段落で続ける */}
        <div className="rounded-lg border-2 border-black/20 bg-[#fff8dc] px-4 py-2 sm:px-5 sm:py-2.5">
          <p className="text-xs font-bold leading-snug text-black sm:text-sm">
            {PLAYER_INTRO_TEXT}。{SCENE_DESCRIPTION}
          </p>
        </div>

        {/* 登場人物セクション: 黄色ステッカー見出し + キャラアイコン（密に） */}
        <section>
          <div className="mb-2 text-center">
            <h3 className="inline-block rounded-lg border-[3px] border-black bg-[#f1cf44] px-4 py-1 text-sm font-black tracking-[0.08em] shadow-[2px_2px_0_0_#000] sm:text-base">
              登場人物
            </h3>
          </div>
          {/* gap で間隔を制御し、justify-center で中央密集にする */}
          <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2 sm:gap-x-10">
            {INTRO_CHARACTERS.map((c) => (
              <div
                key={c.characterId}
                className="flex flex-col items-center gap-1"
              >
                <Image
                  src={CHARACTERS[c.characterId].iconPath}
                  alt={c.role}
                  width={64}
                  height={64}
                  className="h-12 w-12 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000] sm:h-14 sm:w-14"
                />
                <span className="text-xs font-black tracking-wide sm:text-sm">
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SlideModal>
  );
}
