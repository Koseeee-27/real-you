'use client';

import Image from 'next/image';
import {
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  Timer,
} from 'lucide-react';
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

/**
 * 状況テキストの表示行（句読点込み）。
 * PLAYER_INTRO_TEXT + SCENE_DESCRIPTION を結合し、
 * 1) 文末（。/？/！）の直後、2)「上司が」の直前 で改行する。
 * lookbehind/lookahead 分割なので句読点はそのまま各行に残る。
 */
const SITUATION_LINES = `${PLAYER_INTRO_TEXT}。${SCENE_DESCRIPTION}`
  .split(/(?<=[。？！])/)
  .flatMap((sentence) => sentence.split(/(?=上司が)/))
  .map((line) => line.trim())
  .filter(Boolean);

// =========================================================
// 共通パーツ
// =========================================================

/** セクション見出し（黄色ステッカー）。状況 / 遊び方 / 登場人物で共通利用する */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 inline-block rounded-lg border-[3px] border-black bg-[#f1cf44] px-3 py-0.5 text-xs font-black tracking-[0.08em] shadow-[2px_2px_0_0_#000] sm:text-sm">
      {children}
    </h3>
  );
}

/** 目的（=やること）の強調表示: 緑の丸ピル（アイコン付き・中央寄せ） */
function GoalEmphasis() {
  return (
    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border-[3px] border-black bg-[#57d071] px-5 py-2 text-white shadow-[3px_3px_0_0_#000]">
      <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={2.5} />
      <span className="text-base font-black tracking-wide sm:text-lg lg:text-xl">
        {ONBOARDING_INSTRUCTION}
      </span>
    </div>
  );
}

/** 状況テキスト（文末・「上司が」前で改行） */
function SituationText() {
  return (
    <div className="rounded-lg border-2 border-black/20 bg-[#fff8dc] px-4 py-2.5">
      <p className="text-xs font-bold leading-relaxed text-black sm:text-sm">
        {SITUATION_LINES.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}

/** 登場人物の横並び（アイコン + 役割） */
function CharacterRow() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2 sm:gap-x-10">
      {INTRO_CHARACTERS.map((c) => (
        <div key={c.characterId} className="flex flex-col items-center gap-1">
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
  );
}

/** 遊び方の 1 手順カード（アイコン + タイトル + 補足） */
function StepCard({ step }: { step: (typeof HOW_TO_PLAY_STEPS)[number] }) {
  const Icon = STEP_ICONS[step.id];
  return (
    <li className="flex items-start gap-2 rounded-lg border-2 border-black/15 bg-white px-2.5 py-2">
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
 * 構成（ヒーロー型 + 2 カラム）:
 * 1. タイトル
 * 2. 目的「空気を読んで返信しよう！」を緑ピルで強調（=やることを一目で）
 * 3. 2 カラム（sm 以上。狭幅では縦積み）
 *    - 左: 状況（文末・「上司が」前で改行）+ 登場人物
 *    - 右: 遊び方（全3ターン / 4択 / 制限時間 / 正解なし）の縦リスト
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
      // body の高さ = この min-h。中身が収まる高さを確保しないと SlideModal 側で
      // スライドが overflow-y-auto になりスクロールが出る。
      classNames={{ body: 'min-h-[640px] sm:min-h-[630px] lg:min-h-[480px]' }}
    >
      <div className="flex h-full flex-col justify-center gap-3 sm:gap-4">
        {/* タイトル */}
        <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
          {ONBOARDING_TITLE}
        </h2>

        {/* 目的の強調（やること） */}
        <GoalEmphasis />

        {/* 2 カラム: 左=状況+登場人物 / 右=遊び方 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5">
          {/* 左: 状況 + 登場人物 */}
          <section className="flex flex-col gap-3">
            <div>
              <SectionHeading>状況</SectionHeading>
              <SituationText />
            </div>
            <div>
              <SectionHeading>登場人物</SectionHeading>
              <CharacterRow />
            </div>
          </section>

          {/* 右: 遊び方（縦リスト） */}
          <section>
            <SectionHeading>遊び方</SectionHeading>
            <ol className="flex flex-col gap-2">
              {HOW_TO_PLAY_STEPS.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </SlideModal>
  );
}
