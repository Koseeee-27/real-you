'use client';

/**
 * 通信エラー / 業務エラー / 想定外クラッシュ時に表示する全画面エラー UI。
 *
 * - `variant: 'retry'`      … 一時的な通信エラー想定。リトライボタンで同じ操作を再試行する
 * - `variant: 'restart'`    … `RESTART_CODES`（user_not_found 等）想定。トップから最初の操作をやり直してもらう
 * - `variant: 'unexpected'` … Next.js Error Boundary（`app/error.tsx`）からの想定外クラッシュ用。
 *                              通信文脈に限定しない中立的な文言で誤解を防ぐ
 */

type ErrorScreenProps =
  | { variant: 'retry'; onRetry: () => void }
  | { variant: 'restart'; onGoTop: () => void }
  | { variant: 'unexpected'; onRetry: () => void };

const VARIANT_TEXT = {
  retry: {
    title: '通信に失敗しました',
    description: '少し時間をおいて、もう一度お試しください。',
    buttonLabel: 'もう一度試す',
  },
  restart: {
    title: '最初からやり直してください',
    description: 'セッションが切れている可能性があります。',
    buttonLabel: 'トップへ戻る',
  },
  unexpected: {
    title: '予期しないエラーが発生しました',
    description:
      'もう一度試してもうまくいかない場合は、最初からやり直してください。',
    buttonLabel: 'もう一度試す',
  },
} as const;

export default function ErrorScreen(props: ErrorScreenProps) {
  const { title, description, buttonLabel } = VARIANT_TEXT[props.variant];

  const handleClick = () => {
    if (props.variant === 'restart') {
      props.onGoTop();
    } else {
      // retry / unexpected は同じ「再試行」セマンティクス
      props.onRetry();
    }
  };

  return (
    // 全画面オーバーレイで操作ボタン（リトライ / トップへ戻る）を提示するため、
    // ライブリージョン（role="alert"）ではなく緊急ダイアログとして扱う。
    // - role="alertdialog": 緊急性のあるモーダルダイアログ
    // - aria-modal: 背景操作を抑止することを支援技術に伝える
    // - aria-labelledby / aria-describedby: 見出しと本文を関連付ける
    // 既存の MbtiSelect の決定確認モーダル（role="dialog" + aria-modal + aria-labelledby）と同じ流儀に揃えている。
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-screen-title"
      aria-describedby="error-screen-description"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white px-6 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
        <span aria-hidden="true">!</span>
      </div>

      <h2 id="error-screen-title" className="text-2xl font-bold text-gray-900">
        {title}
      </h2>
      <p id="error-screen-description" className="text-base text-gray-600">
        {description}
      </p>

      {/*
       * autoFocus: role="alertdialog" の WAI-ARIA ベストプラクティスとして、
       * 表示時にフォーカスをダイアログ内（主操作ボタン）に移す。
       * これによりキーボード操作・スクリーンリーダーでも即座に操作できる。
       */}
      <button
        type="button"
        autoFocus
        onClick={handleClick}
        className="mt-2 rounded-full bg-blue-600 px-8 py-3 text-base font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
