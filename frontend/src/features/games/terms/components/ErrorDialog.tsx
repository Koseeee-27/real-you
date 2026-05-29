'use client';

import type { FC } from 'react';
import { motion } from 'framer-motion';

interface ErrorDialogProps {
  message: string;
  /** OK ボタン押下（ダイアログを閉じる） */
  onConfirm: () => void;
  /** ダイアログ本体（OK ボタン以外）のクリック。エラー差し戻し時の 'errorDialog' 計測に使う（任意） */
  onDialogClick?: () => void;
  /** オーバーレイ背景のクリック。エラー差し戻し時の 'other' 計測に使う（任意） */
  onOverlayClick?: () => void;
}

// real-you 共通のネオブルータリズム調ボタン（SlideModal の NEO_FOOTER_BUTTON_BASE と同調）
const NEO_BUTTON =
  'rounded-xl border-[3px] border-black bg-[#ffd54a] px-8 py-2 text-sm font-black text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:py-3 sm:text-base';

/**
 * 規約同意フローの差し戻し / 案内ダイアログ。2 つの用途で再利用する。
 *
 * - エラー差し戻し: 第5条「読みました」未チェックのまま同意ボタンを押下した際に表示。
 *   エラー後のクリック行動（連打・無関係操作）を計測するため、オーバーレイ背景／
 *   ダイアログ本体／OK ボタンのクリックを別経路（onOverlayClick / onDialogClick）で通知する。
 * - 同意要求: 「同意しない」押下時に同意を促す案内。計測は不要なので onConfirm のみ渡す。
 *
 * 見た目は real-you 全体のトーン（ネオブルータリズム + 丸ゴシック）に統一しつつ、
 * 差し戻しのストレスを和らげるため赤いアラート調ではなくヒント調（黄色バッジ）にしている。
 * 差し戻しの発火そのものは維持しており、エラー計測（論理性・冷静さ）には影響しない。
 */
const ErrorDialog: FC<ErrorDialogProps> = ({
  message,
  onConfirm,
  onDialogClick,
  onOverlayClick,
}) => {
  return (
    <motion.div
      // PopupTerms(z-50) / PopupAd(z-60) より前面に出す
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onOverlayClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
    >
      <motion.div
        className="mx-4 w-full max-w-sm rounded-3xl border-[4px] border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => {
          // オーバーレイ背景の 'other' 計測に伝播させない
          e.stopPropagation();
          onDialogClick?.();
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        {/* ストレスを和らげるためのヒント調バッジ（赤アラートにしない） */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-[#ffd54a] text-2xl shadow-[2px_2px_0_0_#000]">
          💡
        </div>
        <p className="text-center text-base font-black text-black sm:text-lg">
          {message}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            onClick={(e) => {
              // ダイアログ本体の 'errorDialog' 計測と二重計上しないよう伝播を止める
              e.stopPropagation();
              onConfirm();
            }}
            className={NEO_BUTTON}
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ErrorDialog;
