'use client';

interface WindowChromeBarProps {
  /** タイトルバー中央に表示するウィンドウ名 */
  title: string;
}

/**
 * macOS / ブラウザ風のウィンドウタイトルバー（信号機ボタン付き）。
 * 黄色のゲーム背景の上に「PC のアプリウィンドウを開いている」雰囲気を出すための装飾。
 * ボタンは操作しない（装飾用）。
 */
export default function WindowChromeBar({ title }: WindowChromeBarProps) {
  return (
    <div
      className="flex h-9 shrink-0 items-center border-b-[3px] border-black bg-[#e9e6df] px-4"
      aria-hidden
    >
      {/* 信号機ボタン（赤・黄・緑） */}
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#e03131]" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#f1cf44]" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-black bg-[#57d071]" />
      </div>
      <span className="flex-1 truncate px-3 text-center text-xs font-bold tracking-wide text-gray-600">
        {title}
      </span>
      {/* 信号機側と対称の余白でタイトルを中央寄せする */}
      <div className="w-[58px]" />
    </div>
  );
}
