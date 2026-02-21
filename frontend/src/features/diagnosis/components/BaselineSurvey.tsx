'use client';

import { useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { mbtiAtom } from '@/stores/diagnosis';
import { game1DataAtom } from '@/stores/games';
import {
  QUESTIONS,
  type QuestionKey,
  type BaselineAnswers,
  type AnswerOption,
} from '@/features/diagnosis/types';
import Spinner from '@/components/ui/Spinner';
import { postRegister, submitGame } from '@/lib/api';

type Status = 'answering' | 'loading' | 'error' | 'success';

// TODO: UIは仮のものです。
export default function BaselineSurvey() {
  const router = useRouter();
  const mbti = useAtomValue(mbtiAtom);
  const game1Data = useAtomValue(game1DataAtom);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Partial<Record<QuestionKey, AnswerOption>>
  >({});
  const [status, setStatus] = useState<Status>('answering');

  const currentQuestion = QUESTIONS[currentIndex];
  const totalQuestions = QUESTIONS.length;

  const submitToApi = useCallback(
    async (finalAnswers: BaselineAnswers) => {
      setStatus('loading');

      try {
        const result = await postRegister({
          mbti,
          baseline_answers: finalAnswers,
        });

        localStorage.setItem('user_id', result.user_id);

        if (game1Data) {
          await submitGame({
            user_id: result.user_id,
            game_type: 1,
            data: game1Data as unknown as Record<string, unknown>,
          });
        }

        setStatus('success');

        setTimeout(() => {
          router.push('/games/helpdesk');
        }, 2000);
      } catch {
        setStatus('error');
      }
    },
    [mbti, router, game1Data]
  );

  const handleAnswer = (value: AnswerOption) => {
    const newAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(newAnswers);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      submitToApi(newAnswers as BaselineAnswers);
    }
  };

  const handleRetry = () => {
    submitToApi(answers as BaselineAnswers);
  };

  if (status === 'loading') {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Spinner message="送信中..." />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-lg font-semibold text-red-600">
          通信に失敗しました
        </p>
        <button
          onClick={handleRetry}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          リトライ
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <h2 className="text-2xl font-bold">診断完了！</h2>
        <p className="text-center text-gray-600">
          これからゲームが始まります。
          <br />
          ゲームでのあなたの行動から、本当の性格を分析します。
        </p>
        <p className="text-sm text-gray-400">
          まもなくゲーム画面に移動します...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">簡易性格診断</h1>
        <span className="text-sm font-medium text-gray-500">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
          }}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-lg font-medium">
          Q{currentIndex + 1}. {currentQuestion.label}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {currentQuestion.options.map((option) => (
          <button
            key={option}
            onClick={() => handleAnswer(option)}
            className="rounded-lg border-2 border-gray-200 bg-white px-6 py-3 text-left font-medium text-gray-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
