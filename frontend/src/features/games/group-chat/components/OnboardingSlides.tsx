'use client';

import Image from 'next/image';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  GAME_TAGLINE,
  INTRO_CHARACTERS,
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
 * 構成（参考: notion-docs に紐づくスナップショット）:
 * 1. タイトル: 黄色ステッカー風（タイトル + タグラインを 1 行併記、控えめサイズ）
 * 2. プレイヤー役割サブタイトル
 * 3. 状況説明: 黄色ベタの枠でシーンをナレーション
 * 4. 「登場人物」見出し（黄色ステッカー）+ 大きめキャラアイコン 4 人並べ（密に）
 *
 * モーダル body は flex-col + justify-center でコンテンツを縦中央寄せし、
 * SlideModal の min-h によって生じる上下の余白を均等化する。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
    >
      <div className="flex h-full flex-col justify-center gap-3 sm:gap-4">
        {/* タイトル: 黄色ステッカー風（タイトル + タグラインを 1 行併記、控えめサイズ） */}
        <div className="text-center">
          <h2 className="inline-flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 rounded-xl border-[3px] border-black bg-[#f1cf44] px-4 py-1 text-base font-black tracking-[0.06em] shadow-[3px_3px_0_0_#000] sm:text-lg lg:text-xl">
            <span>{ONBOARDING_TITLE}</span>
            <span className="text-xs font-bold text-black/70 sm:text-sm">
              / {GAME_TAGLINE}
            </span>
          </h2>
        </div>

        {/* プレイヤーの役割サブタイトル */}
        <p className="-mt-1 text-center text-xs font-bold text-gray-700 sm:text-sm">
          {PLAYER_INTRO_TEXT}
        </p>

        {/* 状況説明: 黄色ベタ枠でシーンをナレーション */}
        <div className="rounded-lg border-2 border-black/20 bg-[#fff8dc] px-4 py-2.5 sm:px-5 sm:py-3">
          <p className="text-xs font-bold leading-relaxed text-black sm:text-sm">
            {SCENE_DESCRIPTION}
          </p>
        </div>

        {/* 登場人物セクション: 黄色ステッカー見出し + キャラアイコン（密に） */}
        <section>
          <div className="mb-3 text-center">
            <h3 className="inline-block rounded-lg border-[3px] border-black bg-[#f1cf44] px-4 py-1 text-sm font-black tracking-[0.08em] shadow-[2px_2px_0_0_#000] sm:text-base">
              登場人物
            </h3>
          </div>
          {/* gap で間隔を制御し、justify-center で中央密集にする */}
          <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2 sm:gap-x-10">
            {INTRO_CHARACTERS.map((c) => (
              <div
                key={c.characterId}
                className="flex flex-col items-center gap-1.5"
              >
                <Image
                  src={CHARACTERS[c.characterId].iconPath}
                  alt={c.role}
                  width={64}
                  height={64}
                  className="h-14 w-14 rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000] sm:h-16 sm:w-16"
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
