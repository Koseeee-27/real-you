'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { VolumeControl } from '@/components/audio/VolumeControl';

type VolumeModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * 「おと」ボタンから開く音量設定モーダル。
 * オーバーレイのクリック / 「とじる」で閉じる。中身は共通の VolumeControl。
 */
export default function VolumeModal({ open, onClose }: VolumeModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="おとのせってい"
        >
          <motion.div
            className="relative w-[420px] max-w-full rounded-[32px] border-4 border-gray-800 bg-white px-8 pt-12 pb-7 shadow-[0_8px_0_#1f2937]"
            initial={{ scale: 0.9, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* タイトル pill（カード上端にかぶせる） */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="rounded-full border-4 border-gray-800 bg-[#FFD77B] px-8 py-2 shadow-[0_4px_0_#1f2937]">
                <p className="text-xl font-black whitespace-nowrap text-gray-900">
                  おとのせってい
                </p>
              </div>
            </div>

            <div className="mb-7">
              <VolumeControl />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full cursor-pointer rounded-2xl border-[3px] border-gray-800 bg-rose-300 py-3.5 text-base font-black text-gray-900 shadow-[0_4px_0_#1f2937] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              とじる
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
