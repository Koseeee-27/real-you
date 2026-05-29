'use client';

import { useState } from 'react';
import type { ResultResponse } from '../types';
import BipolarSlider, { AXIS_POLES } from './BipolarSlider';
import { DEV_COMMENT_SAMPLES, type DevCommentSample } from '../data/devCommentSamples';

type OverviewTabProps = {
  data: ResultResponse;
};

// ハイライト正規表現（BEが埋め込む数値 + 単位 / 『テキスト』引用）
const COMBINED_RE =
  /(『[^』]+』|「[^」]+」|\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分))/g;
const NUM_RE = /^\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分)$/;
const QUOTE_RE = /^(?:『[^』]+』|「[^」]+」)$/;

function renderComment(text: string): React.ReactNode {
  const parts = text.split(COMBINED_RE);
  return parts.map((part, i) => {
    if (NUM_RE.test(part)) {
      return (
        <span key={i} className="highlight-magenta">
          {part}
        </span>
      );
    }
    if (QUOTE_RE.test(part)) {
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

// score >= 50 を「右ポール側」とみなしてラベル化する
function sideLabel(axis: string, score: number): string {
  const poles = AXIS_POLES[axis] ?? { left: axis, right: axis };
  return score >= 50 ? poles.right : poles.left;
}

type GapHighlight = {
  /** ズレの大きさ（絶対値, 0–100） */
  gap: number;
  /** 自己申告側のラベル（例「慎重」） */
  selfLabel: string;
  /** 実測側のラベル（例「大胆」） */
  actualLabel: string;
  /** 自己申告と実測が同じポール側か（差が程度のみ） */
  sameSide: boolean;
};

/**
 * 5 軸の中で「自己申告 ↔ 実測」のズレが最大の軸を抽出する。
 * 結果画面の「思っていた自分 → 本能の自分」断言カードに使う。
 */
function computeBiggestGap(
  scores: Record<string, number>,
  baseline: Record<string, number>
): GapHighlight | null {
  let best: (GapHighlight & { axis: string }) | null = null;
  for (const axis of AXES) {
    const actual = scores[axis];
    const self = baseline[axis];
    if (actual == null || self == null) continue;
    const gap = Math.abs(actual - self);
    if (!best || gap > best.gap) {
      const selfLabel = sideLabel(axis, self);
      const actualLabel = sideLabel(axis, actual);
      best = {
        axis,
        gap,
        selfLabel,
        actualLabel,
        sameSide: selfLabel === actualLabel,
      };
    }
  }
  return best;
}

const devTabStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 9px',
  borderRadius: 20,
  border: '1.5px solid #94a3b8',
  background: '#fff',
  color: '#64748b',
  cursor: 'pointer',
};

const devTabActiveStyle: React.CSSProperties = {
  ...devTabStyle,
  background: '#334155',
  borderColor: '#334155',
  color: '#fff',
};

/** 1つの文字列を文末記号で区切り、文ごとに改行する */
function renderParagraphWithBreaks(text: string): React.ReactNode {
  const sentences = text
    .split(/(。|！|？)/)
    .reduce<string[]>((acc, s) => {
      if (/^[。！？]$/.test(s)) acc[acc.length - 1] += s;
      else if (s.trim()) acc.push(s);
      return acc;
    }, []);
  return sentences.map((sentence, j, arr) => (
    <span key={j}>
      {renderComment(sentence)}
      {j < arr.length - 1 && <br />}
    </span>
  ));
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const isDev = process.env.NODE_ENV === 'development';
  const [devSample, setDevSample] = useState<DevCommentSample | null>(null);

  // dev モード時は選択中のサンプルで feedback を上書き
  const feedback = devSample
    ? { ...data.feedback, description: devSample.description }
    : data.feedback;

  const { scores, baseline_scores } = data;
  const gap = computeBiggestGap(scores, baseline_scores);

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

        {/* dev only: コメントパターン切替（画面左上固定・カード外） */}
        {isDev && (
          <div style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 9999,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(6px)',
            padding: '7px 10px',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            maxWidth: 320,
          }}>
            <button
              type="button"
              onClick={() => setDevSample(null)}
              style={devSample === null ? devTabActiveStyle : devTabStyle}
            >
              実データ
            </button>
            {DEV_COMMENT_SAMPLES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setDevSample(s)}
                style={devSample?.label === s.label ? devTabActiveStyle : devTabStyle}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* 解析コメントボックス */}
        <div className="comment-container-new">
          <div className="comment-header-tag">解析コメント</div>

          {gap && (
            <div className="gap-callout">
              <span className="gap-callout-tag">最大のギャップ</span>
              {gap.gap < 10 ? (
                <p className="gap-callout-body">
                  自己認識と行動は
                  <span className="gap-actual">ほぼ一致</span>！
                </p>
              ) : gap.sameSide ? (
                <p className="gap-callout-body">
                  自覚以上に
                  <span className="gap-actual">「{gap.actualLabel}」</span>
                  でした！
                </p>
              ) : (
                <p className="gap-callout-body">
                  自分では
                  <span className="gap-self">「{gap.selfLabel}」</span>
                  のつもり、でも実際は
                  <span className="gap-actual">「{gap.actualLabel}」</span>！
                </p>
              )}
            </div>
          )}

          <div className="comment-body-text">
            {feedback.description.split('\n').map((line, i) => (
              <p key={i} className="comment-sentence-block">
                {renderParagraphWithBreaks(line)}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 右カラム：5 軸両極スライダー ===== */}
      <div className="total-right-panel">
        <div className="slider-legend-row">
          <span className="legend-item">
            <span className="legend-tri-actual">▼</span> 実測（本能）
          </span>
          <span className="legend-item">
            <span className="legend-tri-self">▼</span> 自己申告
          </span>
        </div>

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
