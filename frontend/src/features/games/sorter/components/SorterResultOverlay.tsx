'use client';

import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import type { SorterGameData } from '@/features/games/types';
import { SORTER_UI_COLORS } from '../data/sorterConstants';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface SorterResultOverlayProps {
  /** 提出状態。'error' のときは別途 `ErrorScreen` を表示するため、ここでは描画しない */
  submitStatus: SubmitStatus;
  /** プレイ画面表示用の最終スコア */
  finalScore: number;
  /** 提出済みのゲームデータ。仕分け内訳の表示に使う。null なら内訳を出さない */
  pendingData: SorterGameData | null;
  /** 「次のゲームへ ▶」ボタン押下時のコールバック */
  onProceedToNext: () => void;
}

/**
 * ゲーム終了後の結果画面オーバーレイ。
 *
 * - 送信中: Spinner
 * - 送信成功: 「次のゲームへ ▶」ボタン
 * - 送信失敗時はこのコンポーネントは描画されない（親側で ErrorScreen に切替）
 *
 * 内訳カード（正解 / 失敗 / 流出）は `pendingData` から派生して表示。
 */
export default function SorterResultOverlay({
  submitStatus,
  finalScore,
  pendingData,
  onProceedToNext,
}: SorterResultOverlayProps) {
  // submitStatus が 'error' のときは描画しない（親側で ErrorScreen を表示）
  if (submitStatus === 'error') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border-[6px] border-black bg-white p-6 shadow-[8px_8px_0_0_#000] sm:p-8"
      >
        <h2
          className="text-center text-3xl font-black tracking-widest sm:text-4xl"
          style={{ color: SORTER_UI_COLORS.accent }}
        >
          仕分け完了！
        </h2>

        {/* SCORE カード */}
        <div
          className="mt-6 rounded-2xl border-[5px] border-black py-4 text-center shadow-[5px_5px_0_0_#000]"
          style={{ backgroundColor: SORTER_UI_COLORS.warning }}
        >
          <p className="text-xs font-black tracking-widest text-black/70 sm:text-sm">
            FINAL SCORE
          </p>
          <p className="text-6xl font-black text-black sm:text-7xl">
            {finalScore}
          </p>
        </div>

        {/* 仕分け内訳 */}
        {pendingData && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard
              label="正解"
              value={
                pendingData.events.filter(
                  (e) => e.eventType === 'sort' && e.correct
                ).length
              }
              color={SORTER_UI_COLORS.success}
            />
            <StatCard
              label="失敗"
              value={pendingData.wrongSortCount}
              color={SORTER_UI_COLORS.danger}
            />
            <StatCard
              label="流出"
              value={pendingData.outflowMissCount}
              color={SORTER_UI_COLORS.accent}
            />
          </div>
        )}

        {/* アクション領域 */}
        <div className="mt-6 flex min-h-[60px] items-center justify-center">
          {submitStatus === 'loading' && <Spinner message="送信中..." />}
          {submitStatus === 'success' && (
            <motion.button
              type="button"
              onClick={onProceedToNext}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="w-full rounded-2xl border-[5px] border-black py-4 text-lg font-black tracking-widest text-black shadow-[5px_5px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#000] active:translate-y-1 active:shadow-[2px_2px_0_0_#000] sm:text-xl"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              次のゲームへ ▶
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * 結果画面の仕分け内訳カード（正解 / 失敗 / 流出）。
 * neo-brutalism スタイル（黒枠 + オフセット影）で統一。
 */
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border-[3px] border-black bg-white py-2 text-center shadow-[3px_3px_0_0_#000]">
      <p className="text-xs font-black tracking-widest text-black/60">
        {label}
      </p>
      <p
        className="text-2xl font-black sm:text-3xl"
        style={{ color }}
        aria-label={`${label} ${value} 回`}
      >
        {value}
      </p>
    </div>
  );
}
