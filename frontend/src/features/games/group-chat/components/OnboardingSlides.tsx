'use client';

import Image from 'next/image';
import { ListChecks, MessagesSquare, Sparkles, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  HOW_TO_PLAY_STEPS,
  INTRO_CHARACTERS,
  ONBOARDING_INSTRUCTION,
  ONBOARDING_TITLE,
  PLAYER_INTRO_TEXT,
  SCENE_DESCRIPTION,
  type HowToPlayStepId,
} from '../data/turns';

/** 「遊び方」各手順の id → 表示アイコン（lucide-react）の対応表 */
const STEP_ICONS: Record<HowToPlayStepId, LucideIcon> = {
  turns: MessagesSquare,
  choose: ListChecks,
  timer: Timer,
  'no-answer': Sparkles,
};

/** セクション見出し（黄色ステッカー）。状況 / 遊び方 / 登場人物で共通利用する */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 inline-block rounded-lg border-[3px] border-black bg-[#f1cf44] px-3 py-0.5 text-xs font-black tracking-[0.08em] shadow-[2px_2px_0_0_#000] sm:text-sm">
      {children}
    </h3>
  );
}

interface OnboardingSlidesProps {
  /** 「START」押下時にゲームを開始する */
  onStart: () => void;
}

/**
 * 空気読みチャットゲームのオンボーディング（1スライド）。
 * 仕様書: `notion-docs/screen-design.md` の Game 3 新実装「オンボーディング画面の内容」。
 * 共通の `SlideModal`（強制チュートリアル = onClose 未指定）を 1 スライドで使用。
 *
 * 構成（情報を「状況 → 遊び方 → 登場人物」の3ブロックに整理）:
 * 1. タイトル + 指示文（中央寄せ）
 * 2. 上段 2 カラム（lg。狭幅では縦積み）
 *    - 状況: 黄色ベタ枠。プレイヤーの役割（PLAYER_INTRO_TEXT）+ シーンのナレーション
 *    - 遊び方: ゲームの実機構（全3ターン / 4択 / 制限時間 / 正解なし）をアイコン付きで
 * 3. 登場人物: キャラアイコン 4 人並べ（密に）
 *
 * セクション見出しは SectionHeading（黄色ステッカー）で統一し、ブロックの境界を明確にする。
 * 中身はスクロールが出ないよう、各要素を控えめなサイズ・余白に収める。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
      // body の高さ = この min-h。中身（タイトル + 状況/遊び方 + 登場人物）が収まる高さを
      // 確保しないと SlideModal 側でスライドが overflow-y-auto になりスクロールが出る。
      // 2 カラム化で縦を圧縮しているため、SlideModal 既定より低めの値で収める。
      classNames={{ body: 'min-h-[590px] sm:min-h-[510px] lg:min-h-[450px]' }}
    >
      <div className="flex h-full flex-col justify-center gap-3 sm:gap-4">
        {/* タイトル + 指示文（中央寄せ） */}
        <div>
          <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
            {ONBOARDING_TITLE}
          </h2>
          <p className="mt-1 text-center text-sm font-bold sm:text-base lg:text-lg">
            {ONBOARDING_INSTRUCTION}
          </p>
        </div>

        {/* 上段: 状況 / 遊び方 の 2 カラム（sm 以上）。狭幅では縦積み */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5">
          {/* 状況 */}
          <section>
            <SectionHeading>状況</SectionHeading>
            <div className="rounded-lg border-2 border-black/20 bg-[#fff8dc] px-4 py-2.5">
              <p className="text-xs font-bold leading-relaxed text-black sm:text-sm">
                {PLAYER_INTRO_TEXT}。{SCENE_DESCRIPTION}
              </p>
            </div>
          </section>

          {/* 遊び方: ゲームの実機構をアイコン付きの 2×2 で端的に伝える */}
          <section>
            <SectionHeading>遊び方</SectionHeading>
            <ol className="grid grid-cols-2 gap-2">
              {HOW_TO_PLAY_STEPS.map((step) => {
                const Icon = STEP_ICONS[step.id];
                return (
                  <li
                    key={step.id}
                    className="flex items-start gap-2 rounded-lg border-2 border-black/15 bg-white px-2.5 py-2"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-black bg-[#f1cf44] shadow-[1.5px_1.5px_0_0_#000]">
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black leading-tight sm:text-sm">
                        {step.title}
                      </span>
                      <span className="block text-[11px] font-medium leading-snug text-black/70 sm:text-xs">
                        {step.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* 登場人物セクション: キャラアイコン（密に） */}
        <section className="text-center">
          <SectionHeading>登場人物</SectionHeading>
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
