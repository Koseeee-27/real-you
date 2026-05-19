'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  RULE_CHANGED_2_DURATION_MS,
  SCORE_OUTFLOW_PENALTY,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import type { GamePhase } from '../hooks/useSorterGame';

/**
 * 速度 2 倍予告バナーで「残り N 秒」を表示する際の秒数。
 * rule-changed-2 phase の長さから派生させて、定数変更時にコピーが自動追従する。
 */
const SPEED_UP_REMAINING_SEC = RULE_CHANGED_2_DURATION_MS / 1000;

interface SorterEventBannerProps {
  /** 現在の phase。バナー表示の切り替えに使う */
  phase: GamePhase;
  /** 速度 2 倍突入の予告バナー表示フラグ */
  showSpeedUpBanner: boolean;
  /** MISS バッジ表示用の key（流出ごとに更新される Date.now() 値）。null なら非表示 */
  missBadgeKey: number | null;
}

/**
 * ベルトコンテナ内に絶対配置される割り込みイベントの表示群。
 *
 *  - ルール変更通知バナー（rule-change-notice phase）
 *  - 凍結予告バナー（frozen-warning phase、シェイク演出）
 *  - 復旧バナー（recovery phase）
 *  - 速度 2 倍予告バナー（rule-changed-2 突入直後 3 秒）
 *  - MISS バッジ（流出時にフラッシュ）
 *
 * 表示位置はベルトコンテナの上端中央を基準にしている。
 */
export default function SorterEventBanner({
  phase,
  showSpeedUpBanner,
  missBadgeKey,
}: SorterEventBannerProps) {
  return (
    <>
      {/* MISS バッジ: 流出口付近にフラッシュ表示 */}
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
            🚨 MISS -{SCORE_OUTFLOW_PENALTY}
          </motion.span>
        )}
      </AnimatePresence>

      {/* イベントバナー */}
      <AnimatePresence>
        {phase === 'rule-change-notice' && (
          <motion.div
            key="rule-change-notice"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.danger }}
          >
            <p className="text-lg font-black tracking-widest text-white sm:text-xl">
              ルール変更！
            </p>
            <p className="text-xs font-bold text-white sm:text-sm">
              「特急」は今後「重量物」の振り分け先へ
            </p>
          </motion.div>
        )}
        {phase === 'frozen-warning' && (
          <motion.div
            key="frozen-warning"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: [0, -4, 4, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.2 },
              x: { duration: 0.3, repeat: Infinity, ease: 'linear' },
            }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.danger }}
          >
            <p className="text-base font-black tracking-widest text-white sm:text-lg">
              ⚠ 機械が停止します
            </p>
          </motion.div>
        )}
        {phase === 'recovery' && (
          <motion.div
            key="recovery"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.success }}
          >
            <p className="text-base font-black tracking-widest text-white sm:text-lg">
              ✓ 復旧
            </p>
          </motion.div>
        )}
        {showSpeedUpBanner && (
          <motion.div
            key="speed-up-banner"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.warning }}
          >
            <p className="text-base font-black tracking-widest text-black sm:text-lg">
              ⚡ 残り {SPEED_UP_REMAINING_SEC} 秒！速度が 2 倍になります！！
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
