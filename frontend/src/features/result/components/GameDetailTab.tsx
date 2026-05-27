'use client';

import { Camera } from 'lucide-react';
import type { GameDetail } from '../types';
import { GAME_META } from '../data/gameMeta';
import BipolarSlider from './BipolarSlider';

type GameDetailTabProps = {
  detail: GameDetail;
  tabColor?: string;
};

// ハイライト正規表現（BEが埋め込む数値 + 単位 / 『テキスト』引用）
const COMBINED_RE = /(『[^』]+』|\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分))/g;
const NUM_RE = /^\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分)$/;
const QUOTE_RE = /^『[^』]+』$/;

/** 解析コメントテキストを JSX に変換する */
function renderComment(text: string): React.ReactNode {
  const parts = text.split(COMBINED_RE);
  return parts.map((part, i) => {
    if (NUM_RE.test(part)) {
      return (
        <span
          key={i}
          className="font-black"
          style={{
            fontSize: '1.25em',
            color: '#db2777',
            background: '#fdf2f8',
            padding: '1px 4px',
            borderRadius: 3,
            display: 'inline-block',
            lineHeight: 1.2,
          }}
        >
          {part}
        </span>
      );
    }
    if (QUOTE_RE.test(part)) {
      return (
        <span
          key={i}
          className="font-black"
          style={{
            fontSize: '1.25em',
            color: '#4d85ff',
            background: '#eff6ff',
            padding: '1px 4px',
            borderRadius: 3,
            display: 'inline-block',
            lineHeight: 1.2,
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/** スクロール誘導区切り線 */
function ScrollIndicator({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 font-black text-xs text-slate-500 my-4 pt-3"
      style={{ borderTop: '2px dashed #e2e8f0' }}
    >
      ↓ {label} ↓
    </div>
  );
}

export default function GameDetailTab({
  detail,
  tabColor = '#3b82f6',
}: GameDetailTabProps) {
  const meta = GAME_META[detail.game_id];

  return (
    <div
      className="h-full overflow-y-auto pr-2"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#FFD700 #f1f1f1',
      }}
    >
      {/* ======================================================
          Section A: スクショ + ゲーム紹介
         ====================================================== */}
      <div className="flex gap-5 w-full items-start">
        {/* スクショプレースホルダー */}
        <div
          className="flex flex-col items-center justify-center flex-shrink-0 rounded-2xl border-4 border-black"
          style={{
            width: '42%',
            minHeight: 200,
            background: '#cbd5e1',
          }}
        >
          <Camera className="w-8 h-8 text-slate-500 mb-2" />
          <span
            className="text-xs font-black text-black bg-white/80 px-3 py-1 rounded border border-black"
          >
            プレイ画面（静止画）
          </span>
          {meta && (
            <span className="text-xs font-bold text-slate-500 mt-2 px-3 text-center">
              {detail.title}
            </span>
          )}
        </div>

        {/* ゲーム紹介 */}
        {meta && (
          <div className="flex flex-col gap-3 flex-1">
            <div
              className="border-4 border-black rounded-2xl p-4"
              style={{ boxShadow: '6px 6px 0 rgba(0,0,0,0.1)' }}
            >
              {/* ゲームタイトル */}
              <h3
                className="font-black text-black pb-2 mb-3 inline-block"
                style={{
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                  borderBottom: `3px solid ${tabColor}`,
                }}
              >
                {detail.title}
              </h3>

              {/* 説明文 */}
              <p
                className="font-bold leading-relaxed text-gray-700"
                style={{ fontSize: 'clamp(0.75rem, 1.4vw, 0.95rem)' }}
              >
                {meta.description}
              </p>

              {/* 測る性格 */}
              <div
                className="mt-3 rounded-lg border-2 border-black px-3 py-2 font-black text-sm"
                style={{ background: '#fffce8', color: tabColor }}
              >
                測る性格：{meta.measuredTraits}
              </div>
            </div>
          </div>
        )}
      </div>

      <ScrollIndicator label="下にスクロールしてゲームで得た性格を確認" />

      {/* ======================================================
          Section B: 性格スライダー + 解析コメント
         ====================================================== */}
      <div className="flex gap-5 w-full items-start">
        {/* 左: 両極スライダー群 */}
        <div className="flex-1 min-w-0">
          <div
            className="w-full text-center font-black text-sm rounded border-2 border-black py-1 mb-4"
            style={{ background: '#f3f4f6' }}
          >
            このゲームで見えた「あなたの性格」
          </div>
          <div className="flex flex-col gap-3">
            {(detail.feature_scores ?? []).map((fs) => (
              <BipolarSlider
                key={fs.axis}
                axis={fs.axis}
                score={fs.score}
                // 詳細画面は baseline ▼ マーカーなし
              />
            ))}
          </div>
        </div>

        {/* 右: 解析コメントボックス */}
        <div
          className="w-5/12 flex-shrink-0 rounded-2xl"
          style={{
            background: '#fffce8',
            borderLeft: '10px solid #f87171',
            padding: '14px 16px',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.05)',
          }}
        >
          <div
            className="font-black mb-2"
            style={{ fontSize: 14, color: '#f87171' }}
          >
            解析コメント
          </div>
          <div
            className="font-bold leading-relaxed text-gray-800 space-y-2"
            style={{ fontSize: 'clamp(0.78rem, 1.3vw, 0.92rem)', lineHeight: 1.75 }}
          >
            {(detail.analysis_comment ?? []).map((line, i) => (
              <p key={i}>{renderComment(line)}</p>
            ))}
          </div>
        </div>
      </div>

      <ScrollIndicator label="下にスクロールして実計測の行動エビデンスを確認" />

      {/* ======================================================
          Section C: top_deviation_metrics 2×2 グリッド
         ====================================================== */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: '#fffce8',
          border: '2.5px solid #fbf3bd',
          boxShadow: '2px 2px 0 #fffce8',
        }}
      >
        {/* ドット背景オーバーレイ */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,0,0,0.04) 2.5px, transparent 2.5px)',
            backgroundSize: '18px 18px',
          }}
        />

        <div
          className="relative font-black text-sm text-center rounded border-2 border-black py-1 mb-4"
          style={{ background: '#f3f4f6' }}
        >
          その他に測っていた行動データ
        </div>

        {/* 2×2 グリッド */}
        <div className="relative grid grid-cols-2 gap-4">
          {(detail.top_deviation_metrics ?? []).map((m, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border-2 border-black flex flex-col justify-between"
            >
              <div>
                <div className="font-black text-black text-sm mb-1">
                  {m.label}
                </div>
                <div
                  className="font-black"
                  style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)', color: '#f87171' }}
                >
                  {/* user 値をわかりやすく表示 */}
                  あなた：{m.user}
                </div>
                <div className="text-xs text-gray-400 font-bold">
                  平均：{m.average}
                </div>
              </div>
              {/* praise テキスト */}
              <div
                className="mt-3 text-xs font-bold rounded-lg p-2"
                style={{
                  background: '#fffce8',
                  border: '1px dashed #f87171',
                  color: '#334155',
                }}
              >
                {m.praise}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 下部の余白 */}
      <div className="h-4" />
    </div>
  );
}
