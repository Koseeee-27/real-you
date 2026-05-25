'use client';

import type { CSSProperties } from 'react';

/**
 * ゲーム全体の背景。暖色ヘイズの「デスクトップ壁紙」の上に、装飾用の
 * アプリウィンドウ（ブラウザ / ドキュメント / Finder 風）をカスケード配置して
 * 「PC のデスクトップ上でチャットアプリを開いている」雰囲気を出す。
 * v4-pop-yellow モック準拠。すべて装飾のため操作不可（aria-hidden）。
 */

const WALLPAPER =
  'radial-gradient(at 20% 22%, rgba(255,226,130,.92), transparent 52%),' +
  'radial-gradient(at 82% 16%, rgba(255,198,120,.80), transparent 50%),' +
  'radial-gradient(at 72% 84%, rgba(255,180,150,.70), transparent 55%),' +
  'radial-gradient(at 10% 86%, rgba(255,241,180,.85), transparent 50%),' +
  'linear-gradient(135deg,#fff3c4,#ffe7c2)';

/** 装飾ウィンドウ共通スタイル（中央基準で transform 配置する） */
const bgWindowBase: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.10)',
  borderRadius: 14,
  // 影は弱め、ぼかし + 減光で奥に下げて「背景」として馴染ませる
  boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  opacity: 0.55,
  filter: 'blur(3px)',
};

/** 装飾ウィンドウのタイトルバー（信号機ドット） */
function WindowBar() {
  return (
    <div className="flex h-[34px] flex-none items-center gap-2 border-b border-black/[0.07] bg-[#f3f3f3] px-3.5">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

/** プレースホルダーの本文行 */
function Line({ width }: { width: string }) {
  return (
    <div
      className="mb-3 h-[11px] rounded-md bg-[#e8e8ec]"
      style={{ width }}
    />
  );
}

export default function DesktopBackdrop() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* 壁紙 */}
      <div className="absolute inset-0" style={{ background: WALLPAPER }} />

      {/* 背景ウィンドウ1: ブラウザ風 */}
      <div
        style={{
          ...bgWindowBase,
          width: 1120,
          height: 720,
          zIndex: 2,
          transform: 'translate(calc(-50% - 230px), calc(-50% - 150px))',
        }}
      >
        <WindowBar />
        <div className="flex-1 overflow-hidden p-[18px]">
          <div className="mb-4 flex h-[30px] items-center rounded-[15px] bg-[#ececf0] px-3.5 text-xs text-[#999]">
            🔒 example.com
          </div>
          <div
            className="mb-[18px] h-[150px] rounded-[10px]"
            style={{ background: 'linear-gradient(120deg,#a0c4ff,#bdb2ff)' }}
          />
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Line width="92%" />
              <Line width="74%" />
              <Line width="92%" />
              <Line width="48%" />
            </div>
            <div>
              <Line width="74%" />
              <Line width="92%" />
              <Line width="48%" />
              <Line width="74%" />
            </div>
          </div>
        </div>
      </div>

      {/* 背景ウィンドウ2: ドキュメント風 */}
      <div
        style={{
          ...bgWindowBase,
          width: 1040,
          height: 690,
          zIndex: 3,
          transform: 'translate(calc(-50% + 250px), calc(-50% - 40px))',
        }}
      >
        <WindowBar />
        <div className="flex-1 overflow-hidden p-[18px]">
          <div className="mb-4 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-[18px] w-[42px] rounded-md bg-[#e4e4ea]" />
            ))}
          </div>
          <div className="rounded-lg border border-black/[0.05] bg-[#fafafb] px-7 py-[22px]">
            <div className="mb-3 h-3.5 w-[60%] rounded-[7px] bg-[#ffe39e]" />
            <Line width="92%" />
            <Line width="92%" />
            <Line width="74%" />
            <Line width="92%" />
            <Line width="48%" />
            <div className="h-2.5" />
            <Line width="92%" />
            <Line width="74%" />
            <Line width="92%" />
          </div>
        </div>
      </div>

      {/* 背景ウィンドウ3: Finder 風 */}
      <div
        style={{
          ...bgWindowBase,
          width: 1000,
          height: 640,
          zIndex: 4,
          transform: 'translate(calc(-50% - 70px), calc(-50% + 190px))',
        }}
      >
        <WindowBar />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[170px] border-r border-black/[0.06] bg-[#f6f6f8] p-4">
            {['60%', '85%', '70%', '90%', '55%'].map((w, i) => (
              <div
                key={i}
                className="mb-3.5 h-3 rounded-md bg-[#e2e2e8]"
                style={{ width: w }}
              />
            ))}
          </div>
          <div className="grid flex-1 grid-cols-4 content-start gap-4 p-[18px]">
            {['📁', '📁', '📄', '🖼️', '📁', '📄', '🎵', '📁'].map((ic, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[38px] leading-none">{ic}</span>
                <span className="h-[9px] w-[70%] rounded-[5px] bg-[#e3e3e9]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 減光ベール: 全体を少し暗くして眩しさ（チカチカ）を抑え、背景化する */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 5, background: 'rgba(38,30,16,0.30)' }}
      />
    </div>
  );
}
