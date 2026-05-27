'use client';

import { motion } from 'framer-motion';
import Spinner from '@/components/ui/Spinner';
import { SORTER_UI_COLORS } from '../data/sorterConstants';
import type { GameOutcome } from '../hooks/useSorterGame';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

interface SorterResultOverlayProps {
  /** 提出状態。'error' のときは別途 `ErrorScreen` を表示するため、ここでは描画しない */
  submitStatus: SubmitStatus;
  /** 勝敗結果。成功 / 失敗の表示出し分けに使う */
  outcome: GameOutcome;
  /** 「次のゲームへ ▶」ボタン押下時のコールバック */
  onProceedToNext: () => void;
}

/**
 * ゲーム終了後の結果画面オーバーレイ。
 *
 * 表示は **成功 / 失敗のみ**（最終スコア数値や内訳カードは出さない）。
 * 理由: 本アプリの主目的は性格診断であり、収集データの詳細フィードバックは
 * 最終結果画面で行う。ゲーム単体の結果表示は最小限に留める。
 *
 * - 送信中: Spinner
 * - 送信成功: 「次のゲームへ ▶」ボタン
 * - 送信失敗時はこのコンポーネントは描画されない（親側で ErrorScreen に切替）
 */
export default function SorterResultOverlay({
  submitStatus,
  outcome,
  onProceedToNext,
}: SorterResultOverlayProps) {
  // submitStatus が 'error' のときは描画しない（親側で ErrorScreen を表示）
  if (submitStatus === 'error') return null;

  const isSuccess = outcome === 'success';
  // outcome が null（理論上 ended では確定済みだが保険）の場合も失敗表示にフォールバック
  const title = isSuccess ? '仕分け成功！' : '仕分け失敗…';
  const subtitle = isSuccess
    ? '目標スコアに到達しました'
    : '時間内に目標スコアへ届きませんでした';
  const accentColor = isSuccess
    ? SORTER_UI_COLORS.success
    : SORTER_UI_COLORS.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <motion.div
        // モーダルセマンティクス: dialog + aria-modal で「全画面モーダル」を支援技術に伝え、
        // labelledby / describedby で見出し（title）と副題（subtitle）を関連付けて
        // スクリーンリーダーに文脈を提供する。
        role="dialog"
        aria-modal="true"
        aria-labelledby="sorter-result-title"
        aria-describedby="sorter-result-subtitle"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border-[6px] border-black bg-white p-6 text-center shadow-[8px_8px_0_0_#000] sm:p-8"
      >
        <h2
          id="sorter-result-title"
          className="text-3xl font-black tracking-widest sm:text-4xl"
          style={{ color: accentColor }}
        >
          {title}
        </h2>
        <p
          id="sorter-result-subtitle"
          className="mt-3 text-sm font-bold text-black/70 sm:text-base"
        >
          {subtitle}
        </p>

        {/* アクション領域 */}
        <div className="mt-8 flex min-h-[60px] items-center justify-center">
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
