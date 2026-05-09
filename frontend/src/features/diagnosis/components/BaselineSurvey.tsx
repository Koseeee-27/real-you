'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { mbtiAtom } from '@/stores/diagnosis';
import { termsGameDataAtom } from '@/stores/games';
import {
  QUESTIONS,
  type QuestionKey,
  type BaselineAnswers,
  type AnswerOption,
} from '@/features/diagnosis/types';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorScreen from '@/components/common/ErrorScreen';
import { postRegister, submitGame } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';

type Status = 'answering' | 'loading' | 'error' | 'success';

/**
 * `ErrorScreen` に渡す variant。
 * - `'retry'`   … 一時的な通信エラー（サーバ 5xx / ネットワーク失敗）想定
 * - `'restart'` … `RESTART_CODES` に含まれる業務エラー、またはリトライ上限超過
 */
type ErrorVariant = 'retry' | 'restart';

// TODO: UIは仮のものです。
export default function BaselineSurvey() {
  const router = useRouter();
  const mbti = useAtomValue(mbtiAtom);
  const termsGameData = useAtomValue(termsGameDataAtom);

  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const playSE = useCallback((path: string) => {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, []);

  // BGMの初期化と再生管理
  useEffect(() => {
    const bgm = new Audio('/sounds/start-bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.4;
    bgmRef.current = bgm;

    const playBGM = () => {
      bgm.play().catch(() => {});
      window.removeEventListener('click', playBGM);
    };

    window.addEventListener('click', playBGM);
    playBGM();

    return () => {
      bgm.pause();
      window.removeEventListener('click', playBGM);
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Partial<Record<QuestionKey, AnswerOption>>
  >({});
  const [status, setStatus] = useState<Status>('answering');
  const [errorVariant, setErrorVariant] = useState<ErrorVariant>('retry');

  // リトライ回数は描画ロジックに直接影響しない（catch 内で variant を決める材料
  // としてのみ使う）ため、useState ではなく useRef で扱う。
  // useResult.ts と同じ流儀に揃えている。
  const retryCountRef = useRef(0);

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

        if (termsGameData) {
          try {
            await submitGame({
              user_id: result.user_id,
              game_type: 1,
              data: termsGameData,
            });
          } catch (gameErr) {
            // duplicate_submission（同一 user_id で同じゲームを再送信）は
            // 既にサーバ側に登録済みということなので、エラーにせず次画面へ進める。
            // それ以外は外側 catch に委譲する。
            const isDuplicate =
              isApiClientError(gameErr) &&
              gameErr.code === 'duplicate_submission';
            if (!isDuplicate) throw gameErr;
          }
        }

        retryCountRef.current = 0;
        setStatus('success');

        setTimeout(() => {
          router.push('/games/helpdesk');
        }, 2000);
      } catch (err: unknown) {
        // 業務エラーコードが「最初からやり直し」系の場合は restart。
        // それ以外（ネットワーク失敗・5xx・未知コード等）はリトライ可能扱いだが、
        // 既に MAX_RETRY_COUNT 回リトライ済みなら restart に切り替える。
        if (isApiClientError(err) && isRestartCode(err.code)) {
          setErrorVariant('restart');
        } else if (retryCountRef.current >= MAX_RETRY_COUNT) {
          setErrorVariant('restart');
        } else {
          setErrorVariant('retry');
        }
        setStatus('error');
      }
    },
    [mbti, router, termsGameData]
  );

  const handleAnswer = (value: AnswerOption) => {
    const newAnswers = { ...answers, [currentQuestion.key]: value };
    setAnswers(newAnswers);
    playSE('/sounds/general-button-se.mp3');

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      submitToApi(newAnswers as BaselineAnswers);
    }
  };

  const handleRetry = () => {
    playSE('/sounds/general-button-se.mp3');
    retryCountRef.current += 1;
    submitToApi(answers as BaselineAnswers);
  };

  const handleGoTop = () => {
    playSE('/sounds/general-button-se.mp3');
    // RESTART_CODES（user_not_found / invalid_user_id 等）でトップに戻すケースでは、
    // 古い user_id を握ったまま再開しても同じエラーで詰むため localStorage を掃除する。
    // ResultPage.tsx の handleGoTop と挙動を揃えている。
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_id');
    }
    router.push('/');
  };

  if (status === 'loading') {
    return <LoadingScreen message="送信中..." />;
  }

  if (status === 'error') {
    if (errorVariant === 'restart') {
      return <ErrorScreen variant="restart" onGoTop={handleGoTop} />;
    }
    return <ErrorScreen variant="retry" onRetry={handleRetry} />;
  }

  if (status === 'success') {
    return <LoadingScreen message="ゲームに移動中..." />;
  }

  return (
    <div className="relative w-full max-w-2xl">
      {/* ヘッダー: タイトル + プログレスバー */}
      <div className="mb-0 flex items-start justify-between gap-4">
        {/* タイトルエリア - メインカードに少し重なる */}
        <div className="relative z-10 flex flex-col">
          <div className="rounded-2xl border-4 border-gray-800 bg-white px-6 py-3 shadow-md">
            <h1 className="text-xl font-bold text-gray-900">質問コーナー</h1>
          </div>
        </div>

        {/* プログレスバー: 5セグメント */}
        <div className="flex shrink-0 gap-0.5 rounded-xl border-4 border-gray-800 bg-gray-100 p-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-6 w-8 rounded-lg transition-colors ${
                i <= currentIndex ? 'bg-rose-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* メインカード: 質問 + 4択 - タイトルと重なる */}
      <div className="relative -mt-4 rounded-3xl border-4 border-gray-800 bg-white p-6 shadow-lg">
        <p className="mb-6 text-xl font-bold text-gray-900">
          Q{currentIndex + 1}. {currentQuestion.label}
        </p>

        {/* 2x2グリッドの選択肢 */}
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleAnswer(option.value)}
              className="rounded-2xl border-4 border-gray-800 bg-gray-100 px-6 py-4 text-center font-bold text-gray-900 transition hover:bg-rose-50 hover:border-rose-300"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
