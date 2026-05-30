'use client';

import { useEffect, useState } from 'react';

/**
 * 【開発用デバッグツール】一言タイトルのカラー調整パネル。
 *
 * 結果画面の「一言タイトル」（.type-main-title-sticker / .orange-highlight）の
 * - 文字色
 * - 背景色
 * - フチ色（text-shadow のアウトライン色）
 * をその場で変更し、見た目を確かめながら好みの色を探せる。
 *
 * 本番ビルドでは描画しない（process.env.NODE_ENV === 'production' のとき null）。
 * 確定した値は下部に表示される HEX を globals.css に転記する想定。
 *
 * 適用は #debug-title-tuner という <style> を動的に書き換える方式（!important）。
 * CSS 本体は変更しないため、リロードで初期状態に戻る。
 */

// globals.css の現在値（初期表示）
const DEFAULTS = {
  font: '#75fffd', // .type-main-title span.orange-highlight の color
  bg: '#ffe175', // .type-main-title-sticker の background
  outline: '#000000', // orange-highlight の text-shadow 色
};

function buildCss(font: string, bg: string, outline: string): string {
  return `
.type-main-title-sticker { background: ${bg} !important; }
.type-main-title span.orange-highlight {
  color: ${font} !important;
  text-shadow:
    -2.5px -2.5px 0px ${outline},
    2.5px -2.5px 0px ${outline},
    -2.5px 2.5px 0px ${outline},
    2.5px 2.5px 0px ${outline},
    5px 5px 0px rgba(0,0,0,0.3) !important;
}
`;
}

export default function DebugColorTuner() {
  const [open, setOpen] = useState(true);
  const [font, setFont] = useState(DEFAULTS.font);
  const [bg, setBg] = useState(DEFAULTS.bg);
  const [outline, setOutline] = useState(DEFAULTS.outline);

  // 値が変わるたびに <style id="debug-title-tuner"> を更新
  useEffect(() => {
    let el = document.getElementById(
      'debug-title-tuner'
    ) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'debug-title-tuner';
      document.head.appendChild(el);
    }
    el.textContent = buildCss(font, bg, outline);
    return () => {
      // アンマウント時に除去
      document.getElementById('debug-title-tuner')?.remove();
    };
  }, [font, bg, outline]);

  const reset = () => {
    setFont(DEFAULTS.font);
    setBg(DEFAULTS.bg);
    setOutline(DEFAULTS.outline);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 9999,
          fontWeight: 900,
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 10,
          border: '3px solid #000',
          background: '#fff',
          cursor: 'pointer',
          boxShadow: '3px 3px 0 #000',
        }}
      >
        一言カラー調整
      </button>
    );
  }

  const rows: {
    label: string;
    value: string;
    set: (v: string) => void;
  }[] = [
    { label: '文字色', value: font, set: setFont },
    { label: '背景色', value: bg, set: setBg },
    { label: 'フチ色', value: outline, set: setOutline },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        width: 230,
        background: '#fff',
        border: '3px solid #000',
        borderRadius: 14,
        boxShadow: '5px 5px 0 #000',
        padding: 12,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 900, fontSize: 13 }}>
          一言カラー調整（DEBUG）
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            fontWeight: 900,
            fontSize: 12,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span style={{ width: 44, fontSize: 12, fontWeight: 700 }}>
            {r.label}
          </span>
          <input
            type="color"
            value={r.value}
            onChange={(e) => r.set(e.target.value)}
            style={{
              width: 34,
              height: 26,
              padding: 0,
              border: '2px solid #000',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'none',
            }}
          />
          <input
            type="text"
            value={r.value}
            onChange={(e) => r.set(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              fontFamily: 'monospace',
              padding: '3px 6px',
              border: '2px solid #000',
              borderRadius: 6,
            }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 4,
          width: '100%',
          fontWeight: 900,
          fontSize: 12,
          padding: '6px 0',
          borderRadius: 8,
          border: '2px solid #000',
          background: '#f1cf44',
          cursor: 'pointer',
        }}
      >
        初期値に戻す
      </button>
    </div>
  );
}
