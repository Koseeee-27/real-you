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
  SCORE_OUTFLOW_PENALTY,
  SCORE_WRONG_PENALTY,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';

interface OnboardingSlidesProps {
  /** 0..3 のスライド index */
  slideIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onStart: () => void;
}

const TOTAL_SLIDES = 4;

/**
 * ゲーム開始時に表示する 4 スライドのオンボーディング。
 *
 * - スライド 1/4: ゲーム概要（50 秒で流れてくる荷物を、対応する仕分け先に投入）
 * - スライド 2/4: 仕分けカテゴリーのカラーペアリング（特急=赤 / 取扱注意=青 / 重量物=茶）
 * - スライド 3/4: 操作方法（[1] 荷物クリック → [2] 振り分け先クリック の 2 ステップ）
 * - スライド 4/4: 採点ルール + スタートボタン
 *
 * スライド間は「← 戻る」「次へ →」で双方向移動可能。
 * 最終スライドの「スタート」を押すと親側で countdown phase に遷移する。
 *
 * 双方向アニメーション: `direction` を ref で保持し、`AnimatePresence` の custom prop で
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
   * render 中に slideIndex 比較で判定すると ref 不正アクセスになるため、
   * ハンドラ内で setDirection してから親の onPrev/onNext を呼ぶ流儀にする。
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
  const isLast = slideIndex === TOTAL_SLIDES - 1;

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
      <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border-[6px] border-black bg-white shadow-[8px_8px_0_0_#000]">
        {/* スライド進捗インジケーター */}
        <div
          className="flex justify-center gap-2 border-b-[3px] border-black py-3"
          style={{ backgroundColor: SORTER_UI_COLORS.warning }}
        >
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border-[2px] border-black ${
                i === slideIndex ? 'bg-black' : 'bg-white'
              }`}
              aria-hidden
            />
          ))}
        </div>

        {/* スライドコンテンツ（双方向アニメーション） */}
        <div className="relative min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={slideIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="px-6 py-8"
            >
              {slideIndex === 0 && <SlideIntro />}
              {slideIndex === 1 && <SlideColorPairing />}
              {slideIndex === 2 && <SlideHowToPlay />}
              {slideIndex === 3 && <SlideScoring />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* フッターボタン */}
        <div
          className="flex justify-between border-t-[3px] border-black p-4"
          style={{ backgroundColor: SORTER_UI_COLORS.warning }}
        >
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="rounded-xl border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← 戻る
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl border-[3px] border-black px-6 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000]"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              スタート ▶
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl border-[3px] border-black px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000]"
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
      <h2 className="text-2xl font-black tracking-widest">仕分けゲーム</h2>
      <p className="mt-4 text-sm font-bold leading-relaxed">
        50 秒の間に流れてくる荷物を、
        <br />
        対応する仕分け先に投入しよう！
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {PACKAGE_TYPES.map((type) => (
          <div key={type} className="relative h-16 w-16">
            <Image
              src={PACKAGE_IMAGE_PATHS[type]}
              alt={`${PACKAGE_LABELS[type]}の荷物`}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold text-gray-600">
        判断力と冷静さが試されます
      </p>
    </div>
  );
}

function SlideColorPairing() {
  return (
    <div>
      <h2 className="text-center text-xl font-black tracking-widest">
        仕分けカテゴリー
      </h2>
      <p className="mt-2 text-center text-xs font-bold text-gray-600">
        色で見分けて、同じ色の仕分け先へ
      </p>
      <div className="mt-6 space-y-3">
        {PACKAGE_TYPES.map((type) => (
          <div
            key={type}
            className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-white p-2 shadow-[3px_3px_0_0_#000]"
          >
            <div className="relative h-14 w-14 shrink-0">
              <Image
                src={PACKAGE_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の荷物`}
                fill
                sizes="56px"
                className="object-contain"
              />
            </div>
            <span
              className="text-xl font-black tracking-widest"
              style={{ color: PACKAGE_COLORS[type] }}
            >
              {PACKAGE_LABELS[type]}
            </span>
            <span aria-hidden className="ml-auto text-2xl font-black">
              →
            </span>
            <div className="relative h-14 w-14 shrink-0">
              <Image
                src={BIN_IMAGE_PATHS[type]}
                alt={`${PACKAGE_LABELS[type]}の仕分け先`}
                fill
                sizes="56px"
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
      <h2 className="text-center text-xl font-black tracking-widest">操作方法</h2>
      <p className="mt-2 text-center text-xs font-bold text-gray-600">
        2 ステップで仕分け完了
      </p>
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-sm font-black"
            style={{ backgroundColor: SORTER_UI_COLORS.success }}
          >
            1
          </span>
          <span className="text-sm font-bold">流れている荷物をクリックして選択</span>
          <div className="relative ml-auto h-12 w-12 shrink-0">
            <Image
              src={PACKAGE_IMAGE_PATHS.urgent}
              alt="荷物の例"
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2px] border-black text-sm font-black text-white"
            style={{ backgroundColor: SORTER_UI_COLORS.link }}
          >
            2
          </span>
          <span className="text-sm font-bold">該当する仕分け先をクリック</span>
          <div className="relative ml-auto h-12 w-12 shrink-0">
            <Image
              src={BIN_IMAGE_PATHS.urgent}
              alt="仕分け先の例"
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        </div>
        <p className="mt-2 text-xs font-bold text-gray-500">
          ※ 選択中の荷物を再クリックすると選択解除
        </p>
      </div>
    </div>
  );
}

function SlideScoring() {
  return (
    <div className="text-center">
      <h2 className="text-xl font-black tracking-widest">採点ルール</h2>
      <div className="mt-6 space-y-3 text-left">
        <div
          className="flex items-center gap-3 rounded-xl border-[3px] border-black p-3"
          style={{ backgroundColor: SORTER_UI_COLORS.successBgSubtle }}
        >
          <span
            className="text-2xl font-black"
            style={{ color: SORTER_UI_COLORS.successText }}
          >
            +{SCORE_CORRECT}
          </span>
          <span className="text-sm font-bold">正しい仕分け先に投入</span>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl border-[3px] border-black p-3"
          style={{ backgroundColor: SORTER_UI_COLORS.dangerBgSubtle }}
        >
          <span
            className="text-2xl font-black"
            style={{ color: SORTER_UI_COLORS.dangerText }}
          >
            -{SCORE_WRONG_PENALTY}
          </span>
          <span className="text-sm font-bold">誤った仕分け先に投入</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-gray-200 p-3">
          <span className="text-2xl font-black text-gray-700">
            -{SCORE_OUTFLOW_PENALTY}
          </span>
          <span className="text-sm font-bold">画面外に流れてしまった</span>
        </div>
      </div>
      <p className="mt-4 text-xs font-bold text-gray-600">
        慎重に！流れていく荷物を見逃すな！
      </p>
    </div>
  );
}
