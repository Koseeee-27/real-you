'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
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
  /** 0..(SLIDES.length - 1) のスライド index */
  slideIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onStart: () => void;
}

/**
 * オンボーディングスライドのコンポーネント配列。
 * 描画・進捗ドット・末尾判定はすべてこの配列から派生する。
 * スライドを追加・削除する場合はここを変更するだけで、配列長に依存する 3 箇所が
 * 自動的に追従する。
 *
 * 外部から参照する `ONBOARDING_SLIDE_COUNT`（sorterConstants）も同じ値に
 * 揃える必要がある（SorterGameFlow の onNext 上限制御で参照する）。
 */
const SLIDES = [SlideOverview, SlideControlsAndScoring] as const;

/**
 * ゲーム開始時に表示する 2 スライドのオンボーディング。
 *
 * - スライド 1/2: 概要 + カテゴリー（流れてくる荷物を同じ色の仕分け先へ。目標 150 点でクリア。
 *                 特急=赤 / 取扱注意=青 / 重量物=茶 の色対応を横並び 3 で表示）
 * - スライド 2/2: 操作 + 採点（D&D / クリック 2 ステップ の操作方法、+10 / -5 の採点、スタートボタン）
 *
 * スライド間は「← 戻る」「次へ →」で双方向移動可能。
 * 最終スライドの「スタート」を押すと `onStart` を呼び、親側で次の phase に遷移する。
 *
 * 双方向アニメーション: `direction` を useState で保持し、`AnimatePresence` の custom prop で
 * variants の `enter`/`exit` を方向別に切り替える。
 */
export default function OnboardingSlides({
  slideIndex,
  onPrev,
  onNext,
  onStart,
}: OnboardingSlidesProps) {
  /**
   * 直前操作の方向（-1 = 戻る、1 = 進む）。
   * ハンドラ内で setDirection を先に呼び、続けて親の onPrev/onNext を呼ぶ流儀にする
   * （render 中に slideIndex から方向を計算するとフレーム間で値が安定しないため）。
   */
  const [direction, setDirection] = useState<1 | -1>(1);

  const handlePrev = () => {
    setDirection(-1);
    onPrev();
  };
  const handleNext = () => {
    setDirection(1);
    onNext();
  };

  const isFirst = slideIndex === 0;
  const isLast = slideIndex === SLIDES.length - 1;

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="仕分けゲームのチュートリアル"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] border-[6px] border-black bg-white shadow-[8px_8px_0_0_#000] sm:max-w-2xl lg:max-w-5xl">
        {/* スライド進捗インジケーター */}
        <div
          className="flex shrink-0 justify-center gap-2 border-b-[3px] border-black py-3 sm:gap-3 sm:py-4"
          style={{ backgroundColor: SORTER_UI_COLORS.warning }}
        >
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border-[2px] border-black sm:h-4 sm:w-4 ${
                i === slideIndex ? 'bg-black' : 'bg-white'
              }`}
              aria-hidden
            />
          ))}
        </div>

        {/*
          スライドコンテンツ（双方向アニメーション）。
          コンテナに min-h を持たせ、各スライドの中身は absolute + flex center で
          中央寄せにする。これによりスライド切替時にカード全体の高さが揺れない。
          min-h は「2 スライドのうち背が高い方」を基準に確保する。
          最も背が高くなるのは、タイトル + サブ 2 行 + カテゴリーカード 3 列
          （荷物画像 → 矢印 → 仕分け先画像 → ラベル）を縦に積む SlideOverview。
          PC（lg）では横並びレイアウトで必要高さが減るため min-h を低めに、
          狭い画面では縦積みになるため min-h を高めに取る。
          外側モーダルの max-h-[90vh] で縦に短い画面では枠が縮む。その場合は
          各スライド（absolute inset-0）を overflow-y-auto にして縦スクロールへ
          逃がす。中身は m-auto でセンタリングし、収まる時は中央寄せ・溢れる時は
          上端から全体をスクロール表示する（flex の justify-center だと溢れた際に
          上端がクリップされスクロールできないため m-auto を使う）。
          親は横方向 swipe のクリップ用に overflow-hidden のままにする。
        */}
        <div className="relative min-h-[560px] flex-1 overflow-hidden sm:min-h-[520px] lg:min-h-[480px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={slideIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 flex overflow-y-auto px-6 py-6 sm:px-10 lg:px-12"
            >
              <div className="m-auto w-full">
                {(() => {
                  const Slide = SLIDES[slideIndex];
                  return Slide ? <Slide /> : null;
                })()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* フッターボタン */}
        <div
          className="flex shrink-0 justify-between border-t-[3px] border-black p-4 sm:p-5"
          style={{ backgroundColor: SORTER_UI_COLORS.warning }}
        >
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="rounded-xl border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 sm:py-3 sm:text-base"
          >
            ← 戻る
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl border-[3px] border-black px-6 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:px-8 sm:py-3 sm:text-base"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              スタート ▶
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl border-[3px] border-black px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:px-6 sm:py-3 sm:text-base"
              style={{ backgroundColor: SORTER_UI_COLORS.link }}
            >
              次へ →
            </button>
          )}
        </div>
      </div>
    </div>
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
 * スライド 2/2: 操作 + 採点。
 *
 * 操作方法（D&D / クリック 2 ステップ）と採点（+10 / -5）を 1 枚にまとめる。
 * 狭幅では縦積み、PC（lg）では操作と採点を左右 2 カラムに分けて横長カードを使い切る。
 * 最終スライドのため、フッターには「スタート」ボタンが表示される。
 */
function SlideControlsAndScoring() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest sm:text-2xl lg:text-3xl">
        操作と採点
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 lg:grid-cols-2 lg:gap-4">
        {/* === 操作方法 === */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* 方法 A: ドラッグ&ドロップ */}
          <div className="rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
                style={{ backgroundColor: SORTER_UI_COLORS.success }}
              >
                ドラッグ&ドロップ
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 sm:gap-3">
              <div className="relative h-11 w-11 shrink-0 sm:h-14 sm:w-14">
                <Image
                  src={PACKAGE_IMAGE_PATHS.urgent}
                  alt="荷物の例"
                  fill
                  sizes="(min-width: 640px) 56px, 44px"
                  className="object-contain"
                />
              </div>
              <span aria-hidden className="text-xl font-black sm:text-2xl">
                →
              </span>
              <div className="relative h-11 w-11 shrink-0 sm:h-14 sm:w-14">
                <Image
                  src={BIN_IMAGE_PATHS.urgent}
                  alt="仕分け先の例"
                  fill
                  sizes="(min-width: 640px) 56px, 44px"
                  className="object-contain"
                />
              </div>
            </div>
            <p className="mt-1 text-center text-xs font-bold text-gray-600 sm:text-sm">
              荷物をつかんで仕分け先へ
            </p>
          </div>

          {/* 方法 B: クリック 2 ステップ */}
          <div className="rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white sm:text-sm"
                style={{ backgroundColor: SORTER_UI_COLORS.link }}
              >
                クリック 2 ステップ
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs font-bold sm:text-sm">
              <span>
                <span
                  className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-[2px] border-black text-xs"
                  style={{ backgroundColor: SORTER_UI_COLORS.success }}
                >
                  1
                </span>
                荷物をクリックして選択
              </span>
              <span>
                <span
                  className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-[2px] border-black text-xs text-white"
                  style={{ backgroundColor: SORTER_UI_COLORS.link }}
                >
                  2
                </span>
                仕分け先をクリック
              </span>
            </div>
          </div>
        </div>

        {/* === 採点 === */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <div
            className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black p-3"
            style={{ backgroundColor: SORTER_UI_COLORS.successBgSubtle }}
          >
            <span
              className="shrink-0 text-3xl font-black sm:text-4xl"
              style={{ color: SORTER_UI_COLORS.successText }}
            >
              +{SCORE_CORRECT}
            </span>
            <span className="text-sm font-bold sm:text-base">
              正しい仕分け先に投入
            </span>
          </div>
          <div
            className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black p-3"
            style={{ backgroundColor: SORTER_UI_COLORS.dangerBgSubtle }}
          >
            <span
              className="shrink-0 text-3xl font-black sm:text-4xl"
              style={{ color: SORTER_UI_COLORS.dangerText }}
            >
              -{SCORE_WRONG_PENALTY}
            </span>
            <span className="text-sm font-bold sm:text-base">
              誤った仕分け先に投入
            </span>
          </div>
          <p className="text-center text-xs font-bold text-gray-500">
            ※ 仕分け先の外で離す / 再クリックで取り消し
          </p>
        </div>
      </div>
    </div>
  );
}
