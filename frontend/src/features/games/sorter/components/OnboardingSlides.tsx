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
 * 本コンポーネントはスライドの中身（`SlideOverview` / `SlideControlsAndScoring`）
 * を直下の子として並べるだけに留める。
 *
 * - 直下の子 1 つ = スライド 1 枚として扱われる仕様のため、Fragment で包まずに
 *   2 要素を並べる。
 * - 既定の min-h（440/420/400）では SlideOverview の縦並び（タイトル + サブ 2 行 +
 *   カテゴリーカード 3 列）が見切れる狭幅環境があるため、`classNames.body` で
 *   560/520/480 に上書きしてカード高さを確保する（`cn()` の tailwind-merge により
 *   後勝ち上書きされる）。
 * - 強制チュートリアル用途のため `onClose` は渡さない（× / 背景クリック / ESC 不可）。
 *
 * 内容詳細:
 *   - スライド 1/2: 概要 + カテゴリー（流れてくる荷物を同じ色の仕分け先へ。目標
 *     {TARGET_SCORE} 点でクリア / 制限 {TIME_CAP_SEC} 秒。特急=赤 / 取扱注意=青 /
 *     重量物=茶 の色対応を横並び 3 で表示）
 *   - スライド 2/2: 操作方法（どちらでもOK！）+ 採点（D&D / クリック 2 ステップ の
 *     2 方式を「または」で対等に並べ、+{SCORE_CORRECT} / -{SCORE_WRONG_PENALTY} の
 *     採点を下段に置く）
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
        // 既定（440/420/400）だと SlideOverview が見切れるため、現行値に合わせて拡張する。
        // SlideOverview（タイトル + サブ 2 行 + カテゴリーカード 3 列）と
        // SlideControlsAndScoring（2 方式カード縦積み + 採点）のうち背の高い方を
        // 基準に、PC（lg）では横並びになるため低めに抑える。
        body: 'min-h-[560px] sm:min-h-[520px] lg:min-h-[480px]',
      }}
    >
      <SlideOverview />
      <SlideControlsAndScoring />
    </SlideModal>
  );
}

// =========================================================
// 各スライドの中身
// =========================================================

/**
 * スライド 1/2: 概要 + カテゴリー。
 *
 * 上段でゲームの目的・目標スコア・制限時間をコンパクトに伝え、
 * 下段で 3 カテゴリーの色対応（荷物 → 仕分け先）を横並び 3 で示す。
 * カラーペアリング（旧 SlideColorPairing）を概要に統合して 1 枚に圧縮した。
 *
 * 横並び 3 は狭幅でも維持する（縦積みにすると 1 枚に収まらないため）。
 * 画像サイズと文字サイズを狭幅では控えめにして 1 枚に収める。
 */
function SlideOverview() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-black tracking-widest sm:text-3xl lg:text-4xl">
        仕分けゲーム
      </h2>
      <p className="mt-3 text-sm font-bold leading-relaxed sm:mt-4 sm:text-base lg:text-lg">
        流れてくる荷物を同じ色の仕分け先へ。
        <br />
        <span style={{ color: SORTER_UI_COLORS.accent }}>
          目標 {TARGET_SCORE} 点
        </span>
        でクリア（制限 {TIME_CAP_SEC} 秒）
      </p>

      {/*
        3 カテゴリーの色対応（荷物 → 仕分け先）。
        概要スライドに統合したため横並び 3 固定で、全幅でカテゴリーを一望できるようにする。
        各カードは「荷物画像 → 矢印 → 仕分け先画像」の縦並び（ラベルを下に添える）。
      */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3 lg:gap-4">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="flex flex-col items-center gap-1 rounded-xl border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000] sm:gap-2 sm:p-3"
          >
            <div className="relative h-12 w-12 shrink-0 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
              <Image
                src={PACKAGE_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の荷物`}
                fill
                sizes="(min-width: 1024px) 80px, (min-width: 640px) 64px, 48px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-lg font-black sm:text-2xl">
              ↓
            </span>
            <div className="relative h-12 w-12 shrink-0 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
              <Image
                src={BIN_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                fill
                sizes="(min-width: 1024px) 80px, (min-width: 640px) 64px, 48px"
                className="object-contain"
              />
            </div>
            <span
              className="text-sm font-black tracking-wider sm:text-base lg:text-lg"
              style={{ color: PACKAGE_COLORS[type] }}
            >
              {PACKAGE_LABELS[type]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * スライド 2/2: 操作方法（どちらでもOK！）+ 採点。
 *
 * 「ドラッグ&ドロップ」「クリック 2 ステップ」のどちらでも仕分けできることを
 * 明確に伝えるため、2 方式カードを同じ大きさで左右に対等配置し、間に「または」
 * コネクタを挟む（PC は左右の中央、狭幅は上下カードの間）。採点（+10 / -5）は
 * 下段にコンパクトに横並びで置く。最終スライドのため、フッターには「スタート」
 * ボタンが表示される。
 *
 * レイアウトは flex で、狭幅は flex-col（縦積み + 上下に「または」）、
 * PC（lg）は flex-row（横並び + 中央に「または」）に切り替える。2 カードは
 * flex-1 + basis-0 で等幅にし「どちらでも良い」感を出す。
 * 「または」は装飾なので aria-hidden、見出しの「どちらでもOK！」をテキストで
 * 読み上げに乗せて意味を担保する。
 */
function SlideControlsAndScoring() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        操作方法（どちらでもOK！）
      </h2>

      {/*
        2 方式カード + 「または」コネクタ。
        狭幅: 縦積み（カード → または → カード）。lg: 横並び（カード｜または｜カード）。
        items-stretch で 2 カードの高さを揃え、対等に見せる。
      */}
      <div className="mt-4 flex flex-col items-stretch gap-3 sm:mt-5 lg:flex-row lg:items-stretch lg:gap-4">
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
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <Image
                src={PACKAGE_IMAGE_PATHS.urgent}
                alt="荷物の例"
                fill
                sizes="(min-width: 640px) 56px, 48px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-xl font-black sm:text-2xl">
              →
            </span>
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <Image
                src={BIN_IMAGE_PATHS.urgent}
                alt="仕分け先の例"
                fill
                sizes="(min-width: 640px) 56px, 48px"
                className="object-contain"
              />
            </div>
          </div>
          <p className="mt-1 text-center text-xs font-bold text-gray-600 sm:text-sm">
            荷物をつかんで仕分け先へ
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
        </div>
      </div>

      {/*
        採点（下段・コンパクト）。+10 / -5 を横並びにし、注意書きを小さく添える。
        狭幅でも横並びを維持して縦の高さを抑える（枠内に収めるため）。
      */}
      <div className="mt-4 flex flex-col items-center gap-2 sm:mt-5">
        <div className="flex w-full items-stretch justify-center gap-2 sm:gap-3">
          <div
            className="flex flex-1 basis-0 items-center justify-center gap-2 rounded-xl border-[3px] border-black p-2 sm:p-3"
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
            className="flex flex-1 basis-0 items-center justify-center gap-2 rounded-xl border-[3px] border-black p-2 sm:p-3"
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
        <p className="text-center text-xs font-bold text-gray-500">
          ※ 仕分け先の外で離す / 再クリックで取り消し
        </p>
      </div>
    </div>
  );
}
