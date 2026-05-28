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

export default function GameDetailTab({
  detail,
  tabColor = '#3b82f6',
}: GameDetailTabProps) {
  const meta = GAME_META[detail.game_id];

  return (
    <div className="detail-layout-reconstructed">
      <div className="scrollable-card-body">
        {/* ======================================================
            Section A: スクショ + ゲーム紹介
           ====================================================== */}
        <div className="game-header-flex">
          {/* スクショプレースホルダー */}
          <div className="screenshot-placeholder-box">
            <Camera className="sc-icon-camera" />
            <span className="sc-text-main">プレイ画面（静止画）</span>
            {meta && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#475569',
                  marginTop: 4,
                  textAlign: 'center',
                  padding: '0 8px',
                }}
              >
                {detail.title}
              </span>
            )}
          </div>

          {/* ゲーム紹介 */}
          {meta && (
            <div className="intro-explanation-section" style={{ flex: 1 }}>
              <div className="intro-explanation-section-row">
                <div className="intro-title-row">{detail.title}</div>
                <div className="intro-body-paragraph">{meta.description}</div>
                <div
                  className="measure-traits-badge-box"
                  style={{ color: tabColor }}
                >
                  測る性格：{meta.measuredTraits}
                </div>
              </div>

              {/* スクロール誘導 */}
              <div className="scroll-indicator-row">
                ↓ 下にスクロールしてゲームで得た性格を確認 ↓
              </div>
            </div>
          )}
        </div>

        {/* ======================================================
            Section B: 性格スライダー + 解析コメント
           ====================================================== */}
        <div className="game-sliders-headline">
          このゲームで見えた「あなたの性格」
        </div>

        <div className="game-specific-sliders-section">
          {/* 左半分: feature_scores スライダー群 */}
          <div className="total-left-panel-detail">
            {detail.feature_scores.map((fs) => (
              <BipolarSlider
                key={fs.axis}
                axis={fs.axis}
                score={fs.score}
                /* 詳細画面は baseline ▼ マーカーなし */
              />
            ))}
          </div>

          {/* 右半分: 解析コメントボックス */}
          <div className="comment-container-detail">
            <div className="comment-header-tag-detail">解析コメント</div>
            <div className="comment-body-text">
              {detail.analysis_comment.map((line, i) => (
                <p key={i} style={{ margin: '0 0 4px' }}>
                  {renderComment(line)}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* スクロール誘導境界 */}
        <div className="scroll-indicator-row">
          ↓ 下にスクロールして実計測の行動エビデンスを確認 ↓
        </div>

        {/* ======================================================
            Section C: top_deviation_metrics 2×2 グリッド
           ====================================================== */}
        <div className="evidence-list-container">
          <div className="game-sliders-headline">
            その他に測っていた行動データ
          </div>

          <div className="data-grid">
            {detail.top_deviation_metrics.map((m, i) => (
              <div key={i} className="data-item">
                <div>
                  <div className="data-title">{m.label}</div>
                  <div className="data-value">{m.user}</div>
                  <div
                    style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}
                  >
                    平均：{m.average}
                  </div>
                </div>
                <div className="why-text">{m.praise}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 下部余白 */}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
