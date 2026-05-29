'use client';

import { Share2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { SITE_URL } from '@/constants/site';

type SharePanelProps = {
  title: string;
  userId: string;
};

function buildShareText(title: string, userId: string): string {
  const shareUrl = `${SITE_URL}/share/${userId}`;
  return `私の行動解析結果は「${title}」でした！\n#技育博 #RealYou #本当の私じゃだめですか\n${shareUrl}`;
}

export default function SharePanel({ title, userId }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const shareUrl = `${SITE_URL}/share/${userId}`;
  const text = buildShareText(title, userId);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('share-qr-modal-open');
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('share-qr-modal-open');
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 非対応 / 権限拒否時はフォールバック
      const el = document.createElement('textarea');
      el.value = shareUrl;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      if (success) {
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [shareUrl]);

  // --- SNS 系はコードに残しておく（非表示）---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _shareToX = () => {
    const params = new URLSearchParams({ text });
    window.open(
      `https://twitter.com/intent/tweet?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _shareToLine = () => {
    const params = new URLSearchParams({ text, url: shareUrl });
    window.open(
      `https://social-plugins.line.me/lineit/share?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center h-12 min-w-[160px] px-6 bg-black text-white rounded-full font-black shadow-[4px_4px_0px_0px_#fbbf24] hover:translate-y-0.5 hover:shadow-none transition-all text-sm sm:text-base"
      >
        <Share2 className="w-5 h-5 mr-2 stroke-[3px]" />
        <span className="text-sm sm:text-base tracking-tight">
          結果をシェア
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="share-qr-modal-overlay"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-modal-title"
              className="share-qr-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="share-qr-modal-close"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>

              <div id="qr-modal-title" className="share-qr-modal-heading">
                スマホで読み取ってね！
              </div>

              <p className="share-qr-modal-nickname">
                <span className="orange-highlight">{title}</span>
              </p>

              <div className="share-qr-modal-qr-wrap">
                <QRCodeSVG value={shareUrl} size={180} />
              </div>

              <div className="share-qr-modal-url">{shareUrl}</div>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="share-qr-modal-copy-btn"
                style={{
                  background: copied ? '#22c55e' : '#000',
                }}
              >
                {copied ? '✓ コピーしました！' : '📋 URLをコピー'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
