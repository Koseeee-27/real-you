'use client';

import type { FC } from 'react';

interface ErrorDialogProps {
  message: string;
  /** OK ボタン押下（ダイアログを閉じる）。'errorDialog' クリックとして計測される */
  onConfirm: () => void;
  /** ダイアログ本体（OK ボタン以外）のクリック。'errorDialog' として計測される */
  onDialogClick: () => void;
  /** オーバーレイ背景のクリック。'other'（焦って画面外を触る行動）として計測される */
  onOverlayClick: () => void;
}

/**
 * 二段構え同意プロセスの 2 段目で表示するエラー差し戻しダイアログ。
 *
 * 第5条「読みました」未チェックのまま同意ボタンを押下した際に表示する。
 * エラー後のクリック行動（連打・無関係操作）を計測するため、
 * オーバーレイ背景／ダイアログ本体／OK ボタンのクリックを別経路で親に通知する。
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
          onDialogClick();
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
