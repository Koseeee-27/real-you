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
 * - `classNames.body` で min-h を上書きしてカード高さを確保する（SlideModal 既定の
 *   440/420/400 だとスライド 1 が見切れるため）。`cn()` の tailwind-merge により
 *   後勝ち上書きされる。極端に狭い画面では SlideModal の `overflow-y-auto` に
 *   よりスライド内で縦スクロールできる。
 * - 強制チュートリアル用途のため `onClose` は渡さない（× / 背景クリック / ESC 不可）。
 *
 * 内容詳細:
 *   - スライド 1/2: 概要 + カテゴリー早見表 + 遊び方（ゲーム名と 1 行説明で
 *     「何のゲームか」を伝え、3 カテゴリーの色対応を 1 行の早見表で見せ、D&D /
 *     クリック 2 ステップの 2 方式を「または」で対等に並べる。各操作枠の下部に
 *     それぞれの取消方法を併記）
 *   - スライド 2/2: ルール（「目標は {TARGET_SCORE} 点！」「制限時間は
 *     {TIME_CAP_SEC} 秒！！」を話口調で強調 + 採点は 1 行で軽く伝える）
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
        // 操作カードのサイズ圧縮と採点行のシンプル化に合わせて min-h を引き下げ、
        // スライド 2 の余白過多を抑えつつスライド 1 が収まるバランスにする。
        // 既定（440/420/400）よりやや高い水準で、両スライドのうち背の高い方
        // （=スライド 1）基準。PC（lg）では操作が横並びになり一段背が低くなる
        // ためさらに抑える。
        body: 'min-h-[540px] sm:min-h-[480px] lg:min-h-[420px]',
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
 * スライド 1/2: 概要 + カテゴリー早見表 + 遊び方（操作）。
 *
 * 上段でゲーム名と 1 行説明を見せて「何のゲームか」を伝え、中段で 3 カテゴリーの
 * 色対応（荷物 → 仕分け先）を**境界線なしの 1 行早見表**として示し、下段で
 * 2 操作方式（D&D / クリック 2 ステップ）を同じ大きさで左右対等に並べる。
 * **取消方法は対応する操作カードの下部に併記**し、「D&D は外で離す」「クリックは
 * 再クリック」がそれぞれの操作に紐づくことを直感的に伝える。
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
        3 カテゴリーの色対応（荷物 → 仕分け先）の早見表。
        個別カードに分けず、横一列に 3 マッピングをまとめて配置する（境界線なし）。
        各マッピングは「色付きラベル（上）+ 荷物画像 → 仕分け先画像（横並び）」の
        コンパクトな縦サイズで、下段の操作説明に高さを譲る。
      */}
      <div className="mt-4 flex items-center justify-center gap-5 sm:mt-5 sm:gap-7 lg:gap-10">
        {PACKAGE_TYPES.map((type) => (
          <div key={type} className="flex flex-col items-center gap-1.5">
            <span
              className="text-xs font-black tracking-wider sm:text-sm lg:text-base"
              style={{ color: PACKAGE_COLORS[type] }}
            >
              {PACKAGE_LABELS[type]}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                <Image
                  src={PACKAGE_IMAGE_PATHS[type]}
                  alt={`${PACKAGE_LABELS[type]}の荷物`}
                  fill
                  sizes="(min-width: 640px) 48px, 40px"
                  className="object-contain"
                />
              </div>
              <span aria-hidden className="text-base font-black sm:text-lg">
                →
              </span>
              <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                <Image
                  src={BIN_IMAGE_PATHS[type]}
                  alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                  fill
                  sizes="(min-width: 640px) 48px, 40px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 操作方法（どちらでもOK！）見出し */}
      <h3 className="mt-5 text-center text-base font-black tracking-widest sm:mt-6 sm:text-lg lg:text-xl">
        操作方法（どちらでもOK！）
      </h3>

      {/*
        2 方式カード + 「または」コネクタ。狭幅は縦積み、lg は横並び。
        各カードの下部にそれぞれの取消方法を併記する。
        画像サイズ・padding を控えめにして縦の高さを抑え、slide 全体を 1 画面に収める。
      */}
      <div className="mt-3 flex flex-col items-stretch gap-3 sm:mt-4 lg:flex-row lg:gap-4">
        {/* 方式 A: ドラッグ&ドロップ */}
        <div className="flex flex-1 basis-0 flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3">
          <div className="flex justify-center">
            <span
              className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              🖱 ドラッグ&ドロップ
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-2 sm:mt-2 sm:gap-3">
            <div className="relative h-9 w-9 shrink-0 sm:h-11 sm:w-11">
              <Image
                src={PACKAGE_IMAGE_PATHS.urgent}
                alt="荷物の例"
                fill
                sizes="(min-width: 640px) 44px, 36px"
                className="object-contain"
              />
            </div>
            <span aria-hidden className="text-lg font-black sm:text-xl">
              →
            </span>
            <div className="relative h-9 w-9 shrink-0 sm:h-11 sm:w-11">
              <Image
                src={BIN_IMAGE_PATHS.urgent}
                alt="仕分け先の例"
                fill
                sizes="(min-width: 640px) 44px, 36px"
                className="object-contain"
              />
            </div>
          </div>
          <p className="mt-1 text-center text-xs font-bold text-gray-600 sm:text-sm">
            荷物をつかんで仕分け先へ
          </p>
          {/* この操作方式に紐づく取消方法（D&D = 外で離す）。
              mt-auto でカード下部に押し下げ、2 カードで高さが揃っても位置が揃う。 */}
          <p className="mt-auto pt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
            ※ 仕分け先の外で離すと取り消し
          </p>
        </div>

        {/* 「または」コネクタ（装飾）。aria-hidden で読み上げ対象から除外する。 */}
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
        <div className="flex flex-1 basis-0 flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3">
          <div className="flex justify-center">
            <span
              className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
              style={{ backgroundColor: SORTER_UI_COLORS.link }}
            >
              クリック 2 ステップ
            </span>
          </div>
          <div className="mt-1.5 flex flex-col justify-center gap-1.5 text-xs font-bold sm:mt-2 sm:text-sm">
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
          <p className="mt-auto pt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
            ※ 再クリックで取り消し
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * スライド 2/2: ルール（クリア条件 + 採点）。
 *
 * 話口調で「目標は X 点！」「制限時間は Y 秒！！」をワクワク感のあるトーンで
 * 強調表示し、採点ルールは下段に 1 行で軽く伝える。サイズの強弱で目線を
 * 「クリア条件見出し → 目標 → 制限時間 → 採点」と誘導する。
 *
 * 採点は 2 枠カードに分けず、1 行で「正解で +N 点 ／ ミスで -N 点」と話口調で
 * 続ける。数字（+10 / -5）だけ色付き太字にして視認性を確保し、過剰な装飾箱を
 * 作らないことで「目標」を主役に据える。
 *
 * 最終スライドのため、フッターには SlideModal の「スタート ▶」が自動表示される。
 */
function SlideRules() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        クリア条件
      </h2>

      {/* 目標スコア（大）+ 制限時間（中）。話口調 + 「！」でワクワク感を出し、
          サイズの強弱で目線を誘導する。 */}
      <div className="mt-5 flex flex-col items-center gap-2 sm:mt-7 sm:gap-3">
        <p
          className="text-3xl font-black sm:text-4xl lg:text-5xl"
          style={{ color: SORTER_UI_COLORS.accent }}
        >
          目標は {TARGET_SCORE} 点！
        </p>
        <p className="text-xl font-black sm:text-2xl lg:text-3xl">
          制限時間は {TIME_CAP_SEC} 秒！！
        </p>
      </div>

      {/* 採点ルール（1 行・話口調・コンパクト）。
          数字（+10 / -5）だけ色付き太字にして視認性を確保。上の「目標」を
          主役にし、採点は補足として軽く伝える。 */}
      <p className="mt-6 text-center text-base font-bold sm:mt-8 sm:text-lg lg:text-xl">
        正解で
        <span
          className="mx-1 font-black"
          style={{ color: SORTER_UI_COLORS.successText }}
        >
          +{SCORE_CORRECT} 点
        </span>
        ／ ミスで
        <span
          className="mx-1 font-black"
          style={{ color: SORTER_UI_COLORS.dangerText }}
        >
          -{SCORE_WRONG_PENALTY} 点
        </span>
      </p>
    </div>
  );
}
