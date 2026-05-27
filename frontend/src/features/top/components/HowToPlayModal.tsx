'use client';

import { SlideModalClassNames } from '@/components/common/SlideModal';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export default function HowtoPlayModal({
  page,
  setPage,
  onClose,
  classNames = {},
}: {
  page: number;
  setPage: (fn: (p: number) => number) => void;
  onClose: () => void;
  classNames?: SlideModalClassNames;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
  }, []);

  // あそびかたの内容
  const howToPlaySteps = [
    {
      title: 'Real Youとは？',
      subtitle: '“本当のあなた”が分かる、新しい性格診断アプリ。',
      bullets: [
        '直感のままにプレイするだけ。',
        'あなたらしさが、自然とあらわれます。',
      ],
    },
    {
      title: 'プレイ時間は約5分！',
      subtitle: 'ゲームでサクッと、診断完了！',
      bullets: [
        '※PCでのプレイをおすすめします',
        '※ゲーム中、BGMや効果音が流れます'
      ],
    },
    {
      title: 'さあ！”本当の自分”に会いに行こう！',
      subtitle: '',
      bullets: [],
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'rounded-[24px] border-[6px] border-black bg-white max-w-xl w-[90vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden p-0 flex flex-col',
        classNames.overlay
      )}
      onClose={onClose}
    >
      {/* 黄色枠 */}
      <div className="min-h-[44px] border-b-[3px] border-black bg-[#f1cf44] flex items-center justify-center">
        {/* 進行状況ドット */}
        <div className={cn("flex justify-center gap-3", classNames.header)}>
          {Array.from({ length: howToPlaySteps.length }).map((_, i) => (
            <div
              key={i}
              className={`
                h-3 w-3 rounded-full transition-all duration-300
                ${page === i + 1 ? "bg-black scale-110" : "bg-zinc-300"}
              `}
            />
          ))}
        </div>
      </div>

      {/* ポップアップ本体 */}
      <div
        className={cn(
          'relative w-full bg-white px-0 pt-5 pb-0 flex flex-col flex-1min-h-[440px] sm:min-h-[420px] lg:min-h-[400px]',
          classNames.card
        )}
        onClick={(event) => event.stopPropagation()}
      >
        

      {/* メインコンテンツ */}
      <div className={cn("flex flex-col w-full items-center justify-center text-center flex-1", classNames.body)}>
        {page === 1 && (
          <div className="flex flex-col items-center mt-4">
            <h2 className="mb-4 text-6xl font-bold leading-relaxed">
              {howToPlaySteps[0].title}
            </h2>

            <p className="mb-10 text-base leading-relaxed">
              {howToPlaySteps[0].subtitle}
            </p>

            <div className="space-y-2 text-base leading-relaxed text-[#111]">
              {howToPlaySteps[0].bullets.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {page === 2 && (
          <div className="flex flex-col items-center mt-4">
            <h2 className="mb-4 text-5xl font-bold leading-relaxed">
              {howToPlaySteps[1].title}
            </h2>

            <p className="mb-7 text-2xl leading-relaxed">
              {howToPlaySteps[1].subtitle}
            </p>

            <div className="space-y-2 text-base leading-relaxed text-[#111] text-left text-gray-500">
              {howToPlaySteps[1].bullets.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {page === 3 && (
          <div className="flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold leading-relaxed">
              {howToPlaySteps[2].title}
            </h2>
          </div>
        )}
      </div>

      {/* 黄色帯（下） */}
      <div className="min-h-[64px] border-t-[3px] border-black bg-[#f1cf44] 
                      flex items-center justify-between px-5">
      {/* 戻るボタン */}
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className={cn(
            // ベースデザイン（SlideModal と同じ）NEO_FOOTER_BUTTON_BASEが読み込めなかったので直接
            'rounded-xl border-[3px] border-black py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:py-3 sm:text-base',
            // 色
            'bg-white text-black px-6 sm:px-8',
            classNames.backButton
          )}
        >
          ← 戻る
        </button>

        {/* 次へ/完了ボタン */}
        <button
          type="button"
          onClick={() => {
            if (page < howToPlaySteps.length) {
              setPage((p) => p + 1);
            } else {
              dialogRef.current?.close();
            }
          }}
          className={cn(
          // ベースデザイン（SlideModal と同じ）
            'rounded-xl border-[3px] border-black py-2 text-sm font-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] sm:py-3 sm:text-base',
          // 色（次へ or 完了）
            page < howToPlaySteps.length
              ? 'bg-[#2d5be3] text-white px-6 sm:px-8'
              : 'bg-[#57d071] text-white px-6 sm:px-8',
            page < howToPlaySteps.length
              ? classNames.nextButton
              : classNames.completeButton
          )}
        >
          {page < howToPlaySteps.length ? '次へ →' : '完了！'}
        </button>
      </div>
    </div>
    </dialog>
  );
}
