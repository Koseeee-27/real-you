'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { SORTER_UI_COLORS } from '../data/sorterConstants';

interface SorterMissBadgeProps {
  /** MISS バッジ表示用の key（流出ごとに更新される Date.now() 値）。null なら非表示 */
  missBadgeKey: number | null;
}

/**
 * 荷物流出時に流出口付近へフラッシュ表示する「🚨 MISS」バッジ。
 *
 * 表示位置はベルトコンテナの左下端（流出口）を基準にするため、
 * **ベルトコンテナ内に絶対配置**して使う（盤面ラッパー基準に置くと bin 下に
 * ズレてしまう）。danger-overlay / 上部イベントバナー群は被覆範囲が異なるため
 * `SorterEventBanner` 側で別管理し、本コンポーネントは MISS バッジのみを担う。
 */
export default function SorterMissBadge({
  missBadgeKey,
}: SorterMissBadgeProps) {
  return (
    <AnimatePresence>
      {missBadgeKey != null && (
        <motion.span
          key={missBadgeKey}
          initial={{ opacity: 0, scale: 0.6, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.8, x: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute z-30 inline-block rounded-lg border-[3px] border-black px-3 py-1 text-sm font-black tracking-wider text-white shadow-[3px_3px_0_0_#000] sm:text-base"
          style={{
            left: '16px',
            bottom: '-8px',
            backgroundColor: SORTER_UI_COLORS.danger,
          }}
        >
          🚨 MISS
        </motion.span>
      )}
    </AnimatePresence>
  );
}
