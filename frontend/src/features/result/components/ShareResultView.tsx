'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ResultResponse } from '../types';
import { GAME_META } from '../data/gameMeta';
import BipolarSlider, { AXIS_POLES } from './BipolarSlider';

type ShareResultViewProps = {
  data: ResultResponse;
};

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

const AXES = [
  'caution',
  'calmness',
  'logic',
  'cooperativeness',
  'positivity',
] as const;

function sideLabel(axis: string, score: number): string {
  const poles = AXIS_POLES[axis] ?? { left: axis, right: axis };
  return score >= 50 ? poles.right : poles.left;
}

type GapHighlight = {
  gap: number;
  selfLabel: string;
  actualLabel: string;
  sameSide: boolean;
};

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

export default function ShareResultView({ data }: ShareResultViewProps) {
  const { feedback, scores, baseline_scores, details } = data;
  const gap = computeBiggestGap(scores, baseline_scores);
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const toggleGame = (gameId: string) => {
    setOpenGameId((prev) => (prev === gameId ? null : gameId));
  };

  return (
    <div className="share-page">
      {/* ===== ページラベル ===== */}
      <div className="share-app-label">Real You 行動解析REPORT</div>

      {/* ===== メインコンテンツ（2カラム on PC / 1カラム on SP） ===== */}
      <div className="share-main-grid">
        {/* 左カラム: タイトル + ギャップ + 解析コメント */}
        <div className="share-col">
          {/* タイトルカード */}
          <div className="share-title-card">
            <p className="share-preface">
              ゲームが導き出した、あなたの本当の姿は...
            </p>
            <h1 className="share-title">
              <span className="orange-highlight">{feedback.title}</span>
            </h1>
            {feedback.subtitle && (
              <p className="share-subtitle">{feedback.subtitle}</p>
            )}
          </div>

          {/* ギャップコールアウト */}
          {gap && (
            <div className="share-card">
              <span className="share-tag">最大のギャップ</span>
              {gap.gap <= 10 ? (
                <p className="share-gap-body">
                  自己認識と行動は
                  <span className="gap-actual">ほぼ一致</span>！
                </p>
              ) : gap.sameSide ? (
                <p className="share-gap-body">
                  自覚以上に
                  <span className="gap-actual">「{gap.actualLabel}」</span>
                  でした！
                </p>
              ) : (
                <p className="share-gap-body">
                  自分では
                  <span className="gap-self">「{gap.selfLabel}」</span>
                  のつもり、でも実際は
                  <span className="gap-actual">「{gap.actualLabel}」</span>！
                </p>
              )}
            </div>
          )}

          {/* 解析コメント */}
          <div className="share-card">
            <span className="share-tag">解析コメント</span>
            <div className="comment-body-text">
              {feedback.description.split('\n').map((line, i) => (
                <p key={i} className="comment-sentence-block">
                  {renderComment(line)}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム: 5軸スライダー */}
        <div className="share-col">
          <div className="share-card">
            <span className="share-tag">5つの性格軸</span>
            <div className="slider-legend-row" style={{ marginBottom: 12 }}>
              <span className="legend-item">
                <span className="legend-tri-actual">▼</span> 実測（本能）
              </span>
              <span className="legend-item">
                <span className="legend-tri-self">▼</span> 自己申告
              </span>
            </div>
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

      {/* ===== ゲーム別詳細（アコーディオン）===== */}
      <div className="share-games-section">
        <p className="share-section-label">ゲーム別くわしい結果</p>

        {details.map((detail) => {
          const meta = GAME_META[detail.game_id];
          if (!meta) return null;
          const Icon = meta.icon;
          const isOpen = openGameId === detail.game_id;

          return (
            <div key={detail.game_id} className="share-accordion">
              <button
                type="button"
                className="share-accordion-header"
                style={{ borderLeftColor: meta.color }}
                onClick={() => toggleGame(detail.game_id)}
              >
                <div className="share-accordion-title">
                  <Icon
                    style={{
                      width: 18,
                      height: 18,
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: meta.color, fontWeight: 900 }}>
                    {meta.label}
                  </span>
                  <span
                    style={{
                      color: '#666',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {detail.title}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp size={18} color="#666" />
                ) : (
                  <ChevronDown size={18} color="#666" />
                )}
              </button>

              {isOpen && (
                <div className="share-accordion-body">
                  {/* PC では2カラム: スライダー | コメント */}
                  <div className="share-accordion-inner-grid">
                    <div>
                      <p className="share-subsection-label">
                        このゲームで見えた性格
                      </p>
                      {detail.feature_scores.map((fs) => (
                        <BipolarSlider
                          key={fs.axis}
                          axis={fs.axis}
                          score={fs.score}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="share-subsection-label">解析コメント</p>
                      <div
                        className="comment-body-text"
                        style={{ fontSize: 13, lineHeight: 1.75 }}
                      >
                        {detail.analysis_comment.map((line, i) => (
                          <p key={i} className="comment-sentence-block">
                            {renderComment(line)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {detail.top_deviation_metrics.length > 0 && (
                    <>
                      <p
                        className="share-subsection-label"
                        style={{ marginTop: 14 }}
                      >
                        行動データ
                      </p>
                      <div className="share-data-grid">
                        {detail.top_deviation_metrics.map((m, i) => (
                          <div key={i} className="share-data-item">
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 900,
                                color: '#000',
                                marginBottom: 4,
                              }}
                            >
                              {m.label}
                            </div>
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: '#f87171',
                              }}
                            >
                              {m.user}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#475569',
                                fontWeight: 700,
                                marginBottom: 6,
                              }}
                            >
                              平均：{m.average}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                background: '#fffce8',
                                border: '1px dashed #f87171',
                                padding: '6px 8px',
                                borderRadius: 8,
                                color: '#334155',
                                lineHeight: 1.5,
                              }}
                            >
                              {m.praise}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== フッター CTA ===== */}
      <div className="share-footer">
        <p className="share-footer-copy">
          あなたも3つのゲームで、本当の自分を暴き出してみよう。
        </p>
        <Link href="/" className="share-cta-btn">
          自分も診断する →
        </Link>
        <p className="share-footer-brand">Real You — 行動解析REPORT</p>
      </div>
    </div>
  );
}
