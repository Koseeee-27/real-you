'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { PackageType } from '@/features/games/types';
import {
  BIN_IMAGE_PATHS,
  PACKAGE_COLORS,
  PACKAGE_LABELS,
  PACKAGE_TYPES,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import type { SorterFeedback } from '../hooks/useSorterGame';

interface BinTrayProps {
  /** 凍結中（機械停止）か。控えめなシマシマオーバーレイを重ねる */
  isFrozen: boolean;
  onBinClick: (binType: PackageType) => void;
  /**
   * 直近の仕分け結果。クリックされた bin の上に「+10 OK」「-5 NG」ポップアップを表示する。
   * 0.7s 後に親で null にリセットされる（フェードアウト）。
   */
  lastFeedback: SorterFeedback | null;
  /**
   * D&D 中、ポインタが上に重なっている仕分け先（bin）種別。bin 外 / 非ドラッグ時は null。
   * 一致する bin を拡大 + グロー枠でハイライトし「ここでドロップできる」を視覚的に示す。
   */
  hoveredBinType: PackageType | null;
}

/**
 * 下部に並ぶ 3 つの仕分け先（urgent / fragile / heavy）。
 *
 * 画像内に「特急 / 取扱注意 / 重量物」のラベル + 識別シンボルが焼き込まれているため、
 * 画像主体のシンプル構成。ただし bin を縮小すると画像内テキストが読みにくくなるため、
 * 画像の下に補助の種類名ラベル（CSS テキスト）を表示する。
 *
 * ルール変更後でも bin 個別の見た目は変えない（前バージョンで決めた方針、計測価値を保つため）。
 * 凍結中は控えめなシマシマオーバーレイを重ねる。
 *
 * 仕分け実行直後は、クリックされた bin の上に「+10 OK」「-5 NG」のフィードバックポップアップを
 * framer-motion で 0.7s フラッシュ表示する。
 */
export default function BinTray({
  isFrozen,
  onBinClick,
  lastFeedback,
  hoveredBinType,
}: BinTrayProps) {
  return (
    // bin をやや大きく見せるため最大幅を広げる（盤面の隙間解消に合わせ bin を強調）。
    // bin 同士の横間隔（gap）を広げて余白を確保する。D&D の許容範囲との関係は
    // sorterConstants.ts の BIN_DROP_MARGIN_PX のコメントを参照。
    <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-8 sm:gap-12">
      {PACKAGE_TYPES.map((binType) => {
        const showFeedback = lastFeedback?.binType === binType;
        // D&D 中、ポインタがこの bin の上に重なっているか（ドロップ可能の合図）
        const isDropTarget = hoveredBinType === binType;
        return (
          <div key={binType} className="relative flex flex-col items-center">
            <motion.button
              type="button"
              onClick={() => onBinClick(binType)}
              // D&D のドロップ先判定用。PackageItem が pointerup 位置の
              // document.elementFromPoint から `data-bin-type` を辿って仕分け先を特定する。
              data-bin-type={binType}
              className={`relative w-full max-h-60 ${
                // ホバー（ドロップ可能）中はグロー / scale を framer-motion で継続パルスさせるため
                // CSS の transition / hover scale は付けない（競合と二重補間を避ける）。
                isDropTarget
                  ? ''
                  : 'transition-transform duration-150 hover:scale-105'
              } active:scale-95`}
              style={{ aspectRatio: '4 / 5' }}
              // ドロップ可能時は「ここで離せる」を継続的に示すため、scale を緩くパルスさせつつ
              // 緑グロー（drop-shadow）を明滅させる（repeat: Infinity）。bin 画像は透過 PNG のため
              // drop-shadow で輪郭に沿ったグローが掛かる。非ハイライト時は中立値（透明な
              // drop-shadow・scale 1）へ補間し、framer-motion がグローを確実にフェードアウトさせる
              // （drop-shadow ↔ 'none' は数値補間できず残留するため、同種値で補間する）。
              animate={
                isDropTarget
                  ? {
                      scale: [1.06, 1.12],
                      filter: [
                        `drop-shadow(0 0 6px ${SORTER_UI_COLORS.success}) drop-shadow(0 0 2px ${SORTER_UI_COLORS.success})`,
                        `drop-shadow(0 0 18px ${SORTER_UI_COLORS.success}) drop-shadow(0 0 6px ${SORTER_UI_COLORS.success})`,
                      ],
                    }
                  : {
                      scale: 1,
                      // 中立値はハイライト時と同じ drop-shadow を 2 つ、ブラー 0・アルファ 0 で。
                      // drop-shadow ↔ 'none'（キーワード値）は数値補間できずグローが残留するため、
                      // 同種値（drop-shadow 同士・同数）で補間して確実にフェードアウトさせる。
                      filter:
                        'drop-shadow(0 0 0px rgba(87,208,113,0)) drop-shadow(0 0 0px rgba(87,208,113,0))',
                    }
              }
              transition={
                isDropTarget
                  ? {
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                    }
                  : { duration: 0.2 }
              }
              aria-label={`${PACKAGE_LABELS[binType]}の仕分け先${
                isDropTarget ? '・ここにドロップ' : ''
              }`}
            >
              {/* bin 画像（文字・シンボル焼き込み済み）。下部に並ぶ大きな画像で LCP 候補に近いため priority 付き */}
              <Image
                src={BIN_IMAGE_PATHS[binType]}
                alt={PACKAGE_LABELS[binType]}
                fill
                sizes="(max-width: 640px) 33vw, 256px"
                className="object-contain"
                priority
              />

              {/*
                凍結中の表現:
                - 控えめなシマシマオーバーレイ（黒の半透明、bin が透けて見える）
                - 中央に「✗ 停止中」テキストカード（neo-brutalism スタイル）
              */}
              {isFrozen && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border-[3px] border-black px-2 py-1 text-xs font-black tracking-widest text-black shadow-[3px_3px_0_0_#000] sm:text-sm"
                    style={{ backgroundColor: SORTER_UI_COLORS.warning }}
                  >
                    ✗ 停止中
                  </span>
                </>
              )}
            </motion.button>

            {/* bin 下の種類名ラベル（CSS テキストで補助、画像テキストが読みにくいケースの保険） */}
            <span
              className="mt-1 text-sm font-black tracking-widest sm:text-base"
              style={{ color: PACKAGE_COLORS[binType] }}
            >
              {PACKAGE_LABELS[binType]}
            </span>

            {/*
              フィードバックポップアップ。
              bin の上に「+10」「-5」を 0.7s フラッシュ表示。
              正解 / 不正解は背景色（success / danger）で示すため、テキストは数値のみ。
              keyframes:
                0%   : opacity 0, y +10, scale 0.8
                20%  : opacity 1, y 0, scale 1.1
                80%  : opacity 1, y 0, scale 1
                100% : opacity 0, y -30, scale 1
            */}
            <AnimatePresence>
              {showFeedback && lastFeedback && (
                <motion.div
                  key={lastFeedback.at}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [10, 0, 0, -30],
                    scale: [0.8, 1.1, 1, 1],
                  }}
                  transition={{
                    duration: 0.7,
                    times: [0, 0.2, 0.8, 1],
                    ease: 'easeOut',
                  }}
                  className="pointer-events-none absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border-[3px] border-black px-4 py-1.5 text-lg font-black tracking-widest whitespace-nowrap shadow-[3px_3px_0_0_#000] sm:text-xl"
                  style={{
                    backgroundColor: lastFeedback.correct
                      ? SORTER_UI_COLORS.success
                      : SORTER_UI_COLORS.danger,
                    color: lastFeedback.correct ? '#000' : '#fff',
                  }}
                >
                  {lastFeedback.correct
                    ? `+${lastFeedback.scoreChange}`
                    : `${lastFeedback.scoreChange}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
