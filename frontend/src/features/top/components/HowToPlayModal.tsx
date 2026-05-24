'use client';

import { useEffect, useRef } from 'react';

export default function HowtoPlayModal({
  page,
  setPage,
  onClose,
}: {
  page: number;
  setPage: (fn: (p: number) => number) => void;
  onClose: () => void;
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
      subtitle: '本当の私じゃ、ダメですか？',
      bullets: [
        'その性格診断、「こうありたい自分」が混ざってませんか？',
        'Real You は、あなたの バイアスを取り除いた"本当の自分" を映し出す診断です！',
      ],
    },
    {
      title: '所要時間は約5分！',
      subtitle: 'ゲームでサクッと、診断完了！',
      bullets: [
        '質問にじっくり答える時間も、細かい操作も必要ありません！直感のままにプレイしてください！',
      ],
    },
    {
      title: '始める前に、ちょっとだけ',
      subtitle: 'PC（Chrome 推奨）でのプレイをおすすめします',
      subtitle2: 'いざ！本当の自分に会いに行こう！！',
      bullets: ['ゲーム中、BGM や効果音が流れます'],
    },
  ];

  return (
    <dialog
      ref={dialogRef}
      className="rounded-[24px] border-[6px] border-black bg-white max-w-xl w-[90vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden justify-center p-0 animate-[fadeIn_0.35s_ease-out]"
      onClose={onClose}
    >
      {/* ポップアップ本体 */}
      <div
        className="relative w-full h-[460px] bg-white p-5 animate-[fadeInUp_0.35s_ease-out] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-3 right-3 inline-flex rounded-full border border-zinc-900 px-3 py-1.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
          onClick={() => dialogRef.current?.close()}
        >
          ✕
        </button>

        {/* 進行状況バー */}
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-zinc-700">
            <span>
              {page} / {howToPlaySteps.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-black transition-all duration-300"
              style={{
                width: `${(page / howToPlaySteps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex flex-col h-[300px]">
          <h2
            id="how-to-play-title"
            className="mb-4 text-3xl font-bold leading-relaxed text-center"
          >
            {howToPlaySteps[page - 1].title}
          </h2>

          <div className="mt-8">
            <p className="mb-4 text-base font-semibold text-zinc-600 leading-relaxed">
              {howToPlaySteps[page - 1].subtitle}
            </p>

            <ul className="min-h-[60px] space-y-3 text-base leading-relaxed text-[#111] list-disc pl-5">
              {howToPlaySteps[page - 1].bullets.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        {howToPlaySteps[page - 1].subtitle2 && (
          <p className="mt-0 mb-0 text-lg font-bold text-center">
            {howToPlaySteps[page - 1].subtitle2}
          </p>
        )}

        {/* ナビゲーションボタン */}
        <div className="mt-5 flex min-h-[64px] items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex rounded-full border border-zinc-900 px-8 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-100"
          >
            前へ
          </button>
          <button
            type="button"
            onClick={() => {
              if (page < howToPlaySteps.length) {
                setPage((p) => p + 1);
              } else {
                dialogRef.current?.close();
              }
            }}
            className="inline-flex rounded-full bg-black px-8 py-3 text-base font-bold text-white transition hover:bg-zinc-900"
          >
            {page < howToPlaySteps.length ? '次へ' : '完了'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
