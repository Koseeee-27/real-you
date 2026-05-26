'use client';

import Image from 'next/image';
import SlideModal from '@/components/common/SlideModal';
import {
  BIN_IMAGE_PATHS,
  PACKAGE_COLORS,
  PACKAGE_IMAGE_PATHS,
  PACKAGE_LABELS,
  PACKAGE_TYPES,
  SCORE_CORRECT,
  SCORE_WRONG_PENALTY,
  TARGET_SCORE,
  TIME_CAP_SEC,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';

interface OnboardingSlidesProps {
  /** モーダルの表示状態。phase==='onboarding' のときだけ true で渡す想定 */
  open: boolean;
  /** 最終スライドの「スタート ▶」を押したときに呼ばれる */
  onStart: () => void;
}

/**
 * 仕分けゲームの開始前オンボーディング（2 スライド）。
 *
 * 共通 `SlideModal` の薄いラッパー。枠（オーバーレイ / カード / 進捗ドット /
 * 戻る・次へ・スタート / 双方向アニメーション）は `SlideModal` 側に集約され、
 * 本コンポーネントはスライドの中身（`SlideHowToPlay` / `SlideRules`）を
 * 直下の子として並べるだけに留める。
 *
 * - 直下の子 1 つ = スライド 1 枚として扱われる仕様のため、Fragment で包まずに
 *   2 要素を並べる。
 * - 既定の min-h（440/420/400）ではスライド 1（タイトル + 1 行説明 + カテゴリー
 *   3 列 + 2 方式の操作カード + 取消注記）が見切れるため、`classNames.body` で
 *   640/580/500 に上書きしてカード高さを確保する。`cn()` の tailwind-merge により
 *   後勝ち上書きされる。極端に狭い画面では SlideModal の `overflow-y-auto` に
 *   よりスライド内で縦スクロールできる。
 * - 強制チュートリアル用途のため `onClose` は渡さない（× / 背景クリック / ESC 不可）。
 *
 * 内容詳細:
 *   - スライド 1/2: 概要 + 仕分けカテゴリー + 遊び方（ゲーム名と 1 行説明で
 *     「何のゲームか」を伝え、3 カテゴリーの色対応（特急=赤 / 取扱注意=青 /
 *     重量物=茶）を見せたうえで、D&D / クリック 2 ステップの 2 方式を「または」で
 *     対等に並べる。各操作枠の下部にそれぞれの取消方法を併記して
 *     「どの操作にどの取消が紐づくか」を明確化）
 *   - スライド 2/2: ルール（目標 {TARGET_SCORE} 点でクリア / 制限 {TIME_CAP_SEC}
 *     秒 + 採点 +{SCORE_CORRECT} / -{SCORE_WRONG_PENALTY}）
 */
export default function OnboardingSlides({
  open,
  onStart,
}: OnboardingSlidesProps) {
  return (
    <SlideModal
      open={open}
      onComplete={onStart}
      ariaLabel="仕分けゲームのチュートリアル"
      classNames={{
        // 既定（440/420/400）だとスライド 1（概要 + カテゴリー + 2 方式の操作）が
        // 見切れる狭幅環境があるため、両スライドのうち背の高い方（=スライド 1）を
        // 基準に拡張する。PC（lg）では操作が横並びになり背が低くなるため低めに抑える。
        body: 'min-h-[640px] sm:min-h-[580px] lg:min-h-[500px]',
      }}
    >
      <SlideHowToPlay />
      <SlideRules />
    </SlideModal>
  );
}

// =========================================================
// 各スライドの中身
// =========================================================

/**
 * スライド 1/2: 概要 + カテゴリー + 遊び方（操作）。
 *
 * 上段でゲーム名と 1 行説明を見せて「何のゲームか」を伝え、中段で 3 カテゴリーの
 * 色対応（荷物 → 仕分け先）をコンパクトに示し、下段で 2 操作方式（D&D / クリック
 * 2 ステップ）を同じ大きさで左右対等に並べる。**取消方法は対応する操作カードの
 * 下部に併記**し、「D&D は外で離す」「クリックは再クリック」がそれぞれの操作に
 * 紐づくことを直感的に伝える。
 *
 * 操作カードのレイアウト: 狭幅は flex-col（縦積み + 上下に「または」）、PC（lg）は
 * flex-row（横並び + 中央に「または」）に切り替える。2 カードは flex-1 + basis-0
 * で等幅。「または」は装飾（aria-hidden）、見出しの「どちらでもOK！」をテキストで
 * 読み上げに乗せて意味を担保する。
 */
function SlideHowToPlay() {
  return (
    <div>
      {/* 概要: ゲーム名 + 1 行説明 */}
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-widest sm:text-3xl lg:text-4xl">
          仕分けゲーム
        </h2>
        <p className="mt-2 text-sm font-bold sm:text-base lg:text-lg">
          流れてくる荷物を適切に仕分けよう！
        </p>
      </div>

      {/*
        3 カテゴリーの色対応（荷物 → 仕分け先）。
        スライド 1 内では「これから仕分ける対象の早見表」として控えめなサイズで配置し、
        下段の操作説明に高さを譲る。横並び 3 は狭幅でも維持して 1 行で全カテゴリーを
        一望できるようにする。
      */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3 lg:gap-4">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="flex flex-col items-center gap-1 rounded-xl border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]"
          >
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
              <Image
                src={PACKAGE_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の荷物`}
                fill
                sizes="(min-width: 1024px) 56px, (min-width: 640px) 48px, 40px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-sm font-black sm:text-base">
              ↓
            </span>
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12 lg:h-14 lg:w-14">
              <Image
                src={BIN_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                fill
                sizes="(min-width: 1024px) 56px, (min-width: 640px) 48px, 40px"
                className="object-contain"
              />
            </div>
            <span
              className="text-xs font-black tracking-wider sm:text-sm lg:text-base"
              style={{ color: PACKAGE_COLORS[type] }}
            >
              {PACKAGE_LABELS[type]}
            </span>
          </div>
        ))}
      </div>

      {/* 操作方法（どちらでもOK！）見出し */}
      <h3 className="mt-4 text-center text-base font-black tracking-widest sm:mt-5 sm:text-lg lg:text-xl">
        操作方法（どちらでもOK！）
      </h3>

      {/*
        2 方式カード + 「または」コネクタ。狭幅は縦積み、lg は横並び。
        各カードの下部にそれぞれの取消方法を併記する。
      */}
      <div className="mt-3 flex flex-col items-stretch gap-3 sm:mt-4 lg:flex-row lg:gap-4">
        {/* 方式 A: ドラッグ&ドロップ */}
        <div className="flex flex-1 basis-0 flex-col rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
          <div className="flex justify-center">
            <span
              className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              🖱 ドラッグ&ドロップ
            </span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
              <Image
                src={PACKAGE_IMAGE_PATHS.urgent}
                alt="荷物の例"
                fill
                sizes="(min-width: 640px) 48px, 40px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-lg font-black sm:text-xl">
              →
            </span>
            <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
              <Image
                src={BIN_IMAGE_PATHS.urgent}
                alt="仕分け先の例"
                fill
                sizes="(min-width: 640px) 48px, 40px"
                className="object-contain"
              />
            </div>
          </div>
          <p className="mt-1 text-center text-xs font-bold text-gray-600 sm:text-sm">
            荷物をつかんで仕分け先へ
          </p>
          {/* この操作方式に紐づく取消方法（D&D = 外で離す）。
              mt-auto でカード下部に押し下げ、2 カードで高さが揃っても位置が揃う。 */}
          <p className="mt-auto pt-2 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
            ※ 仕分け先の外で離すと取り消し
          </p>
        </div>

        {/*
          「または」コネクタ（装飾）。aria-hidden で読み上げ対象から除外する。
          狭幅は上下カードの間（横置き）、lg は左右カードの中央に挟む。
        */}
        <div
          aria-hidden
          className="flex shrink-0 items-center justify-center self-center"
        >
          <span
            className="rounded-full border-[3px] border-black px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_#000] sm:text-sm"
            style={{ backgroundColor: SORTER_UI_COLORS.warning }}
          >
            または
          </span>
        </div>

        {/* 方式 B: クリック 2 ステップ */}
        <div className="flex flex-1 basis-0 flex-col rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
          <div className="flex justify-center">
            <span
              className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
              style={{ backgroundColor: SORTER_UI_COLORS.link }}
            >
              クリック 2 ステップ
            </span>
          </div>
          <div className="mt-2 flex flex-col justify-center gap-1.5 text-xs font-bold sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-xs"
                style={{ backgroundColor: SORTER_UI_COLORS.success }}
              >
                1
              </span>
              荷物をクリックして選択
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-xs text-white"
                style={{ backgroundColor: SORTER_UI_COLORS.link }}
              >
                2
              </span>
              仕分け先をクリック
            </span>
          </div>
          {/* この操作方式に紐づく取消方法（クリック = 再クリック）。 */}
          <p className="mt-auto pt-2 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
            ※ 再クリックで取り消し
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * スライド 2/2: ルール（目標・採点）。
 *
 * 目標スコア（accent 色で強調）と制限時間を大きく示し、採点（+10 / -5）を
 * 下段にコンパクトに横並びで置く。カテゴリー（色対応）はスライド 1 に集約済み
 * のため本スライドでは扱わない。最終スライドのため、フッターには SlideModal の
 * 「スタート ▶」が自動表示される。
 */
function SlideRules() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        ルール
      </h2>

      {/* 目標スコア・制限時間（大きく強調） */}
      <div className="mt-4 flex flex-col items-center sm:mt-6">
        <p
          className="text-2xl font-black sm:text-3xl lg:text-4xl"
          style={{ color: SORTER_UI_COLORS.accent }}
        >
          目標 {TARGET_SCORE} 点でクリア
        </p>
        <p className="mt-2 text-sm font-bold text-gray-600 sm:text-base">
          制限 {TIME_CAP_SEC} 秒
        </p>
      </div>

      {/* 採点（下段・コンパクト・横並び維持で縦の高さを抑える） */}
      <div className="mt-6 flex items-stretch justify-center gap-2 sm:mt-8 sm:gap-3">
        <div
          className="flex flex-1 basis-0 items-center justify-center gap-2 rounded-xl border-[3px] border-black p-3 sm:p-4"
          style={{ backgroundColor: SORTER_UI_COLORS.successBgSubtle }}
        >
          <span
            className="shrink-0 text-2xl font-black sm:text-3xl"
            style={{ color: SORTER_UI_COLORS.successText }}
          >
            +{SCORE_CORRECT}
          </span>
          <span className="text-xs font-bold sm:text-sm">正しい仕分け先</span>
        </div>
        <div
          className="flex flex-1 basis-0 items-center justify-center gap-2 rounded-xl border-[3px] border-black p-3 sm:p-4"
          style={{ backgroundColor: SORTER_UI_COLORS.dangerBgSubtle }}
        >
          <span
            className="shrink-0 text-2xl font-black sm:text-3xl"
            style={{ color: SORTER_UI_COLORS.dangerText }}
          >
            -{SCORE_WRONG_PENALTY}
          </span>
          <span className="text-xs font-bold sm:text-sm">誤った仕分け先</span>
        </div>
      </div>
    </div>
  );
}
