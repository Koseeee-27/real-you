'use client';

import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { resultAtom } from '@/stores/result';
import { useResult } from '../hooks/useResult';
import ResultReport from './ResultReport';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorScreen from '@/components/common/ErrorScreen';

export default function ResultPage() {
  const router = useRouter();
  const { status, errorVariant, retry } = useResult();
  const result = useAtomValue(resultAtom);

  if (status === 'loading') {
    return <LoadingScreen message="分析中..." />;
  }

  if (status === 'error') {
    if (errorVariant === 'restart') {
      // RESTART_CODES（user_not_found / invalid_user_id 等）でトップに戻すケースでは、
      // 古い user_id を握ったまま再開しても同じエラーで詰むため localStorage を掃除する。
      // 既存の `ResultReport.handleRetake` と挙動を揃えている。
      const handleGoTop = () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_id');
        }
        router.push('/');
      };
      return <ErrorScreen variant="restart" onGoTop={handleGoTop} />;
    }
    return <ErrorScreen variant="retry" onRetry={retry} />;
  }

  if (result) {
    return <ResultReport data={result} />;
  }

  return <LoadingScreen message="分析中..." />;
}
