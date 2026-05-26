'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import SlideModal from '@/components/common/SlideModal';
import {
  CHARACTERS,
  INTRO_CHARACTERS,
  ONBOARDING_TITLE,
  RULES,
  SCENE_TEXT,
  SITUATION_TEXT,
} from '../data/turns';

interface OnboardingSlidesProps {
  /** 「START」押下時にゲームを開始する */
  onStart: () => void;
}

/** セクション見出しの色トークン（ゲームのブランドパレットから割り当て） */
const SECTION_COLORS = {
  scene: '#2d5be3', // 青（チャットヘッダー色）
  situation: '#e03131', // 赤（緊急感）
  rules: '#57d071', // 緑（START ボタンと同系・READY 感）
  characters: '#f1cf44', // 黄（ブランドカラー）
} as const;

/**
 * 見出し付きセクション。左端に色付きの縦バーを置く（「▍」のような見え方）。
 */
function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2.5 text-sm font-black tracking-wide text-black sm:text-base">
        <span
          aria-hidden
          className="inline-block h-5 w-1.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
        {label}
      </h3>
      <div className="pl-4 text-sm font-bold leading-relaxed text-gray-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

/**
 * 空気読みチャットゲームのオンボーディング（1スライド・4ブロック構造）。
 * 仕様書: `notion-docs/screen-design.md` の Game 3 新実装「オンボーディング画面の内容」。
 * 共通の `SlideModal`（強制チュートリアル = onClose 未指定）を 1 スライドで使用。
 *
 * レイアウト:
 * - 広い画面（lg）: 2 カラム（左 = 場面 / 状況 / ルール、右 = 登場人物）。
 *   ワイドな横スペースを活用し、縦高さを抑えてモーダル内に収める。
 * - 狭い画面: 縦並び 1 カラムにフォールバック。
 */
export default function OnboardingSlides({ onStart }: OnboardingSlidesProps) {
  return (
    <SlideModal
      open
      onComplete={onStart}
      completeLabel="START"
      ariaLabel="空気読みチャットゲーム 説明"
    >
      <div className="flex flex-col gap-5">
        {/* タイトル: 黄色の蛍光ペン風ハイライト */}
        <h2 className="text-center text-2xl font-black tracking-[0.08em] sm:text-3xl lg:text-4xl">
          <span
            className="inline-block px-2 pb-0.5"
            style={{
              backgroundImage: 'linear-gradient(transparent 55%, #f1cf44 55%)',
            }}
          >
            {ONBOARDING_TITLE}
          </span>
        </h2>

        <div className="grid gap-5 lg:grid-cols-[3fr_2fr] lg:gap-x-10">
          {/* 左カラム: 場面 / 状況 / ルール */}
          <div className="flex flex-col gap-4">
            <Section label="場面" color={SECTION_COLORS.scene}>
              {SCENE_TEXT}
            </Section>
            <Section label="状況" color={SECTION_COLORS.situation}>
              {SITUATION_TEXT}
            </Section>
            <Section label="ルール" color={SECTION_COLORS.rules}>
              <ul className="space-y-1.5">
                {RULES.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SECTION_COLORS.rules }}
                    />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* 右カラム: 登場人物（横並び 3 アイコン） */}
          <Section label="登場人物" color={SECTION_COLORS.characters}>
            <div className="flex items-start justify-around gap-3 pt-1">
              {INTRO_CHARACTERS.map((c) => (
                <div
                  key={c.characterId}
                  className="flex flex-col items-center gap-1.5"
                >
                  <Image
                    src={CHARACTERS[c.characterId].iconPath}
                    alt={c.role}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-full border-[3px] border-black bg-white object-cover shadow-[2px_2px_0_0_#000]"
                  />
                  <span className="text-sm font-black tracking-wide sm:text-base">
                    {c.role}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </SlideModal>
  );
}
