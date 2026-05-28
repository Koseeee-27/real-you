'use client';

import type { FC } from 'react';

interface ErrorDialogProps {
  message: string;
  /** OK ボタン押下（ダイアログを閉じる） */
  onConfirm: () => void;
  /** ダイアログ本体（OK ボタン以外）のクリック。エラー差し戻し時の 'errorDialog' 計測に使う（任意） */
  onDialogClick?: () => void;
  /** オーバーレイ背景のクリック。エラー差し戻し時の 'other' 計測に使う（任意） */
  onOverlayClick?: () => void;
}

/**
 * 規約同意フローの差し戻し / 案内ダイアログ。2 つの用途で再利用する。
 *
 * - エラー差し戻し: 第5条「読みました」未チェックのまま同意ボタンを押下した際に表示。
 *   エラー後のクリック行動（連打・無関係操作）を計測するため、オーバーレイ背景／
 *   ダイアログ本体／OK ボタンのクリックを別経路（onOverlayClick / onDialogClick）で通知する。
 * - 同意要求: 「同意しない」押下時に同意を促す案内。計測は不要なので onConfirm のみ渡す。
 */
const ErrorDialog: FC<ErrorDialogProps> = ({
  message,
  onConfirm,
  onDialogClick,
  onOverlayClick,
}) => {
  return (
    <div
      // PopupTerms(z-50) / PopupAd(z-60) より前面に出す
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onOverlayClick}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => {
          // オーバーレイ背景の 'other' 計測に伝播させない
          e.stopPropagation();
          onDialogClick?.();
        }}
      >
        <p className="text-center text-base font-bold text-gray-800">
          {message}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            onClick={(e) => {
              // ダイアログ本体の 'errorDialog' 計測と二重計上しないよう伝播を止める
              e.stopPropagation();
              onConfirm();
            }}
            className="rounded bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;
