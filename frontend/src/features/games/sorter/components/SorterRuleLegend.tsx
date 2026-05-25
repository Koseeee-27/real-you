'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { PackageType } from '@/features/games/types';
import {
  BIN_IMAGE_PATHS,
  PACKAGE_IMAGE_PATHS,
  PACKAGE_LABELS,
  PACKAGE_TYPES,
  RULE_CHANGED_CORRECT_BIN,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';

interface SorterRuleLegendProps {
  /**
   * ルール変更が発火済みか。
   * false なら恒等マップ（荷物 type → 同じ type の bin）、
   * true なら RULE_CHANGED_CORRECT_BIN に従って正解 bin を切り替える。
   */
  isRuleChanged: boolean;
}

/**
 * ゲーム中ずっと表示する「現在の仕分けルール」凡例。
 *
 * 各荷物種別（特急 / 取扱注意 / 重量物）について、いま正解となる仕分け先 bin を
 * 「荷物アイコン → 矢印 → 正解 bin アイコン」で横並び 3 に示す。
 * ベルトと BinTray の間（中央の隙間）に置き、ゲーム盤面の空白を埋めつつ
 * プレイヤーが正解ルールを常に確認できるようにする。
 *
 * 配置: SorterGameFlow のベルトコンテナと BinTray の間。
 *
 * 【重要 / D&D を壊さない担保】
 *   この凡例は純粋な表示で、ドラッグ&ドロップを一切妨げてはならない。
 *   - ルート要素に `pointer-events-none` を付ける。これにより PackageItem 側の
 *     ドロップ判定 `resolveDropBin`（document.elementFromPoint）が凡例を貫通し、
 *     背面の要素（bin など）を正しく拾える。
 *   - 凡例の要素には **`data-bin-type` を付けない**。万一 elementFromPoint が
 *     凡例配下を拾っても `closest('[data-bin-type]')` がマッチせず、bin と誤認されない。
 *   この 2 点で D&D（追従・ドロップ判定・bin ハイライト）に干渉しない。
 *
 * ルール変更時はマッピングが動的に切り替わる。恒等から外れた行（= ルール変更で
 * 変わった行）は枠を warning 色でハイライトして、変化に気付きやすくする。
 *
 * マッピングの真実の単一ソースは sorterConstants 側に置く（DRY）:
 *   - 通常時の正解は「荷物 type と同じ type の bin」（恒等）。PACKAGE_TYPES から導出し
 *     恒等マップをハードコードしない。
 *   - ルール変更後は RULE_CHANGED_CORRECT_BIN を参照する（useSorterGame の判定と同一ソース）。
 */
export default function SorterRuleLegend({
  isRuleChanged,
}: SorterRuleLegendProps) {
  /** 荷物 type → 現在の正解 bin type を返す。通常時は恒等（type 自身）。 */
  const correctBinFor = (type: PackageType): PackageType =>
    isRuleChanged ? RULE_CHANGED_CORRECT_BIN[type] : type;

  return (
    <div
      className="pointer-events-none mx-auto flex w-full max-w-2xl items-center justify-center gap-2 px-2 sm:gap-3"
      aria-label="現在の仕分けルール"
    >
      {/* ラベル（狭幅では非表示にして 3 エントリの横幅を優先） */}
      <span
        aria-hidden
        className="hidden shrink-0 text-xs font-black tracking-wider text-black/55 sm:block"
      >
        現在の
        <br />
        ルール
      </span>

      <div className="grid flex-1 grid-cols-3 gap-1.5 sm:gap-2">
        {PACKAGE_TYPES.map((type) => {
          const binType = correctBinFor(type);
          // 恒等から外れた = ルール変更で変わった行。枠をハイライトする。
          const isChangedRow = binType !== type;
          return (
            <motion.div
              key={type}
              // ルール変更で対応が変わった行だけ枠色・背景をアニメ切替してハイライトする。
              // 同種値（rgba）同士で補間させ、通常 ↔ ハイライトをなめらかに行き来させる。
              animate={{
                borderColor: isChangedRow
                  ? SORTER_UI_COLORS.warning
                  : 'rgba(0,0,0,1)',
                backgroundColor: isChangedRow
                  ? 'rgba(241,207,68,0.35)'
                  : 'rgba(255,255,255,0.92)',
              }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-1 rounded-lg border-[3px] px-1 py-1 shadow-[2px_2px_0_0_#000] sm:gap-1.5 sm:px-2"
            >
              {/* 荷物アイコン */}
              <div className="relative h-8 w-8 shrink-0 sm:h-10 sm:w-10">
                <Image
                  src={PACKAGE_IMAGE_PATHS[type]}
                  alt={`${PACKAGE_LABELS[type]}の荷物`}
                  fill
                  sizes="(min-width: 640px) 40px, 32px"
                  className="object-contain"
                />
              </div>
              <span aria-hidden className="text-base font-black sm:text-lg">
                →
              </span>
              {/* 正解 bin アイコン（現在ルールに追従） */}
              <div className="relative h-8 w-8 shrink-0 sm:h-10 sm:w-10">
                <Image
                  src={BIN_IMAGE_PATHS[binType]}
                  alt={`${PACKAGE_LABELS[binType]}の仕分け先`}
                  fill
                  sizes="(min-width: 640px) 40px, 32px"
                  className="object-contain"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/*
        ルール変更が起きた瞬間に「変わった」と気付かせるための小バッジ。
        AnimatePresence で出現 / 消滅をなめらかに。aria-hidden（HUD のバッジ帯で
        スクリーンリーダー向けには既に伝わるため、ここでは視覚補助に限定）。
      */}
      <AnimatePresence>
        {isRuleChanged && (
          <motion.span
            key="rule-changed-mark"
            aria-hidden
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="hidden shrink-0 rounded-md border-[2px] border-black px-1.5 py-0.5 text-[10px] font-black tracking-wider text-black sm:block"
            style={{ backgroundColor: SORTER_UI_COLORS.warning }}
          >
            変更
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
