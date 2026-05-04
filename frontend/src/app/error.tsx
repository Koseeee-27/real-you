'use client';

import { useEffect } from 'react';
import ErrorScreen from '@/components/common/ErrorScreen';

/**
 * Next.js App Router の Error Boundary（ページ単位）。
 *
 * 想定外のクラッシュ（render 中の TypeError、catch 漏れの Promise reject 等）を
 * フォールバック UI に置換する最終防衛線。業務エラーは各画面の catch で個別に
 * `ErrorScreen` を出しているため、ここでは「想定していないエラー」のみが流れてくる。
 *
 * - `'use client'` 必須（Next.js の制約）
 * - `reset()` を呼ぶとエラーが起きたコンポーネントツリーが再 render される（フルリロードではない）
 *
 * 参考: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 開発者向けログ。本番では Sentry 等に流すことも検討（本 Issue では未対応）
    console.error(error);
  }, [error]);

  return <ErrorScreen variant="unexpected" onRetry={reset} />;
}
