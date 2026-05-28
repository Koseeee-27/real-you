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
 * - 数値 + 単位 → マゼンタ大文字ハイライト（highlight-magenta）
 * - 『引用』  → ブルー大文字ハイライト（highlight-blue）
 */
function renderComment(text: string): React.ReactNode {
  const parts = text.split(COMBINED_RE);
  return parts.map((part, i) => {
    if (HIGHLIGHT_NUM_RE.test(part)) {
      HIGHLIGHT_NUM_RE.lastIndex = 0; // reset stateful regex
      return (
        <span key={i} className="highlight-magenta">
          {part}
        </span>
      );
    }
    if (HIGHLIGHT_QUOTE_RE.test(part)) {
      HIGHLIGHT_QUOTE_RE.lastIndex = 0;
      return (
        <span key={i} className="highlight-blue">
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
    <div className="total-layout-reconstructed">
      {/* ===== 左カラム：タイトル + サブタイトル + 解析コメント ===== */}
      <div className="total-left-panel">
        {/* タイトルステッカー ＋ サブタイトルを一体のポップアウトブロックとして配置 */}
        <div className="title-subtitle-block">
          <div className="type-main-title-sticker">
            <div className="type-preface-label">
              ゲームが導き出した、あなたの本当の姿は...
            </div>
            <h2 className="type-main-title">
              <span className="orange-highlight">{feedback.title}</span>
            </h2>
          </div>
          {feedback.subtitle && (
            <div className="type-intro-label">{feedback.subtitle}</div>
          )}
        </div>

        {/* 解析コメントボックス */}
        <div className="comment-container-new">
          <div className="comment-header-tag">解析コメント</div>
          <div className="comment-body-text">
            {feedback.description.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0 0 6px' }}>
                {renderComment(line)}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 右カラム：5 軸両極スライダー ===== */}
      <div className="total-right-panel">
        <span className="five-axis-headline">
          あなたの５軸ポジション（本能＝実測）
        </span>
        <span className="five-axis-headline">
          あなたのMBTIの目安
          <span className="average-icon">▼</span>
        </span>

        {/* スライダー群 */}
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
  );
}
