'use client';

import { Share2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SITE_URL } from '@/constants/site';

type SnsShareTriggerProps = {
  title: string;
  userId: string;
};

function buildShareText(title: string, shareUrl: string): string {
  return `私の行動解析結果は「${title}」でした！\n#技育博 #RealYou #本当の私じゃだめですか\n${shareUrl}`;
}

export default function SnsShareTrigger({
  title,
  userId,
}: SnsShareTriggerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const shareUrl = `${SITE_URL}/share/${userId}`;
  const text = buildShareText(title, shareUrl);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const shareToX = () => {
    const params = new URLSearchParams({ text });
    window.open(
      `https://twitter.com/intent/tweet?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
    setOpen(false);
  };

  const shareToLine = () => {
    const params = new URLSearchParams({ text, url: shareUrl });
    window.open(
      `https://social-plugins.line.me/lineit/share?${params}`,
      '_blank',
      'noopener,noreferrer'
    );
    setOpen(false);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopied(false);
          setOpen(false);
        }, 1500);
      }
    }
  }, [text]);

  return (
    <div className="share-sns-trigger-block">
      <p className="share-sns-hint">SNSでもシェアしてね！</p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="share-sns-trigger-btn"
      >
        <Share2 className="w-5 h-5 mr-2 stroke-[3px]" />
        <span>SNSでシェア！</span>
      </button>

      {open &&
        createPortal(
          <div
            className="share-sns-picker-overlay"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sns-picker-title"
              className="share-sns-picker-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="share-sns-picker-close"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>

              <p id="sns-picker-title" className="share-sns-picker-heading">
                シェア先を選んでね
              </p>

              <div className="share-sns-picker-options">
                <button
                  type="button"
                  onClick={shareToX}
                  className="share-sns-picker-option"
                >
                  <span className="share-sns-picker-icon">𝕏</span>
                  <span>X (Twitter) でシェア</span>
                </button>
                <button
                  type="button"
                  onClick={shareToLine}
                  className="share-sns-picker-option"
                >
                  <span className="share-sns-picker-icon">💬</span>
                  <span>LINE でシェア</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="share-sns-picker-option"
                >
                  <span className="share-sns-picker-icon">
                    {copied ? '✓' : '📋'}
                  </span>
                  <span>
                    {copied ? 'コピーしました！' : 'テキストをコピー'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
