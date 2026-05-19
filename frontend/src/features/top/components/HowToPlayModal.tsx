'use client';

export default function HowtoPlayModal({
  page,
  setPage,
  onClose,
}: {
  page: number;
  setPage: (fn: (p: number) => number) => void;
  onClose: () => void;
}) {

    // あそびかたの内容
    const howToPlaySteps = [
    {
        title: 'Real Youとは？',
        subtitle: '3つのミニゲームで本当の性格を知ろう！！',
        bullets: [
            '3つのミニゲームを通して、本当の性格に迫る診断です。',
            'ひとつずつじっくり答えていきましょう。',
        ],
    },
    {
        title: '所要時間は約5分！',
        subtitle: 'スキマ時間でサクッと診断⭐︎',
        bullets: ['短時間で遊べるので、休憩時間や移動中にもおすすめです！'],
    },
    {
        title: '始める前に',
        subtitle: '注意事項をチェック⚠️',
        bullets: [
            'マイクを使用します🎤',
            'BGM・効果音が流れます🎵',
            'イヤホン推奨🎧',
        ],
    },
];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
    >
      {/* ポップアップ本体 */}
      <div
        className="relative w-full max-w-xl min-h-[460px] rounded-[24px] border-[6px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000] animate-[fadeInUp_0.35s_ease-out] flex flex-col mx-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 inline-flex rounded-full border border-zinc-900 px-3 py-1.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
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
        <div className="flex-1 flex flex-col justify-center">
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

            <ul className="min-h-[130px] space-y-3 text-base leading-relaxed text-[#111] list-disc pl-5">
              {howToPlaySteps[page - 1].bullets.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

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
                onClose();
              }
            }}
            className="inline-flex rounded-full bg-black px-8 py-3 text-base font-bold text-white transition hover:bg-zinc-900"
          >
            {page < howToPlaySteps.length ? '次へ' : '完了'}
          </button>
        </div>
      </div>
    </div>
  );
}
