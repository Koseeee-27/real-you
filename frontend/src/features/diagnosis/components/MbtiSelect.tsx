'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { mbtiAtom, diagnosisStepAtom } from '@/stores/diagnosis';
import { MBTI_TYPES, MBTI_GROUPS, type MbtiType } from '@/constants/mbti';

// タブとカードで同じ色を使用（ジャンルごと）
const GROUP_COLORS = [
  'bg-[#e8d5e8]',   // 分析家 - light purple
  'bg-[#7eb8c9]',   // 外交官 - teal
  'bg-[#87ceeb]',   // 番人 - light blue
  'bg-[#f5d89a]',   // 探検家 - light orange
] as const;

function getTypesByGroup(group: string): MbtiType[] {
  return MBTI_TYPES.filter((t) => t.group === group);
}

export default function MbtiSelect() {
  const setMbti = useSetAtom(mbtiAtom);
  const setStep = useSetAtom(diagnosisStepAtom);
  const [groupIndex, setGroupIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [transitionVia, setTransitionVia] = useState<'tab' | 'arrow-left' | 'arrow-right'>('tab');

  const currentGroup = MBTI_GROUPS[groupIndex];
  const currentTypes = getTypesByGroup(currentGroup);
  const selectedType = selected ? MBTI_TYPES.find((t) => t.code === selected) : null;

  const handleTabClick = useCallback((index: number) => {
    if (index === groupIndex) return;
    setTransitionVia('tab');
    setGroupIndex(index);
    setSelected(null);
  }, [groupIndex]);

  const handleArrowPrev = useCallback(() => {
    setTransitionVia('arrow-right'); // コンテンツは右から入る
    setGroupIndex((i) => (i - 1 + MBTI_GROUPS.length) % MBTI_GROUPS.length);
    setSelected(null);
  }, []);

  const handleArrowNext = useCallback(() => {
    setTransitionVia('arrow-left'); // コンテンツは左から入る
    setGroupIndex((i) => (i + 1) % MBTI_GROUPS.length);
    setSelected(null);
  }, []);

  const handleSubmit = () => {
    if (!selected) return;
    setMbti(selected);
    setStep('quiz');
  };

  const handleSkip = () => {
    setMbti(null);
    setStep('quiz');
  };

  const getContentVariants = () => {
    if (transitionVia === 'tab') {
      return {
        enter: { opacity: 0 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0 },
      };
    }
    if (transitionVia === 'arrow-left') {
      return {
        enter: { opacity: 0, x: 80 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -80 },
      };
    }
    return {
      enter: { opacity: 0, x: -80 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 80 },
    };
  };

  const contentVariants = getContentVariants();

  return (
    <div className="relative flex min-h-0 w-full max-w-8xl flex-1 flex-col items-center pt-6 pb-8">
      {/* わからないボタン - 右上 */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-4 top-4 rounded-lg border-2 border-gray-800 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
      >
        わからない
      </button>

      {/* メインカード + タブ - 縦方向に伸ばす */}
      <div className="flex min-h-0 w-full flex-1 flex-col px-4">
        {/* 4ジャンルタブ - 各タブは常に自分の色、選択中は沈む表現 */}
        <div className="flex justify-center gap-0">
          {MBTI_GROUPS.map((group, index) => (
            <motion.button
              key={group}
              type="button"
              onClick={() => handleTabClick(index)}
              className={`relative z-10 rounded-t-lg border-2 border-b-0 border-gray-800 px-4 py-2 text-sm font-semibold text-gray-800 ${
                GROUP_COLORS[index]
              } ${groupIndex === index ? 'mb-[-2px]' : ''}`}
              animate={{
                y: groupIndex === index ? 2 : 0,
                boxShadow: groupIndex === index
                  ? 'inset 0 3px 6px rgba(0,0,0,0.12)'
                  : 'none',
              }}
              transition={{ duration: 0.2 }}
            >
              {group}
            </motion.button>
          ))}
        </div>

        {/* カード本体 - 残りの高さを占有 */}
        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg rounded-tl-none border-2 border-gray-800 shadow-lg ${GROUP_COLORS[groupIndex]}`}
        >
          <p className="shrink-0 pt-4 pb-2 text-center text-lg font-bold text-gray-900">
            MBTIを選んでね
          </p>

          {/* キャラ表示エリア + 左右矢印 - 高さは最大で抑える */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-2">
            <button
              type="button"
              onClick={handleArrowPrev}
              aria-label="前のジャンル"
              className="absolute left-2 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-800 bg-white text-gray-800 transition hover:bg-gray-100"
            >
              <span className="text-xl leading-none">‹</span>
            </button>

            <div className="relative flex min-h-72 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={groupIndex}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  variants={contentVariants}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex items-center justify-center gap-2"
                >
                  <div className="flex h-full w-full items-stretch justify-center gap-3 rounded-lg border-2 border-gray-800 bg-white px-2 py-2">
                    {currentTypes.map((type) => (
                      <motion.button
                        key={type.code}
                        type="button"
                        onClick={() => setSelected(type.code)}
                        className="relative flex flex-1 basis-0 flex-col items-center justify-start overflow-hidden rounded-md border border-gray-200 bg-white"
                        whileHover={{
                          scale: 1.1,
                          y: -8,
                          boxShadow:
                            '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                          transition: { duration: 0.2 },
                        }}
                        whileTap={{ scale: 1.02 }}
                        style={{
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      >
                        <div className="shrink-0 pt-1 text-center">
                          <p className="text-xs font-bold text-gray-800">
                            {type.code}
                          </p>
                          <p className="text-[10px] text-gray-600">
                            {type.name}
                          </p>
                        </div>
                        <div className="flex min-h-0 flex-1 items-center justify-center">
                          <img
                            src={`/images/mbti/${type.code}.png`}
                            alt={type.name}
                            className="max-h-40 w-auto object-contain"
                          />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleArrowNext}
              aria-label="次のジャンル"
              className="absolute right-2 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-800 bg-white text-gray-800 transition hover:bg-gray-100"
            >
              <span className="text-xl leading-none">›</span>
            </button>
          </div>

          {/* 選択中タイプ表示 */}
          <p className="shrink-0 pb-4 text-center text-base font-bold text-gray-900">
            {selectedType
              ? `${selectedType.code} / ${selectedType.name}`
              : 'タイプを選んでね'}
          </p>
        </div>

        {/* 次へボタン */}
        <div className="mt-6 flex shrink-0 justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
