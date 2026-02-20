'use client';

import { useRef, useCallback } from 'react';

interface PopupAdProps {
  onClose: (clickCount: number, timeToClose: number) => void;
  appearedAt: number;
}

export default function PopupAd({ onClose, appearedAt }: PopupAdProps) {
  const clickCountRef = useRef(0);

  const handleOverlayClick = useCallback(() => {
    clickCountRef.current += 1;
  }, []);

  const handleClose = useCallback(() => {
    clickCountRef.current += 1;
    const timeToClose = Date.now() - appearedAt;
    onClose(clickCountRef.current, timeToClose);
  }, [onClose, appearedAt]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-80 rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="pt-4 text-center">
          <p className="text-lg font-bold text-red-500">期間限定キャンペーン!</p>
          <p className="mt-2 text-sm text-gray-600">
            今なら初月無料！プレミアムプランにアップグレードしませんか？
          </p>
          <div className="mt-4 space-y-2">
            <button className="w-full rounded bg-red-500 px-4 py-2 text-sm font-bold text-white">
              詳しく見る
            </button>
            <p className="text-xs text-gray-400">
              ×ボタンで閉じることができます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
