'use client';

import { useAtomValue } from 'jotai';
import { resultAtom } from '@/stores/result';
import { useResult } from '../hooks/useResult';
import AnalyzingView from './AnalyzingView';
import ResultReport from './ResultReport';

export default function ResultPage() {
  const { status, errorMessage, retry } = useResult();
  const result = useAtomValue(resultAtom);

  if (status === 'loading') {
    return <AnalyzingView status="loading" />;
  }

  if (status === 'error') {
    return (
      <AnalyzingView
        status="error"
        errorMessage={errorMessage}
        onRetry={retry}
      />
    );
  }

  if (result) {
    return <ResultReport data={result} />;
  }

  return <AnalyzingView status="loading" />;
}
