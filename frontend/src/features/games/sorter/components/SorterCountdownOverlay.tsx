'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface SorterCountdownOverlayProps {
  /** 表示する数字。0 のときは「START」表示 */
  countdownValue: 3 | 2 | 1 | 0;
}

/**
 * カウントダウンの全画面オーバーレイ。
 * 3 → 2 → 1 → START の順で 1 秒弱ずつ表示される（親 hook で値を切り替える）。
 *
 * `key={countdownValue}` の変化を `AnimatePresence` で検出し、
 * 前の数字の exit (scale + opacity フェード) → 次の数字の enter で
 * 「ポップアップ → 消える」演出を実現する。`mode="wait"` で
 * exit 完了を待ってから次の enter を開始するため、重なり表示を防ぐ。
 */
export default function SorterCountdownOverlay({
  countdownValue,
}: SorterCountdownOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
      <AnimatePresence mode="wait">
        <motion.div
          key={countdownValue}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <p className="text-[120px] font-black leading-none text-white drop-shadow-lg sm:text-[160px]">
            {countdownValue === 0 ? 'START' : countdownValue}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
