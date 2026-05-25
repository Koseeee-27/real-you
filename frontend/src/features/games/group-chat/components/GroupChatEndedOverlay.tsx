'use client';

import Spinner from '@/components/ui/Spinner';

interface GroupChatEndedOverlayProps {
  /** 'loading' = 送信中 / 'success' = 送信成功（結果画面へ遷移待ち） */
  submitStatus: 'loading' | 'success';
}

/** ゲーム終了オーバーレイ（「終了！」+ 送信状態表示）。エラー時は Flow 側で ErrorScreen に委譲。 */
export default function GroupChatEndedOverlay({
  submitStatus,
}: GroupChatEndedOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 px-6 text-center">
      <p className="animate-[fadeInUp_0.4s_ease-out] text-6xl font-black tracking-[0.12em] text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] sm:text-7xl">
        終了！
      </p>
      {submitStatus === 'loading' && (
        <div className="mt-8 text-white">
          <Spinner message="送信中..." />
        </div>
      )}
      {submitStatus === 'success' && (
        <p className="mt-6 text-base font-bold text-white/85">
          結果画面へ移動します...
        </p>
      )}
    </div>
  );
}
