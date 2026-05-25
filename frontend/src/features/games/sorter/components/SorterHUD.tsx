'use client';

import { motion } from 'framer-motion';
import {
  SORTER_UI_COLORS,
  TARGET_SCORE,
  TIME_CAP_MS,
} from '../data/sorterConstants';

interface SorterHUDProps {
  /** 現在の表示スコア（= 目標スコア進捗の現在値） */
  displayScore: number;
  /** 経過時間（ms）。上限 TIME_CAP_MS に対するタイマー表示に使う */
  elapsedTimeMs: number;
  /** 機械停止中か（最優先で「機械停止中」バッジを表示） */
  isFrozen: boolean;
  /** ルール変更中か（凍結中以外で表示） */
  isRuleChanged: boolean;
  /** 速度上昇中か（凍結中以外で表示） */
  isSpeedUp: boolean;
}

/**
 * 残り時間がこの秒数以下になったら警告色（danger）に切り替える閾値（秒）。
 * 「上限に近づく = 失敗が近い」ことを色で直感的に伝えるための HUD 固有の見せ方の値。
 */
const TIMER_WARNING_THRESHOLD_SEC = 10;

/**
 * ゲーム画面上部の HUD（Heads-Up Display）。
 *
 * - 上段: タイトル / 現在スコア（大、目標併記）/ 残り時間タイマー（数値 + 横ゲージ）
 * - 下段: 状態バッジ列（機械停止中 / ルール変更中 / スピード 2 倍）
 *
 * 勝敗の主軸は「目標スコア到達」だが、playtest で進捗バーより数値の方が分かりやすいと
 * 判定されたため、現在スコアを大きく数値表示し目標値を小さく併記する（進捗バーは廃止）。
 * 上限時間は「残り N 秒」を大きめに出し、横ゲージで減りも見せる。残りが
 * TIMER_WARNING_THRESHOLD_SEC 秒以下になると数値・ゲージとも danger 色になり、
 * 「上限到達 = 失敗」が近いことを直感的に伝える。
 * バッジは優先度に応じて「機械停止中」表示時は他を抑制する。
 */
export default function SorterHUD({
  displayScore,
  elapsedTimeMs,
  isFrozen,
  isRuleChanged,
  isSpeedUp,
}: SorterHUDProps) {
  // 残り秒（経過が上限を超えても 0 で止める）。
  const remainingSec = Math.max(
    0,
    Math.ceil((TIME_CAP_MS - elapsedTimeMs) / 1000)
  );
  // 残り時間の割合（0–100%）。横ゲージの幅に使う。
  const remainingPct = Math.max(
    0,
    Math.min(100, 100 - (elapsedTimeMs / TIME_CAP_MS) * 100)
  );
  // 残りわずか → 警告色に切替（数値・ゲージ共通）。
  const isTimerWarning = remainingSec <= TIMER_WARNING_THRESHOLD_SEC;
  const timerColor = isTimerWarning
    ? SORTER_UI_COLORS.danger
    : SORTER_UI_COLORS.accent;

  return (
    <>
      {/* === 上段: タイトル / 現在スコア（大）/ 残り時間タイマー === */}
      <div className="z-10 px-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-xl border-[4px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000]">
          <h1
            className="hidden shrink-0 text-base font-black tracking-widest sm:block sm:text-lg"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            仕分けゲーム
          </h1>

          {/* 現在スコア（大）+ 目標値（小）。数値を主役にして分かりやすく見せる */}
          <div className="flex flex-1 items-baseline justify-center gap-1">
            <span
              className="text-xs font-black tracking-wider text-black/45"
              aria-hidden
            >
              SCORE
            </span>
            <span
              className="text-3xl leading-none font-black tabular-nums sm:text-4xl"
              style={{ color: SORTER_UI_COLORS.accent }}
              aria-label={`現在スコア ${displayScore} 点。目標 ${TARGET_SCORE} 点`}
            >
              {displayScore}
            </span>
            <span className="text-sm font-black text-black/40 tabular-nums sm:text-base">
              / {TARGET_SCORE}
            </span>
          </div>

          {/* 残り時間タイマー（数値 + 横ゲージ）。残りわずかで danger 色に */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className="text-xl leading-none font-black tabular-nums sm:text-2xl"
              style={{ color: timerColor }}
              aria-label={`残り時間 ${remainingSec} 秒`}
            >
              {remainingSec}
              <span className="ml-0.5 text-xs font-bold">s</span>
            </span>
            <div
              className="h-2 w-20 overflow-hidden rounded-full border-[2px] border-black bg-gray-200 sm:w-28"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={Math.round(TIME_CAP_MS / 1000)}
              aria-valuenow={remainingSec}
              aria-label="残り時間ゲージ"
            >
              <motion.div
                className="h-full origin-right"
                style={{ backgroundColor: timerColor }}
                animate={{ width: `${remainingPct}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
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
