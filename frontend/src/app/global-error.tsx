'use client';

import { useEffect } from 'react';

/**
 * Next.js App Router の Global Error Boundary（layout.tsx 自体のエラー用）。
 *
 * `app/error.tsx` は layout の内側でしか発火しないため、layout.tsx 自体が壊れた場合の
 * 最終防衛線として `global-error.tsx` が必要になる。layout が機能しない前提のため、
 * `<html>` / `<body>` を自前で出力する。
 *
 * - `'use client'` 必須
 * - 外部 CSS（globals.css / Tailwind）が読めない可能性があるため、スタイルはインラインで完結させる
 * - `ErrorScreen` を使わない（Tailwind 依存のため、ここでは fallback の fallback として使えない）
 *
 * 参考: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#ffffff',
          color: '#111827',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>
          エラーが発生しました
        </h2>
        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 24px' }}>
          少し時間をおいて、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 32px',
            fontSize: '14px',
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
          }}
        >
          もう一度試す
        </button>
      </body>
    </html>
  );
}
