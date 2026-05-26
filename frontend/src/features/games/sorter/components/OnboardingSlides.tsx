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
 * - 既定の min-h（440/420/400）では内容が見切れる狭幅環境があるため、
 *   `classNames.body` で 560/520/480 に上書きしてカード高さを確保する
 *   （`cn()` の tailwind-merge により後勝ち上書きされる）。
 * - 強制チュートリアル用途のため `onClose` は渡さない（× / 背景クリック / ESC 不可）。
 *
 * 内容詳細:
 *   - スライド 1/2: 遊び方（D&D / クリック 2 ステップ の 2 方式を「または」で
 *     対等に並べ、**各操作枠の下部にそれぞれの取消方法を併記**することで
 *     「どの操作にどの取消が紐づくか」を明確化）
 *   - スライド 2/2: ルール（目標 {TARGET_SCORE} 点でクリア / 制限 {TIME_CAP_SEC}
 *     秒を大きく強調 + 3 カテゴリーの色対応（特急=赤 / 取扱注意=青 / 重量物=茶）+
 *     採点 +{SCORE_CORRECT} / -{SCORE_WRONG_PENALTY}）
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
        // 既定（440/420/400）だと SlideRules（目標 + カテゴリー 3 列 + 採点）が
        // 見切れる狭幅環境があるため、両スライドのうち背の高い方を基準に拡張。
        // PC（lg）では横並びになる箇所が多いため低めに抑える。
        body: 'min-h-[560px] sm:min-h-[520px] lg:min-h-[480px]',
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
 * スライド 1/2: 遊び方（操作）。
 *
 * 2 操作方式（D&D / クリック 2 ステップ）を同じ大きさで左右対等に並べ、間に
 * 「または」コネクタを挟むことで「どちらでも仕分けできる」ことを明示する。
 * **取消方法は対応する操作カードの下部に併記**し、「D&D は外で離す」「クリックは
 * 再クリック」がそれぞれの操作に紐づくことを直感的に伝える。
 *
 * レイアウト: 狭幅は flex-col（縦積み + 上下に「または」）、PC（lg）は flex-row
 * （横並び + 中央に「または」）に切り替える。2 カードは flex-1 + basis-0 で等幅。
 * 「または」は装飾（aria-hidden）、見出しの「どちらでもOK！」をテキストで読み上げ
 * に乗せて意味を担保する。
 */
function SlideHowToPlay() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        操作方法（どちらでもOK！）
      </h2>
      <p className="mt-2 text-center text-sm font-bold text-gray-600 sm:text-base">
        流れてくる荷物を仕分け先に投入！
      </p>

      {/*
        2 方式カード + 「または」コネクタ。狭幅は縦積み、lg は横並び。
        各カードの下部にそれぞれの取消方法を併記する。
      */}
      <div className="mt-4 flex flex-col items-stretch gap-3 sm:mt-5 lg:flex-row lg:gap-4">
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
          {/* この操作方式に紐づく取消方法（D&D = 外で離す）。
              mt-auto でカード下部に押し下げ、2 カードで高さを揃えても取消注記の位置が揃う。 */}
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
 * スライド 2/2: ルール（目標・カテゴリー・採点）。
 *
 * 上段で目標スコア（accent 色で強調）と制限時間を大きく示し、中段で 3 カテゴリーの
 * 色対応（荷物 → 仕分け先）を横並び 3 で見せ、下段で採点（+10 / -5）をコンパクトに
 * 横並びで置く。最終スライドのため、フッターには SlideModal の「スタート ▶」が
 * 自動表示される。
 *
 * 横並び 3（カテゴリー）は狭幅でも維持して 1 枚に収め、画像と文字サイズを狭幅では
 * 控えめにする。
 */
function SlideRules() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        ルール
      </h2>

      {/* 目標スコア・制限時間（大きく強調） */}
      <div className="mt-3 flex flex-col items-center sm:mt-4">
        <p
          className="text-2xl font-black sm:text-3xl lg:text-4xl"
          style={{ color: SORTER_UI_COLORS.accent }}
        >
          目標 {TARGET_SCORE} 点でクリア
        </p>
        <p className="mt-1 text-sm font-bold text-gray-600 sm:text-base">
          制限 {TIME_CAP_SEC} 秒
        </p>
      </div>

      {/* 3 カテゴリーの色対応（荷物 → 仕分け先） */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3 lg:gap-4">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="flex flex-col items-center gap-1 rounded-xl border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000] sm:gap-2 sm:p-3"
          >
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
              <Image
                src={PACKAGE_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の荷物`}
                fill
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 56px, 48px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-base font-black sm:text-xl">
              ↓
            </span>
            <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
              <Image
                src={BIN_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                fill
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 56px, 48px"
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

      {/* 採点（下段・コンパクト・横並び維持で縦の高さを抑える） */}
      <div className="mt-4 flex items-stretch justify-center gap-2 sm:mt-5 sm:gap-3">
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
    </div>
  );
}
