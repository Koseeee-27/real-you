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
 * - `classNames.body` で min-h を上書きしてカード高さを確保する。`cn()` の
 *   tailwind-merge により後勝ち上書きされる。極端に狭い画面では SlideModal の
 *   `overflow-y-auto` によりスライド内で縦スクロールできる。
 * - 強制チュートリアル用途のため `onClose` は渡さない（× / 背景クリック / ESC 不可）。
 *
 * 内容詳細:
 *   - スライド 1/2: 概要 + 2 カラム（左: 仕分け方 / 右: 操作方法）。上段に
 *     ゲーム名と 1 行説明を置き、下段を 2 カラムで「色対応の早見表」と
 *     「D&D / クリック 2 ステップの 2 方式」を並べて 1 画面に収める。
 *     PC（sm 以上）で 2 カラム、狭幅では縦積み。
 *   - スライド 2/2: ルール（「目標は {TARGET_SCORE} 点！」「制限時間は
 *     {TIME_CAP_SEC} 秒！！」を話口調で強調 + 採点 1 行）
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
        // スライド 1 を 2 カラムにしたことで PC（sm 以上）の縦サイズが大きく圧縮
        // されたため、min-h を SlideModal 既定（440/420/400）に近い水準に戻す。
        // スライド 2（クリア条件 + 採点 1 行）の余白過多も同時に抑えるバランス。
        body: 'min-h-[520px] sm:min-h-[440px] lg:min-h-[420px]',
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
 * スライド 1/2: 概要 + 2 カラム（左: 仕分け方 / 右: 操作方法）。
 *
 * 上段にゲーム名と 1 行説明を置き、下段を 2 カラム構成にして PC で 1 画面に
 * 収める。**左カラム**は 3 カテゴリーの色対応（荷物 → 仕分け先）を 1 枚の白
 * カード内に 3 行で並べた早見表、**右カラム**は D&D / クリック 2 ステップの
 * 2 方式カードを縦に積み「または」コネクタで接続。各操作カードの下部には
 * それぞれの取消方法を併記する（D&D は外で離す、クリックは再クリック）。
 *
 * レイアウト: 狭幅（base）は縦積み（概要 → 左 → 右）、PC（sm 以上）は 2 カラム
 * （概要 → 左|右）。左右の幅比は 2:3 にして、操作カードに十分な横幅を確保する。
 */
function SlideHowToPlay() {
  return (
    <div>
      {/* 上段: ゲーム名 + 1 行説明 */}
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-widest sm:text-3xl lg:text-4xl">
          仕分けゲーム
        </h2>
        <p className="mt-2 text-sm font-bold sm:text-base lg:text-lg">
          流れてくる荷物を適切に仕分けよう！
        </p>
      </div>

      {/* 下段: 2 カラム（左: 仕分け方 / 右: 操作方法）。狭幅は縦積み、sm 以上で左右並び。 */}
      <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:gap-5 lg:gap-6">
        {/* === 左カラム: 仕分け方（カテゴリー早見表） === */}
        <section className="sm:basis-2/5">
          <h3 className="text-center text-base font-black tracking-widest sm:text-lg lg:text-xl">
            仕分け方
          </h3>
          {/*
            1 枚の白カード内に 3 カテゴリーの「荷物 → 仕分け先」を 3 行並べる。
            行ごとに色付きラベル（固定幅）+ 荷物画像 → 仕分け先画像。
            個別境界なしで「3 つで 1 つの早見表」というまとまり感を出す。
          */}
          <div className="mt-3 flex flex-col gap-2 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            {PACKAGE_TYPES.map((type) => (
              <div
                key={type}
                className="flex items-center justify-between gap-2"
              >
                <span
                  className="w-16 text-center text-sm font-black tracking-wider sm:w-20 sm:text-base"
                  style={{ color: PACKAGE_COLORS[type] }}
                >
                  {PACKAGE_LABELS[type]}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11">
                    <Image
                      src={PACKAGE_IMAGE_PATHS[type]}
                      alt={`${PACKAGE_LABELS[type]}の荷物`}
                      fill
                      sizes="(min-width: 1024px) 44px, 40px"
                      className="object-contain"
                    />
                  </div>
                  <span aria-hidden className="text-base font-black sm:text-lg">
                    →
                  </span>
                  <div className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11">
                    <Image
                      src={BIN_IMAGE_PATHS[type]}
                      alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                      fill
                      sizes="(min-width: 1024px) 44px, 40px"
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === 右カラム: 操作方法（D&D / クリック 2 ステップ） === */}
        <section className="sm:basis-3/5">
          <h3 className="text-center text-base font-black tracking-widest sm:text-lg lg:text-xl">
            操作方法（どちらでもOK！）
          </h3>
          {/*
            2 方式カードを縦に積んで「または」コネクタで接続。
            右カラム幅（sm:basis-3/5）に収まるよう常に縦並びとする。
            各カードの下部にそれぞれの取消方法を併記する。
          */}
          <div className="mt-3 flex flex-col items-stretch gap-2">
            {/* 方式 A: ドラッグ&ドロップ */}
            <div className="flex flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3">
              <div className="flex justify-center">
                <span
                  className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
                  style={{ backgroundColor: SORTER_UI_COLORS.success }}
                >
                  🖱 ドラッグ&ドロップ
                </span>
              </div>
              {/* イラストは左カラム「仕分け方」と重複するため省略し、説明テキストのみで簡潔に。
                  クリック 2 ステップ側と同じくらいの padding・テキスト密度で視覚的に並ぶよう調整する。 */}
              <p className="mt-1.5 px-2 text-center text-sm font-bold sm:mt-2 sm:px-4 sm:text-base">
                荷物をつかんで仕分け先へドロップ
              </p>
              <p className="mt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
                ※ 仕分け先の外で離すと取り消し
              </p>
            </div>

            {/* 「または」コネクタ（装飾）。aria-hidden で読み上げ対象から除外する。 */}
            <div
              aria-hidden
              className="flex shrink-0 items-center justify-center"
            >
              <span
                className="rounded-full border-[2px] border-black px-2.5 py-0.5 text-xs font-black shadow-[2px_2px_0_0_#000]"
                style={{ backgroundColor: SORTER_UI_COLORS.warning }}
              >
                または
              </span>
            </div>

            {/* 方式 B: クリック 2 ステップ */}
            <div className="flex flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3">
              <div className="flex justify-center">
                <span
                  className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
                  style={{ backgroundColor: SORTER_UI_COLORS.link }}
                >
                  クリック 2 ステップ
                </span>
              </div>
              <div className="mt-1.5 flex flex-col items-start justify-center gap-1 px-2 text-xs font-bold sm:px-4 sm:text-sm">
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
              <p className="mt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
                ※ 再クリックで取り消し
              </p>
            </div>
          </div>
        </section>
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
