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
 *   - スライド 1/2: 概要 + 2 カラム（左: 仕分け方 / 右: 操作方法）。タイトルのみ
 *     上段に置き、1 行説明は左カラム冒頭に移動。PC（lg）では操作 2 方式カードを
 *     横並びにして縦サイズを圧縮し 1 画面に収める。
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
        // PC（lg）で操作 2 方式を横並びにし、サブタイトルを左カラムへ移動した結果、
        // slide1 の縦サイズが大幅圧縮された。SlideModal 既定（440/420/400）に
        // 近い水準で両スライドが収まる。
        body: 'min-h-[520px] sm:min-h-[440px] lg:min-h-[400px]',
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
 * 上段にゲーム名のみを置き、1 行説明は左カラム冒頭に配置することで上部の
 * 縦サイズを圧縮する。下段を 2 カラム構成にして PC で 1 画面に収める。
 *
 * **左カラム**: 1 行説明 + 「仕分け方」見出し + 3 カテゴリーの色対応（荷物 →
 * 仕分け先）を 1 枚の白カード内に 3 行で並べた早見表。
 *
 * **右カラム**: 「操作方法」見出し + D&D / クリック 2 ステップの 2 方式カード。
 * 狭幅 / sm では縦積み（カード → または → カード）、PC（lg）では横並び
 * （カード | または | カード）にして縦サイズをさらに圧縮する。各操作カードの
 * 下部にはそれぞれの取消方法を併記する。
 *
 * レイアウト全体: 狭幅（base）は縦積み（タイトル → 左 → 右）、PC（sm 以上）は
 * 2 カラム（タイトル → 左|右）。左右の幅比は 2:3。
 */
function SlideHowToPlay() {
  return (
    <div>
      {/* 上段: ゲーム名のみ。1 行説明は左カラム冒頭に移動して上部の縦サイズを節約。 */}
      <h2 className="text-center text-2xl font-black tracking-widest sm:text-3xl lg:text-4xl">
        仕分けゲーム
      </h2>

      {/* 下段: 2 カラム（左: 仕分け方 / 右: 操作方法）。狭幅は縦積み、sm 以上で左右並び。
          items-stretch でカラム高さを揃え、bordered card 側を flex-1 で残り高さを
          埋めることで両カラムの黒枠カードの底辺を揃える。間に縦の区切り線を入れる。 */}
      <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:items-stretch sm:gap-5 lg:gap-6">
        {/* === 左カラム: 1 行説明 + 仕分け方（カテゴリー早見表） === */}
        <section className="flex flex-col sm:basis-2/5">
          <p className="text-center text-sm font-bold sm:text-base lg:text-lg">
            流れてくる荷物を適切に仕分けよう！
          </p>
          <h3 className="mt-3 text-center text-base font-black tracking-widest sm:text-lg lg:text-xl">
            仕分け方
          </h3>
          {/*
            1 枚の白カード内に 3 カテゴリーの「荷物 → 仕分け先」を 3 行並べる。
            行ごとに色付きラベル（固定幅）+ 荷物画像 → 仕分け先画像。
            個別境界なしで「3 つで 1 つの早見表」というまとまり感を出す。
          */}
          <div className="mt-3 flex flex-1 flex-col justify-evenly gap-2 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
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

        {/* 縦の区切り線（sm 以上で表示）。2 カラム間を視覚的に分ける。
            self-stretch で行全体（=カラムの最大高さ）に伸ばす。 */}
        <div
          aria-hidden
          className="hidden w-px self-stretch bg-gray-300 sm:block"
        />

        {/* === 右カラム: 操作方法（D&D / クリック 2 ステップ） === */}
        <section className="flex flex-col sm:basis-3/5">
          <h3 className="text-center text-base font-black tracking-widest sm:text-lg lg:text-xl">
            操作方法（どちらでもOK！）
          </h3>
          {/*
            2 方式カード + 「または」コネクタ。
            狭幅 / sm: 縦積み（カード → または → カード）。
            PC（lg）: 横並び（カード | または | カード）にして縦サイズを圧縮。
            各カードの下部にそれぞれの取消方法を併記する。items-stretch で
            横並び時に 2 カードの高さを揃える。
          */}
          <div className="mt-3 flex flex-1 flex-col items-stretch gap-2 lg:flex-row lg:gap-3">
            {/* 方式 A: ドラッグ&ドロップ */}
            <div className="flex flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3 lg:flex-1 lg:basis-0">
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
              <p className="mt-auto pt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
                ※ 仕分け先の外で離すと取り消し
              </p>
            </div>

            {/* 「または」コネクタ（装飾）。aria-hidden で読み上げ対象から除外する。
                狭幅/sm: 上下カードの間（縦並び）。lg: 左右カードの中央（横並び）。 */}
            <div
              aria-hidden
              className="flex shrink-0 items-center justify-center lg:self-center"
            >
              <span
                className="rounded-full border-[2px] border-black px-2.5 py-0.5 text-xs font-black shadow-[2px_2px_0_0_#000]"
                style={{ backgroundColor: SORTER_UI_COLORS.warning }}
              >
                または
              </span>
            </div>

            {/* 方式 B: クリック 2 ステップ */}
            <div className="flex flex-col rounded-xl border-[3px] border-black bg-white p-2.5 shadow-[3px_3px_0_0_#000] sm:p-3 lg:flex-1 lg:basis-0">
              <div className="flex justify-center">
                <span
                  className="rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
                  style={{ backgroundColor: SORTER_UI_COLORS.link }}
                >
                  クリック 2 ステップ
                </span>
              </div>
              <div className="mt-1.5 flex flex-col items-start justify-center gap-1 px-2 text-xs font-bold sm:mt-2 sm:px-4 sm:text-sm">
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
              <p className="mt-auto pt-1.5 text-center text-[11px] font-bold text-gray-500 sm:text-xs">
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
 * 採点は 2 枠カードに分けず、1 行で「正しく仕分けると +N 点 ／ 誤って仕分けると
 * -N 点」と話口調で続ける。数字（+10 / -5）だけ色付き太字にして視認性を確保し、
 * 過剰な装飾箱を作らないことで「目標」を主役に据える。
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
        正しく仕分けると
        <span
          className="mx-1 font-black"
          style={{ color: SORTER_UI_COLORS.successText }}
        >
          +{SCORE_CORRECT} 点
        </span>
        ／ 誤って仕分けると
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
