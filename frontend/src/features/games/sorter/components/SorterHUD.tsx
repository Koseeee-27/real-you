'use client';

import { motion } from 'framer-motion';
import { SORTER_UI_COLORS } from '../data/sorterConstants';

/** 残り時間が少なくなったときに警告表示するしきい値（ms） */
const TIMER_WARNING_THRESHOLD_MS = 10_000;

interface SorterHUDProps {
  /** 残り時間（ms） */
  remainingTimeMs: number;
  /** 現在の表示スコア */
  displayScore: number;
  /** 機械停止中か（最優先で「機械停止中」バッジを表示） */
  isFrozen: boolean;
  /** ルール変更中か（凍結中以外で表示） */
  isRuleChanged: boolean;
  /** 速度 2 倍中か（rule-changed-2 中、凍結中以外で表示） */
  isSpeedUp: boolean;
}

/**
 * ゲーム画面上部の HUD（Heads-Up Display）。
 *
 * - 上段: タイトル / 残り時間（点滅警告付き） / SCORE
 * - 下段: 状態バッジ列（機械停止中 / ルール変更中 / スピード 2 倍）
 *
 * 残り時間 10 秒未満で赤色 + パルス表示に切り替わる。
 * バッジは優先度に応じて「機械停止中」表示時は他を抑制する。
 */
export default function SorterHUD({
  remainingTimeMs,
  displayScore,
  isFrozen,
  isRuleChanged,
  isSpeedUp,
}: SorterHUDProps) {
  const remainingSec = Math.ceil(remainingTimeMs / 1000);
  const isTimerWarning =
    remainingTimeMs > 0 && remainingTimeMs < TIMER_WARNING_THRESHOLD_MS;

  return (
    <>
      {/* === 上段: タイトル / 残り時間 / SCORE === */}
      <div className="z-10 px-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-xl border-[4px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000]">
          <h1
            className="text-base font-black tracking-widest sm:text-lg"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            仕分けゲーム
          </h1>
          <motion.div
            className="text-2xl font-black sm:text-3xl"
            style={{ color: isTimerWarning ? SORTER_UI_COLORS.danger : '#000' }}
            animate={isTimerWarning ? { scale: [1, 1.08] } : { scale: 1 }}
            transition={
              isTimerWarning
                ? {
                    duration: 0.6,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }
                : { duration: 0.2 }
            }
            aria-label={`残り時間 ${remainingSec} 秒`}
          >
            {remainingSec}
          </motion.div>
          <div
            className="text-base font-black tracking-widest sm:text-lg"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            SCORE {displayScore}
          </div>
        </div>
      </div>

      {/* === 下段: 状態バッジ列 === */}
      <div className="z-10 mt-2 px-4">
        <div className="mx-auto flex w-full max-w-4xl min-h-[28px] items-center gap-2">
          {isFrozen && (
            <span
              className="inline-block rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-black"
              style={{ backgroundColor: SORTER_UI_COLORS.warning }}
            >
              ✗ 機械停止中
            </span>
          )}
          {!isFrozen && isRuleChanged && (
            <span
              className="inline-block rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-black"
              style={{ backgroundColor: SORTER_UI_COLORS.warning }}
            >
              ルール変更中: 特急 → 重量物
            </span>
          )}
          {!isFrozen && isSpeedUp && (
            <span
              className="inline-block rounded-md border-[2px] border-black px-2 py-0.5 text-xs font-black tracking-wider text-white"
              style={{ backgroundColor: SORTER_UI_COLORS.accent }}
            >
              ⚡ スピード2倍
            </span>
          )}
        </div>
      </div>
    </>
  );
}
