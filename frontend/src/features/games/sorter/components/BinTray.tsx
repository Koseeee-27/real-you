'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { PackageType } from '@/features/games/types';
import {
  BIN_IMAGE_PATHS,
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
  /**
   * 誤仕分け直後にガイド表示する「正しい入れ先」bin 種別（ルール変更ミス・通常ミス共通）。
   * 一致する bin をハイライト（hoveredBinType と同じ強調機構）し、上に「こっちへ！」バブル
   * （下向き矢印付き）を出して正解を示す。一定時間後に親が null へ戻す。
   */
  guideBinType: PackageType | null;
}

/**
 * 下部に並ぶ 3 つの仕分け先（urgent / fragile / heavy）。
 *
 * 画像内に「特急 / 取扱注意 / 重量物」のラベル + 識別シンボルが焼き込まれているため、
 * 画像主体のシンプル構成（CSS の補助ラベルは置かない）。
 *
 * ルール変更後でも bin 個別の見た目は変えない（前バージョンで決めた方針、計測価値を保つため）。
 * 凍結中は控えめなシマシマオーバーレイを重ねる。
 *
 * 仕分け実行直後のフィードバック:
 *   - 正解: クリックされた bin の上に「+N」ポップアップ（success 色）を 0.7s フラッシュ。
 *   - 誤り: クリックされた bin を赤グロー + 横シェイクで反応させ、「✗ ちがう！ -N」ポップアップを出す。
 *     さらに正しい入れ先 bin を緑ハイライト +「こっちへ！」バブルでガイドする（guideBinType）。
 */
export default function BinTray({
  isFrozen,
  onBinClick,
  lastFeedback,
  hoveredBinType,
  guideBinType,
}: BinTrayProps) {
  return (
    // bin をやや大きく見せるため最大幅を広げる（盤面の隙間解消に合わせ bin を強調）。
    // bin 同士の横間隔（gap）を広げて余白を確保する。D&D の許容範囲との関係は
    // sorterConstants.ts の BIN_DROP_MARGIN_PX のコメントを参照。
    <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-8 sm:gap-12">
      {PACKAGE_TYPES.map((binType) => {
        const showFeedback = lastFeedback?.binType === binType;
        // この bin が「誤って選ばれた」直後か（赤グロー + シェイクで間違いを伝える）
        const isWrongReaction = showFeedback && lastFeedback?.correct === false;
        // D&D 中、ポインタがこの bin の上に重なっているか（ドロップ可能の合図）
        const isDropTarget = hoveredBinType === binType;
        // 誤仕分け後、この bin が「正しい入れ先」としてガイド表示中か
        const isGuideTarget = guideBinType === binType;
        // グロー / 拡大パルスは「ドロップ可能」「正解ガイド」どちらでも出す（同じ強調機構を流用）
        const isHighlighted = isDropTarget || isGuideTarget;
        return (
          <div key={binType} className="relative flex flex-col items-center">
            <motion.button
              type="button"
              onClick={() => onBinClick(binType)}
              // D&D のドロップ先判定用。PackageItem が pointerup 位置の
              // document.elementFromPoint から `data-bin-type` を辿って仕分け先を特定する。
              data-bin-type={binType}
              className={`relative w-full max-h-60 ${
                // 強調（ドロップ可能 / 正解ガイド）中はグロー / scale を framer-motion で継続
                // パルスさせるため、CSS の transition / hover scale は付けない（競合と二重補間を避ける）。
                isHighlighted
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
                isHighlighted
                  ? {
                      scale: [1.06, 1.12],
                      filter: [
                        `drop-shadow(0 0 6px ${SORTER_UI_COLORS.success}) drop-shadow(0 0 2px ${SORTER_UI_COLORS.success})`,
                        `drop-shadow(0 0 18px ${SORTER_UI_COLORS.success}) drop-shadow(0 0 6px ${SORTER_UI_COLORS.success})`,
                      ],
                    }
                  : isWrongReaction
                    ? {
                        // 誤って選ばれた bin: 赤グローを一瞬焚いて横シェイク。
                        // ハイライト（緑・継続パルス）とは別経路の単発リアクションで「間違い」を伝える。
                        // 終端は透明な drop-shadow / x:0 に収束させ、リアクション後に残留させない。
                        scale: 1,
                        x: [0, -8, 8, -6, 6, 0],
                        filter: [
                          `drop-shadow(0 0 6px ${SORTER_UI_COLORS.danger}) drop-shadow(0 0 2px ${SORTER_UI_COLORS.danger})`,
                          `drop-shadow(0 0 18px ${SORTER_UI_COLORS.danger}) drop-shadow(0 0 6px ${SORTER_UI_COLORS.danger})`,
                          'drop-shadow(0 0 0px rgba(224,49,49,0)) drop-shadow(0 0 0px rgba(224,49,49,0))',
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
                isHighlighted
                  ? {
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                    }
                  : isWrongReaction
                    ? {
                        x: { duration: 0.45, ease: 'easeInOut' },
                        filter: { duration: 0.55, ease: 'easeOut' },
                      }
                    : { duration: 0.2 }
              }
              aria-label={`${PACKAGE_LABELS[binType]}の仕分け先${
                isDropTarget
                  ? '・ここにドロップ'
                  : isGuideTarget
                    ? '・こちらが正しい入れ先'
                    : ''
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
                    : `✗ ちがう！ ${lastFeedback.scoreChange}`}
                </motion.div>
              )}
            </AnimatePresence>

            {/*
              誤仕分け後ガイド。「正しい入れ先」bin の上に大きめの「こっちへ！」バブル
              （下向き矢印付き）を出し、どこが正解だったかを直感的に示す。bin 本体は
              isHighlighted で緑グロー + 拡大パルス（D&D ホバーと同じ強調機構を流用）。
              小さくて気づきにくかったため、文字・余白を拡大し、bin を指す ▼ 矢印（吹き出しの
              しっぽ）を付けて視線を誘導する。
              継続バウンス（y の repeat: Infinity）を持つため、exit には独自 transition を
              必ず指定する（親の repeat を継承して exit が完了せず、opacity:0 のゾンビ要素として
              残るのを防ぐ — frontend.md の framer-motion 注意点に従う）。
            */}
            <AnimatePresence>
              {isGuideTarget && (
                <motion.div
                  key="miss-guide"
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    transition: { duration: 0.2 },
                  }}
                  transition={{
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    y: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="pointer-events-none absolute -top-4 left-1/2 z-30 -translate-x-1/2 -translate-y-full rounded-xl border-[4px] border-black px-5 py-2.5 text-xl font-black tracking-widest whitespace-nowrap text-white shadow-[4px_4px_0_0_#000] sm:text-2xl"
                  style={{ backgroundColor: SORTER_UI_COLORS.success }}
                >
                  こっちへ！
                  {/* 吹き出しのしっぽ（bin を指す下向き矢印）。45度回転した正方形の
                      右下 2 辺だけ黒枠を見せて、バブル下端から下を向く三角に見せる。 */}
                  <span
                    aria-hidden
                    className="absolute -bottom-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r-[4px] border-b-[4px] border-black"
                    style={{ backgroundColor: SORTER_UI_COLORS.success }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
