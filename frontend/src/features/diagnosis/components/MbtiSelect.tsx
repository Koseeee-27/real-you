'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetAtom } from 'jotai';
import { mbtiAtom, diagnosisStepAtom } from '@/stores/diagnosis';
import { MBTI_TYPES, MBTI_GROUPS, type MbtiType } from '@/constants/mbti';
import { useSe } from '@/components/audio/useSe';

// タブ・カード・モーダルで共有するジャンル色（分析家 / 外交官 / 番人 / 探検家）
const GROUP_COLORS = [
  'bg-[#E5A1F4]', // 分析家
  'bg-[#89F1C8]', // 外交官
  'bg-[#8EE3FA]', // 番人
  'bg-[#FFD77B]', // 探検家
] as const;

// キャラカード背景のグラデーション（白 → ジャンルの淡色）
const GROUP_CARD_GRADIENT = [
  'linear-gradient(120deg, #ffffff 52%, #f3d2ff 100%)', // 分析家
  'linear-gradient(120deg, #ffffff 52%, #c8f8e2 100%)', // 外交官
  'linear-gradient(120deg, #ffffff 52%, #c8effc 100%)', // 番人
  'linear-gradient(120deg, #ffffff 52%, #ffe9b8 100%)', // 探検家
] as const;

function getTypesByGroup(group: string): MbtiType[] {
  return MBTI_TYPES.filter((t) => t.group === group);
}

export default function MbtiSelect() {
  const setMbti = useSetAtom(mbtiAtom);
  const setStep = useSetAtom(diagnosisStepAtom);
  const [groupIndex, setGroupIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const playSe = useSe();

  const currentGroup = MBTI_GROUPS[groupIndex];
  const currentTypes = getTypesByGroup(currentGroup);
  const selectedType = selected
    ? MBTI_TYPES.find((t) => t.code === selected)
    : null;

  const handleTabClick = (index: number) => {
    if (index === groupIndex) return;
    setGroupIndex(index);
    setSelected(null);
    playSe('buttonClick');
  };

  const handleSelectType = (code: string) => {
    setSelected(code);
    playSe('buttonClick');
  };

  const handleReselect = () => {
    playSe('buttonClick');
    setSelected(null);
  };

  const handleConfirm = () => {
    playSe('buttonClick');
    if (!selected) return;
    setMbti(selected);
    setStep('quiz');
  };

  const openSkip = () => {
    playSe('buttonClick');
    setSkipModalOpen(true);
  };

  const cancelSkip = () => {
    playSe('buttonClick');
    setSkipModalOpen(false);
  };

  const confirmSkip = () => {
    playSe('buttonClick');
    setMbti(null);
    setStep('quiz');
  };

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-3.5 py-2">
      {/* ページタイトル（白 pill バナー・カード外） */}
      <h1 className="shrink-0 rounded-full border-4 border-gray-800 bg-white px-11 py-3 text-center text-3xl font-black text-gray-800 shadow-[0_4px_0_#1f2937]">
        あなたのMBTIを選んでね！
      </h1>

      {/* ステージ: タブ + カード */}
      <div className="flex max-h-[800px] w-full max-w-[1280px] min-h-0 flex-1 flex-col">
        {/* 4ジャンルタブ（横幅4等分） */}
        <div className="relative z-10 grid grid-cols-4 gap-1 -mb-1">
          {MBTI_GROUPS.map((group, index) => {
            const active = groupIndex === index;
            return (
              <button
                key={group}
                type="button"
                onClick={() => handleTabClick(index)}
                className={`cursor-pointer rounded-t-2xl border-4 border-b-0 border-gray-800 py-3.5 text-lg font-extrabold text-gray-800 transition-transform duration-200 ${
                  GROUP_COLORS[index]
                } ${
                  active
                    ? 'translate-y-1 shadow-[inset_0_3px_6px_rgba(0,0,0,0.12)]'
                    : 'brightness-[1.08] saturate-[0.82] hover:-translate-y-0.5 hover:brightness-100 hover:saturate-100'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>

        {/* カード本体 */}
        <div
          className={`flex min-h-0 flex-1 flex-col rounded-b-[32px] border-4 border-gray-800 px-8 pt-[22px] pb-[26px] ${GROUP_COLORS[groupIndex]}`}
        >
          {/* ジャンル名 + わからないボタン */}
          <div className="mb-3.5 flex items-center justify-between">
            <p className="text-3xl font-black leading-none text-gray-900">
              {currentGroup}
            </p>
            <button
              type="button"
              onClick={openSkip}
              className="shrink-0 cursor-pointer rounded-xl border-[3px] border-gray-800 bg-white px-[18px] py-[9px] text-sm font-extrabold text-gray-800 shadow-[0_3px_0_#1f2937] transition-transform duration-150 hover:-translate-y-0.5"
            >
              わからない
            </button>
          </div>

          {/* キャラ表示エリア（白枠内 2×2 グリッド） */}
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border-[3px] border-gray-800 bg-white p-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={groupIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4"
              >
                {currentTypes.map((type) => (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => handleSelectType(type.code)}
                    style={{ background: GROUP_CARD_GRADIENT[groupIndex] }}
                    className="grid min-h-0 cursor-pointer grid-cols-[1fr_auto] items-center gap-3 overflow-hidden rounded-[20px] border-[3px] border-gray-800 py-2 pr-7 pl-2 transition-[transform,box-shadow] duration-200 hover:-translate-y-[5px] hover:scale-[1.02] hover:shadow-[0_8px_0_#1f2937]"
                  >
                    {/* イラスト（下揃え + 影） */}
                    <div className="relative flex h-full min-h-0 items-end justify-center">
                      <div className="absolute bottom-1 left-1/2 h-3 w-[70%] -translate-x-1/2 rounded-[50%] bg-gray-800/15 blur-[4px]" />
                      <Image
                        src={`/images/mbti/${type.code}.png`}
                        alt={type.name}
                        width={160}
                        height={160}
                        className="relative z-[1] max-h-full w-auto max-w-full object-contain"
                      />
                    </div>
                    {/* MBTI コード + 名前 */}
                    <div className="text-right">
                      <div className="text-[56px] font-black leading-[0.95] tracking-[-0.02em] text-gray-900">
                        {type.code}
                      </div>
                      <div className="mt-2 text-xl font-bold text-gray-800/80">
                        {type.name}
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 決定確認モーダル */}
      <AnimatePresence>
        {selectedType && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleReselect}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mbti-confirm-title"
          >
            <motion.div
              className={`mx-4 w-[380px] max-w-full rounded-[28px] border-4 border-gray-800 px-8 py-6 text-center shadow-[0_8px_0_#1f2937] ${GROUP_COLORS[groupIndex]}`}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                id="mbti-confirm-title"
                className="mb-1.5 text-[15px] font-bold text-gray-900"
              >
                あなたのMBTIは
              </p>
              <div className="mb-1 flex h-40 items-center justify-center">
                <Image
                  src={`/images/mbti/${selectedType.code}.png`}
                  alt={selectedType.name}
                  width={160}
                  height={160}
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <p className="mb-4 text-[28px] font-black text-gray-900">
                {selectedType.code} / {selectedType.name}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReselect}
                  className="flex-1 cursor-pointer rounded-xl border-[3px] border-gray-800 bg-white py-3 text-[15px] font-extrabold text-gray-800 shadow-[0_3px_0_#1f2937] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  選び直す
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 cursor-pointer rounded-xl border-[3px] border-gray-800 bg-white py-3 text-[15px] font-extrabold text-gray-800 shadow-[0_3px_0_#1f2937] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  決定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スキップ確認モーダル */}
      <AnimatePresence>
        {skipModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={cancelSkip}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mbti-skip-title"
          >
            <motion.div
              className="mx-4 w-[420px] max-w-full rounded-[28px] border-4 border-gray-800 bg-white px-8 py-6 text-center shadow-[0_8px_0_#1f2937]"
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                id="mbti-skip-title"
                className="mt-2 mb-1.5 text-lg font-extrabold text-gray-900"
              >
                MBTIを選ばずに進みますか？
              </p>
              <p className="mb-4 text-xs text-gray-800/70">
                わからない場合はそのまま次に進めます。
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelSkip}
                  className="flex-1 cursor-pointer rounded-xl border-[3px] border-gray-800 bg-white py-3 text-[15px] font-extrabold text-gray-800 shadow-[0_3px_0_#1f2937] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  いいえ
                </button>
                <button
                  type="button"
                  onClick={confirmSkip}
                  className="flex-1 cursor-pointer rounded-xl border-[3px] border-gray-800 bg-white py-3 text-[15px] font-extrabold text-gray-800 shadow-[0_3px_0_#1f2937] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  はい、進む
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
