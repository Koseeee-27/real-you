'use client';

import type { ResultResponse } from '../types';
import BipolarSlider from './BipolarSlider';
import { renderComment, computeBiggestGap } from '../utils/commentUtils';

type OverviewTabProps = {
  data: ResultResponse;
};

const AXES = [
  'caution',
  'calmness',
  'logic',
  'cooperativeness',
  'positivity',
] as const;

export default function OverviewTab({ data }: OverviewTabProps) {
  const { feedback, scores, baseline_scores } = data;
  const gap = computeBiggestGap(scores, baseline_scores);

  return (
    <div className="total-layout-reconstructed">
      {/* ===== 左カラム：タイトル + サブタイトル + 解析コメント ===== */}
      <div className="total-left-panel">
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

          {gap && (
            <div className="gap-callout">
              <span className="gap-callout-tag">最大のギャップ</span>
              {gap.gap <= 10 ? (
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
                {renderComment(line)}
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
