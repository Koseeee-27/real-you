'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import type { ResultResponse } from '@/features/result/types';
import { resultAtom } from '@/stores/result';
import { getResult } from '@/lib/api';
import {
  MAX_RETRY_COUNT,
  isApiClientError,
  isRestartCode,
} from '@/lib/api/error';

const MIN_LOADING_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `localStorage` の `user_id` 欠損で fetch できなかったことを示す sentinel エラー。
 *
 * `Error.message` 文字列マッチを避けるため、専用クラスとして用意する。
 * catch 側で `instanceof` で安全に判別し、`'restart'` variant に倒す。
 */
class MissingUserIdError extends Error {
  constructor() {
    super('user_id is missing in localStorage');
    this.name = 'MissingUserIdError';
  }
}

async function fetchResult(): Promise<ResultResponse> {
  const userId =
    typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  if (!userId) throw new MissingUserIdError();
  return await getResult(userId);
}

export type ResultStatus = 'loading' | 'error' | 'success';

/**
 * `ErrorScreen` に渡す variant。
 * - `'retry'`   … 一時的な通信エラー（サーバ 5xx / ネットワーク失敗）想定
 * - `'restart'` … `RESTART_CODES` に含まれる業務エラー、またはリトライ上限超過
 */
export type ResultErrorVariant = 'retry' | 'restart';

export function useResult() {
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [errorVariant, setErrorVariant] = useState<ResultErrorVariant>('retry');
  const setResult = useSetAtom(resultAtom);
  const [fetchKey, setFetchKey] = useState(0);

  // リトライ回数は変更されてもこの hook の描画ロジックには直接影響しない
  // （catch 内で variant を決める材料としてのみ使う）。state にして deps に含めると
  // 「成功時のリセット」で effect が再実行されて二重 fetch する事故が起きるため、
  // ref で扱う。
  const retryCountRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([fetchResult(), sleep(MIN_LOADING_MS)])
      .then(([data]) => {
        if (ignore) return;
        setResult(data);
        setStatus('success');
        retryCountRef.current = 0;
      })
      .catch((err: unknown) => {
        if (ignore) return;

        // user_id 欠損は retry しても localStorage が空のままで回復不能なので即 restart。
        // 業務エラーコードが「最初からやり直し」系の場合も restart。
        // それ以外（ネットワーク失敗・5xx・未知コード等）はリトライ可能扱いだが、
        // 既に MAX_RETRY_COUNT 回リトライ済みなら restart に切り替える。
        if (err instanceof MissingUserIdError) {
          setErrorVariant('restart');
        } else if (isApiClientError(err) && isRestartCode(err.code)) {
          setErrorVariant('restart');
        } else if (retryCountRef.current >= MAX_RETRY_COUNT) {
          setErrorVariant('restart');
        } else {
          setErrorVariant('retry');
        }
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [setResult, fetchKey]);

  const retry = useCallback(() => {
    setStatus('loading');
    retryCountRef.current += 1;
    setFetchKey((k) => k + 1);
  }, []);

  return { status, errorVariant, retry };
}
