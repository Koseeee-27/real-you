'use client';

import TermsContent from './TermsContent';
import type { FC } from 'react';
import { motion } from 'framer-motion';

interface PopupTermsProps {
  onCheckboxChange: (
    key: 'readConfirm' | 'mailMagazine' | 'thirdPartyShare',
    checked: boolean
  ) => void;
  onHiddenInputChange: (value: string) => void;
  checkboxStates: Record<
    'readConfirm' | 'mailMagazine' | 'thirdPartyShare',
    boolean
  >;
  hiddenInputValue: string;
  setScrollContainerRef?: (el: HTMLDivElement | null) => void;
  onScroll?: () => void;
  onAction?: (action: 'agree' | 'disagree') => void;
  onAgreeHoverStart?: () => void;
}

// real-you 共通のネオブルータリズム調ボタン（SlideModal / ErrorDialog と同調）。
// 色（bg/text）は各ボタンで上書きする前提で、押下感まわりだけ共通化する。
const NEO_BUTTON_BASE =
  'rounded-xl border-[3px] border-black py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000]';

const PopupTerms: FC<PopupTermsProps> = ({
  onCheckboxChange,
  onHiddenInputChange,
  checkboxStates,
  hiddenInputValue,
  setScrollContainerRef,
  onScroll,
  onAction,
  onAgreeHoverStart,
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
    >
      <motion.div
        className="relative mx-4 w-full max-w-3xl rounded-3xl border-[4px] border-black bg-white p-6 shadow-[6px_6px_0_0_#000]"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        {/* スクロール領域 */}
        <div
          ref={(el) => {
            if (setScrollContainerRef)
              setScrollContainerRef(el as HTMLDivElement | null);
          }}
          onScroll={() => {
            if (onScroll) onScroll();
          }}
          className="mt-2 max-h-[70vh] overflow-y-auto px-2"
        >
          <TermsContent
            onCheckboxChange={onCheckboxChange}
            onHiddenInputChange={onHiddenInputChange}
            checkboxStates={checkboxStates}
            hiddenInputValue={hiddenInputValue}
          />
        </div>

        {/* アクションボタン領域 */}
        <div className="mt-2 border-t-2 border-black/10 bg-white px-4 pt-4">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3">
            <button
              onClick={() => onAction && onAction('disagree')}
              className={`${NEO_BUTTON_BASE} bg-white px-6 text-black`}
            >
              同意しない
            </button>
            <button
              onClick={() => onAction && onAction('agree')}
              onMouseEnter={() => onAgreeHoverStart && onAgreeHoverStart()}
              className={`${NEO_BUTTON_BASE} bg-red-500 px-8 text-white`}
            >
              同意する
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PopupTerms;
