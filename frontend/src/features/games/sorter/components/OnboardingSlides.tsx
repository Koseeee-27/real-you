'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  BIN_IMAGE_PATHS,
  GAME_DURATION_SEC,
  PACKAGE_COLORS,
  PACKAGE_IMAGE_PATHS,
  PACKAGE_LABELS,
  PACKAGE_TYPES,
  SCORE_CORRECT,
  SCORE_OUTFLOW_PENALTY,
  SCORE_WRONG_PENALTY,
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
const SLIDES = [
  SlideIntro,
  SlideColorPairing,
  SlideHowToPlay,
  SlideScoring,
] as const;

/**
 * ゲーム開始時に表示する 4 スライドのオンボーディング。
 *
 * - スライド 1/4: ゲーム概要（流れてくる荷物を、対応する仕分け先に投入）
 * - スライド 2/4: 仕分けカテゴリーのカラーペアリング（特急=赤 / 取扱注意=青 / 重量物=茶）
 * - スライド 3/4: 操作方法（[1] 荷物クリック → [2] 振り分け先クリック の 2 ステップ）
 * - スライド 4/4: 採点ルール + スタートボタン
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
      <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border-[6px] border-black bg-white shadow-[8px_8px_0_0_#000] sm:max-w-2xl lg:max-w-4xl">
        {/* スライド進捗インジケーター */}
        <div
          className="flex justify-center gap-2 border-b-[3px] border-black py-3 sm:gap-3 sm:py-4"
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
          PC（lg）では横並びレイアウトで必要高さが減るため min-h を低めに、
          狭い画面では縦積みになるため min-h を高めに取り、どのスライドも見切れない
          ようにする。最も背が高くなるのは狭い画面の SlideColorPairing / SlideScoring。
        */}
        <div className="relative min-h-[480px] overflow-hidden sm:min-h-[440px] lg:min-h-[380px]">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={slideIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 flex flex-col justify-center px-6 py-6 sm:px-10 lg:px-12"
            >
              {(() => {
                const Slide = SLIDES[slideIndex];
                return Slide ? <Slide /> : null;
              })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* フッターボタン */}
        <div
          className="flex justify-between border-t-[3px] border-black p-4 sm:p-5"
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

function SlideIntro() {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-black tracking-widest sm:text-4xl lg:text-5xl">
        仕分けゲーム
      </h2>
      <p className="mt-5 text-base font-bold leading-relaxed sm:mt-6 sm:text-lg lg:text-xl">
        {GAME_DURATION_SEC} 秒の間に流れてくる荷物を、
        <br />
        対応する仕分け先に投入しよう！
      </p>
      <div className="mt-8 flex justify-center gap-4 sm:mt-10 sm:gap-6">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="relative h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
          >
            <Image
              src={PACKAGE_IMAGE_PATHS[type]}
              alt={`${PACKAGE_LABELS[type]}の荷物`}
              fill
              sizes="(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px"
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideColorPairing() {
  return (
    <div>
      <h2 className="text-center text-2xl font-black tracking-widest sm:text-3xl">
        仕分けカテゴリー
      </h2>
      <p className="mt-2 text-center text-sm font-bold text-gray-600 sm:text-base">
        色で見分けて、同じ色の仕分け先へ
      </p>
      {/*
        狭い画面: 1 カラムで縦積み、各カードは横並び（荷物 → 仕分け先）。
        PC（lg）: 3 カラムで横並び、各カードは縦並び（荷物 ↓ 仕分け先）にして
        横スペースを使い切る。flex-row/flex-col の切り替えで両対応する。
      */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 lg:mt-6 lg:grid-cols-3">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000] lg:flex-col lg:gap-2"
          >
            <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 lg:h-16 lg:w-16">
              <Image
                src={PACKAGE_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の荷物`}
                fill
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 80px, 64px"
                className="object-contain"
              />
            </div>
            <span
              className="text-xl font-black tracking-widest sm:text-2xl lg:order-3 lg:text-xl"
              style={{ color: PACKAGE_COLORS[type] }}
            >
              {PACKAGE_LABELS[type]}
            </span>
            <span
              aria-hidden
              className="ml-auto text-2xl font-black sm:text-3xl lg:ml-0 lg:order-1 lg:text-2xl"
            >
              <span className="lg:hidden">→</span>
              <span className="hidden lg:inline">↓</span>
            </span>
            <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 lg:order-2 lg:h-16 lg:w-16">
              <Image
                src={BIN_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                fill
                sizes="(min-width: 1024px) 64px, (min-width: 640px) 80px, 64px"
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideHowToPlay() {
  return (
    <div>
      <h2 className="text-center text-2xl font-black tracking-widest sm:text-3xl">
        操作方法
      </h2>
      <p className="mt-2 text-center text-sm font-bold text-gray-600 sm:text-base">
        2 ステップで仕分け完了
      </p>
      {/*
        狭い画面: 1 カラムで縦積み、各ステップは横並び。
        PC（sm 以上）: 2 カラムで横並びにして 2 ステップを左右に配置。
        カラム内は番号 → 説明 → 画像の縦並びにして横長カードを使い切る。
      */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
        <div className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000] sm:flex-col sm:text-center">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-base font-black sm:h-11 sm:w-11 sm:text-lg"
            style={{ backgroundColor: SORTER_UI_COLORS.success }}
          >
            1
          </span>
          <span className="text-sm font-bold sm:text-base">
            流れている荷物をクリックして選択
          </span>
          <div className="relative ml-auto h-14 w-14 shrink-0 sm:ml-0 sm:h-20 sm:w-20">
            <Image
              src={PACKAGE_IMAGE_PATHS.urgent}
              alt="荷物の例"
              fill
              sizes="(min-width: 640px) 80px, 56px"
              className="object-contain"
            />
          </div>
        </div>
        <div className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000] sm:flex-col sm:text-center">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-base font-black text-white sm:h-11 sm:w-11 sm:text-lg"
            style={{ backgroundColor: SORTER_UI_COLORS.link }}
          >
            2
          </span>
          <span className="text-sm font-bold sm:text-base">
            該当する仕分け先をクリック
          </span>
          <div className="relative ml-auto h-14 w-14 shrink-0 sm:ml-0 sm:h-20 sm:w-20">
            <Image
              src={BIN_IMAGE_PATHS.urgent}
              alt="仕分け先の例"
              fill
              sizes="(min-width: 640px) 80px, 56px"
              className="object-contain"
            />
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-bold text-gray-500 sm:text-sm">
        ※ 選択中の荷物を再クリックすると選択解除
      </p>
    </div>
  );
}

function SlideScoring() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-black tracking-widest sm:text-3xl">
        採点ルール
      </h2>
      {/*
        狭い画面: 1 カラムで縦積み、各行は横並び（点数 + 説明）。
        PC（lg）: 3 カラムで横並びにして 3 つの採点ルールを左右に配置。
        カラム内は点数 → 説明の縦並びにして横長カードを使い切る。
      */}
      <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:mt-8 sm:gap-4 lg:grid-cols-3">
        <div
          className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black p-4 lg:flex-col lg:gap-2 lg:text-center"
          style={{ backgroundColor: SORTER_UI_COLORS.successBgSubtle }}
        >
          <span
            className="text-3xl font-black sm:text-4xl"
            style={{ color: SORTER_UI_COLORS.successText }}
          >
            +{SCORE_CORRECT}
          </span>
          <span className="text-sm font-bold sm:text-base">
            正しい仕分け先に投入
          </span>
        </div>
        <div
          className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black p-4 lg:flex-col lg:gap-2 lg:text-center"
          style={{ backgroundColor: SORTER_UI_COLORS.dangerBgSubtle }}
        >
          <span
            className="text-3xl font-black sm:text-4xl"
            style={{ color: SORTER_UI_COLORS.dangerText }}
          >
            -{SCORE_WRONG_PENALTY}
          </span>
          <span className="text-sm font-bold sm:text-base">
            誤った仕分け先に投入
          </span>
        </div>
        <div className="flex flex-row items-center gap-3 rounded-xl border-[3px] border-black bg-gray-200 p-4 lg:flex-col lg:gap-2 lg:text-center">
          <span className="text-3xl font-black text-gray-700 sm:text-4xl">
            -{SCORE_OUTFLOW_PENALTY}
          </span>
          <span className="text-sm font-bold sm:text-base">
            画面外に流れてしまった
          </span>
        </div>
      </div>
      <p className="mt-5 text-sm font-bold text-gray-600 sm:text-base">
        頑張って高スコアを狙おう！
      </p>
    </div>
  );
}
