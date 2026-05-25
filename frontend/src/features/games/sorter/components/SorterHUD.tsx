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
  /** 経過時間（ms）。上限 TIME_CAP_MS に対する控えめタイマー表示に使う */
  elapsedTimeMs: number;
  /** 機械停止中か（最優先で「機械停止中」バッジを表示） */
  isFrozen: boolean;
  /** ルール変更中か（凍結中以外で表示） */
  isRuleChanged: boolean;
  /** 速度上昇中か（凍結中以外で表示） */
  isSpeedUp: boolean;
}

/**
 * ゲーム画面上部の HUD（Heads-Up Display）。
 *
 * - 上段: タイトル / 目標スコア進捗バー（0 → TARGET_SCORE）/ SCORE 値 + 上限タイマー（控えめ）
 * - 下段: 状態バッジ列（機械停止中 / ルール変更中 / スピード 2 倍）
 *
 * 勝敗の主軸は「目標スコア到達」なので、HUD の主役は進捗バー。上限 60 秒タイマーは
 * 右端に控えめな秒数表示として添えるに留める（playtest で見せ方を調整）。
 * バッジは優先度に応じて「機械停止中」表示時は他を抑制する。
 */
export default function SorterHUD({
  displayScore,
  elapsedTimeMs,
  isFrozen,
  isRuleChanged,
  isSpeedUp,
}: SorterHUDProps) {
  // 進捗率（0–100%）。displayScore は下限 0 で TARGET_SCORE 到達時に終了するため 0..100 に収まる。
  const progressPct = Math.min(100, (displayScore / TARGET_SCORE) * 100);
  // 上限タイマーの残り秒（控えめ表示用）。経過が上限を超えても 0 で止める。
  const remainingSec = Math.max(
    0,
    Math.ceil((TIME_CAP_MS - elapsedTimeMs) / 1000)
  );

  return (
    <>
      {/* === 上段: タイトル / 目標スコア進捗バー / SCORE + 上限タイマー === */}
      <div className="z-10 px-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 rounded-xl border-[4px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000]">
          <h1
            className="shrink-0 text-base font-black tracking-widest sm:text-lg"
            style={{ color: SORTER_UI_COLORS.accent }}
          >
            仕分けゲーム
          </h1>

          {/* 目標スコア進捗バー（0 → TARGET_SCORE） */}
          <div className="flex flex-1 items-center gap-2">
            <div
              className="relative h-4 flex-1 overflow-hidden rounded-full border-[3px] border-black bg-gray-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TARGET_SCORE}
              aria-valuenow={Math.min(TARGET_SCORE, displayScore)}
              aria-label={`目標スコア ${TARGET_SCORE} 点までの進捗`}
            >
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ backgroundColor: SORTER_UI_COLORS.success }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            </div>
            <span
              className="shrink-0 text-base font-black tabular-nums sm:text-lg"
              style={{ color: SORTER_UI_COLORS.accent }}
            >
              {displayScore}
              <span className="text-xs text-black/50">/{TARGET_SCORE}</span>
            </span>
          </div>

          {/* 上限タイマー（控えめ表示。勝敗主軸ではないので小さく添える） */}
          <span
            className="shrink-0 text-xs font-bold tabular-nums text-black/45 sm:text-sm"
            aria-label={`残り時間 ${remainingSec} 秒`}
          >
            {remainingSec}s
          </span>
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
