'use client';

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { mbtiAtom, diagnosisStepAtom } from '@/stores/diagnosis';
import { MBTI_TYPES, MBTI_GROUPS } from '@/constants/mbti';

// ここのUIは仮です。実際のUIはデザイナーさんと相談して作成してください。
export default function MbtiSelect() {
  const setMbti = useSetAtom(mbtiAtom);
  const setStep = useSetAtom(diagnosisStepAtom);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selected) return;
    setMbti(selected);
    setStep('quiz');
  };

  const handleSkip = () => {
    setMbti(null);
    setStep('quiz');
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">あなたのMBTIタイプは？</h1>
      <p className="text-sm text-gray-500">
        わからない場合はスキップできます
      </p>

      <div className="flex flex-col gap-4">
        {MBTI_GROUPS.map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">{group}</span>
            <div className="grid grid-cols-2 gap-2">
              {MBTI_TYPES.filter((t) => t.group === group).map((type) => (
                <button
                  key={type.code}
                  onClick={() => setSelected(type.code)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                    selected === type.code
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.code}
                  <span className="ml-1 font-normal text-gray-500">
                    {type.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          次へ
        </button>
        <button
          onClick={handleSkip}
          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          スキップ
        </button>
      </div>
    </div>
  );
}
