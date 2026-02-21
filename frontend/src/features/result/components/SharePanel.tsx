'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SharePanelProps = {
  title: string;
};

function buildShareText(title: string): string {
  return `私の行動解析結果は「${title}」でした！\n#行動解析REPORT`;
}

export default function SharePanel({ title }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const text = buildShareText(title);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const shareToX = () => {
    const params = new URLSearchParams({ text });
    window.open(
      `https://twitter.com/intent/tweet?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
    setOpen(false);
  };

  // TODO: 本番URL確定後、LINE シェアに url パラメータを追加する
  const shareToLine = () => {
    const params = new URLSearchParams({ text });
    window.open(
      `https://social-plugins.line.me/lineit/share?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        結果をシェア
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={shareToX}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <span className="text-base">𝕏</span>X (Twitter) でシェア
          </button>
          <button
            type="button"
            onClick={shareToLine}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <span className="text-base">💬</span>
            LINE でシェア
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <span className="text-base">📋</span>
            {copied ? 'コピーしました！' : 'テキストをコピー'}
          </button>
        </div>
      )}
    </div>
  );
}
