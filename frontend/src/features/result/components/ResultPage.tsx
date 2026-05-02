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
      return (
        <ErrorScreen variant="restart" onGoTop={() => router.push('/')} />
      );
    }
    return <ErrorScreen variant="retry" onRetry={retry} />;
  }

  if (result) {
    return <ResultReport data={result} />;
  }

  return <LoadingScreen message="分析中..." />;
}
