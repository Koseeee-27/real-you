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
 * 円形リングタイマーの SVG 寸法（px）。
 * RADIUS は線幅を内側に収めるため (SIZE/2 - STROKE/2) で算出する。
 */
const RING_SIZE_PX = 56;
const RING_STROKE_PX = 7;
const RING_RADIUS_PX = RING_SIZE_PX / 2 - RING_STROKE_PX / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS_PX;

/**
 * ゲーム画面上部の HUD（Heads-Up Display）。
 *
 * - 上段（厚め）: タイトル / 現在スコア（大、目標併記）/ 円形リングのカウントダウンタイマー
 * - 下段: 状態バッジ帯（機械停止中 / ルール変更中 / スピード 2 倍）を幅広・大きめに表示
 *
 * 勝敗の主軸は「目標スコア到達」だが、playtest で進捗バーより数値の方が分かりやすいと
 * 判定されたため、現在スコアを大きく数値表示し目標値を小さく併記する。
 * 上限時間は円形リングで残り割合（remainingTimeMs / TIME_CAP_MS）を見せ、中央に残り秒数を出す。
 * 残りが TIMER_WARNING_THRESHOLD_SEC 秒以下になると数値・リングとも danger 色になり、
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
  // 残り時間の割合（0–1）。リングの strokeDashoffset 算出に使う。
  // remainingTimeMs / TIME_CAP_MS をそのまま割合として扱う。
  const remainingFraction = Math.max(
    0,
    Math.min(1, (TIME_CAP_MS - elapsedTimeMs) / TIME_CAP_MS)
  );
  // リングの欠け量。残りが減るほど offset が増え、リングが時計回りに減っていく。
  const ringOffset = RING_CIRCUMFERENCE * (1 - remainingFraction);
  // 残りわずか → 警告色に切替（数値・リング共通）。
  const isTimerWarning = remainingSec <= TIMER_WARNING_THRESHOLD_SEC;
  const timerColor = isTimerWarning
    ? SORTER_UI_COLORS.danger
    : SORTER_UI_COLORS.accent;

  return (
    <>
      {/* === 上段（厚め）: タイトル / 現在スコア（大）/ 円形リングタイマー === */}
      <div className="z-10 px-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-2xl border-[5px] border-black bg-white px-5 py-3 shadow-[5px_5px_0_0_#000] sm:gap-4 sm:px-6 sm:py-4">
          <h1
            className="hidden shrink-0 text-lg font-black tracking-widest sm:block sm:text-2xl"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            仕分けゲーム
          </h1>

          {/* 現在スコア（大）+ 目標値（小）。数値を主役にして分かりやすく見せる */}
          <div className="flex flex-1 items-baseline justify-center gap-1.5">
            <span
              className="text-sm font-black tracking-wider text-black/45"
              aria-hidden
            >
              SCORE
            </span>
            <span
              className="text-5xl leading-none font-black tabular-nums sm:text-6xl"
              style={{ color: SORTER_UI_COLORS.accent }}
              aria-label={`現在スコア ${displayScore} 点。目標 ${TARGET_SCORE} 点`}
            >
              {displayScore}
            </span>
            <span className="text-lg font-black text-black/40 tabular-nums sm:text-xl">
              / {TARGET_SCORE}
            </span>
          </div>

          {/* 残り時間タイマー（円形リング + 中央に残り秒数）。残りわずかで danger 色に */}
          <div
            className="relative shrink-0"
            style={{ width: RING_SIZE_PX, height: RING_SIZE_PX }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={Math.round(TIME_CAP_MS / 1000)}
            aria-valuenow={remainingSec}
            aria-label={`残り時間 ${remainingSec} 秒`}
          >
            <svg
              width={RING_SIZE_PX}
              height={RING_SIZE_PX}
              viewBox={`0 0 ${RING_SIZE_PX} ${RING_SIZE_PX}`}
              // 12 時方向から始めて時計回りに減らすため -90deg 回転
              className="-rotate-90"
              aria-hidden
            >
              {/* 背景トラック */}
              <circle
                cx={RING_SIZE_PX / 2}
                cy={RING_SIZE_PX / 2}
                r={RING_RADIUS_PX}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={RING_STROKE_PX}
              />
              {/* 進捗リング（残り割合）。strokeDashoffset を 100ms tick ごとに補間して滑らかに見せる */}
              <motion.circle
                cx={RING_SIZE_PX / 2}
                cy={RING_SIZE_PX / 2}
                r={RING_RADIUS_PX}
                fill="none"
                stroke={timerColor}
                strokeWidth={RING_STROKE_PX}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </svg>
            {/* 中央の残り秒数 */}
            <span
              className="absolute inset-0 flex items-center justify-center text-base font-black tabular-nums sm:text-lg"
              style={{ color: timerColor }}
              aria-hidden
            >
              {remainingSec}
            </span>
          </div>
        </div>
      </div>

      {/* === 下段: 状態バッジ帯（幅広・大きめ） === */}
      <div className="z-10 mt-2 px-4">
        <div className="mx-auto flex w-full max-w-4xl min-h-[40px] items-center justify-center gap-2 sm:gap-3">
          {isFrozen && (
            <span
              className="inline-flex w-full max-w-md items-center justify-center rounded-xl border-[4px] border-black px-4 py-1.5 text-base font-black tracking-wider text-black shadow-[3px_3px_0_0_#000] sm:text-lg"
              style={{ backgroundColor: SORTER_UI_COLORS.warning }}
            >
              ✗ 機械停止中
            </span>
          )}
          {!isFrozen && isRuleChanged && (
            <span
              className="inline-flex w-full max-w-md items-center justify-center rounded-xl border-[4px] border-black px-4 py-1.5 text-base font-black tracking-wider text-black shadow-[3px_3px_0_0_#000] sm:text-lg"
              style={{ backgroundColor: SORTER_UI_COLORS.warning }}
            >
              ルール変更中: 特急 → 重量物
            </span>
          )}
          {!isFrozen && isSpeedUp && (
            <span
              className="inline-flex w-full max-w-xs items-center justify-center rounded-xl border-[4px] border-black px-4 py-1.5 text-base font-black tracking-wider text-white shadow-[3px_3px_0_0_#000] sm:text-lg"
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
