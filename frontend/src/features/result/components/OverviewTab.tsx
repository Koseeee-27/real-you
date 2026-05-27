'use client';

import type { ResultResponse } from '../types';
import BipolarSlider from './BipolarSlider';

type OverviewTabProps = {
  data: ResultResponse;
};

// ハイライト正規表現（BEが埋め込む数値 + 単位 / 『テキスト』引用）
const HIGHLIGHT_NUM_RE = /(\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分))/g;
const HIGHLIGHT_QUOTE_RE = /(『[^』]+』)/g;
const COMBINED_RE = /(『[^』]+』|\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分))/g;

/**
 * 解析コメントテキストを JSX に変換する。
 * - 数値 + 単位 → マゼンタ大文字ハイライト
 * - 『引用』  → ブルー大文字ハイライト
 */
function renderComment(text: string): React.ReactNode {
  const parts = text.split(COMBINED_RE);
  return parts.map((part, i) => {
    if (HIGHLIGHT_NUM_RE.test(part)) {
      HIGHLIGHT_NUM_RE.lastIndex = 0; // reset stateful regex
      return (
        <span
          key={i}
          className="font-black"
          style={{
            fontSize: '1.3em',
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
    if (HIGHLIGHT_QUOTE_RE.test(part)) {
      HIGHLIGHT_QUOTE_RE.lastIndex = 0;
      return (
        <span
          key={i}
          className="font-black"
          style={{
            fontSize: '1.3em',
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

// 5 軸の表示順（上から下）
const AXES = [
  'caution',
  'calmness',
  'logic',
  'cooperativeness',
  'positivity',
] as const;

export default function OverviewTab({ data }: OverviewTabProps) {
  const { feedback, scores, baseline_scores } = data;

  return (
    <div className="flex gap-8 h-full w-full items-stretch">
      {/* ===== 左カラム：タイトル + サブタイトル + 解析コメント ===== */}
      <div className="w-1/2 flex flex-col relative">
        {/* タイトルステッカー */}
        <div
          className="self-center border-4 border-black rounded-2xl px-5 py-4 bg-white"
          style={{
            boxShadow: '3px 3px 0 #636262',
            whiteSpace: 'nowrap',
          }}
        >
          <h2
            className="font-black leading-tight m-0 text-center"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2.2rem)' }}
          >
            <span
              style={{
                color: '#f87171',
                textShadow:
                  '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.25)',
              }}
            >
              {feedback.title}
            </span>
          </h2>
        </div>

        {/* サブタイトル（BE未実装時は非表示） */}
        {feedback.subtitle && (
          <p
            className="text-center font-black mt-3 text-sm sm:text-base"
            style={{ color: '#555' }}
          >
            {feedback.subtitle}
          </p>
        )}

        {/* 解析コメントボックス */}
        <div
          className="flex-1 mt-4 rounded-r-xl"
          style={{
            background: '#FFFCE8',
            borderLeft: '10px solid #f87171',
            padding: '16px 20px',
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
            className="font-bold leading-relaxed"
            style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)', color: '#333', lineHeight: 1.8 }}
          >
            {renderComment(feedback.description)}
          </div>
        </div>
      </div>

      {/* ===== 右カラム：5 軸両極スライダー ===== */}
      <div
        className="w-1/2 flex flex-col"
        style={{
          borderLeft: '3px dashed #e2e8f0',
          paddingLeft: 24,
        }}
      >
        {/* ヘッダー行 */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-gray-400 leading-tight">
            あなたの５軸ポジション（本能＝実測）
          </p>
          <p className="text-xs font-black flex items-center gap-1" style={{ color: '#777' }}>
            あなたのMBTIの目安{' '}
            <span className="text-red-500 text-xs">▼</span>
          </p>
        </div>

        {/* スライダー群 */}
        <div className="flex flex-col justify-between flex-1 gap-1">
          {AXES.map((axis) => (
            <BipolarSlider
              key={axis}
              axis={axis}
              score={scores[axis]}
              baselineScore={baseline_scores[axis]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
