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
 * 将来 duration が 1000ms 単位以外（例: 10_500ms）になっても整数秒で表示するよう
 * Math.ceil で切り上げる（「最低でも N 秒残ってる」感を出すため）。
 */
const SPEED_UP_REMAINING_SEC = Math.ceil(RULE_CHANGED_2_DURATION_MS / 1000);

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
  // 凍結予告（frozen-warning）と停止中（frozen）でベルト領域に重ねる危機感オーバーレイ。
  // 予告中は弱め・点滅速め、停止中は強め・点滅ゆっくりにして段階感を出す。
  const isDangerOverlay = phase === 'frozen-warning' || phase === 'frozen';
  const dangerFlashPeak = phase === 'frozen' ? 0.32 : 0.18;
  const dangerFlashDuration = phase === 'frozen' ? 0.9 : 0.55;

  return (
    <>
      {/*
        危機感オーバーレイ（凍結予告 → 停止）。
        ベルト領域全体に赤フラッシュ + 暗転ビネットを重ねて「やばい感」を出す。
        操作を邪魔しないよう pointer-events-none / aria-hidden。
      */}
      <AnimatePresence>
        {isDangerOverlay && (
          <motion.div
            key="danger-overlay"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* 四隅を暗く落とすビネット（中央は素通し） */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)',
              }}
            />
            {/* 赤フラッシュ（脈動）。danger 色をベースに点滅させて警報感を出す */}
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: SORTER_UI_COLORS.danger }}
              animate={{ opacity: [0, dangerFlashPeak, 0] }}
              transition={{
                duration: dangerFlashDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
              // 振幅を大きくして「やばい感」を強調 + 軽い拡大の脈動を重ねる
              x: [0, -8, 8, -8, 8, 0],
              scale: [1, 1.06, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.15 },
              x: { duration: 0.35, repeat: Infinity, ease: 'linear' },
              scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[6px_6px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.danger }}
          >
            {/* 赤点滅: 同色のオーバーレイを脈動させてベタ塗りに点滅感を足す */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[10px]"
              style={{ backgroundColor: '#fff' }}
              animate={{ opacity: [0, 0.35, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <p className="relative text-base font-black tracking-widest text-white sm:text-lg">
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
              ⚡ 残り {SPEED_UP_REMAINING_SEC} 秒！スピード 2 倍突入！
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
