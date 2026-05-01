'use client';

/**
 * 通信エラー / 業務エラー時に表示する全画面エラー UI。
 *
 * - `variant: 'retry'`  … 一時的な通信エラー想定。リトライボタンで同じ操作を再試行する
 * - `variant: 'restart'` … `RESTART_CODES`（user_not_found 等）想定。トップから最初の操作をやり直してもらう
 *
 * 後続 Issue で各画面の catch から呼び出す。本 Issue ではコンポーネント本体のみ実装する。
 */

type ErrorScreenProps =
  | { variant: 'retry'; onRetry: () => void }
  | { variant: 'restart'; onGoTop: () => void };

export default function ErrorScreen(props: ErrorScreenProps) {
  const isRetry = props.variant === 'retry';

  const title = isRetry ? '通信に失敗しました' : '最初からやり直してください';

  const description = isRetry
    ? '少し時間をおいて、もう一度お試しください。'
    : 'セッションが切れている可能性があります。';

  const buttonLabel = isRetry ? 'もう一度試す' : 'トップへ戻る';

  const handleClick = () => {
    if (props.variant === 'retry') {
      props.onRetry();
    } else {
      props.onGoTop();
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

      <button
        type="button"
        onClick={handleClick}
        className="mt-2 rounded-full bg-blue-600 px-8 py-3 text-base font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
