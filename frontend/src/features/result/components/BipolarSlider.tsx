'use client';

// 各軸の左端ラベル（0側）と右端ラベル（100側）
const AXIS_POLES: Record<string, { left: string; right: string }> = {
  caution: { left: '大胆', right: '慎重' },
  calmness: { left: '感情的', right: '冷静' },
  logic: { left: '直感的', right: '論理的' },
  cooperativeness: { left: '対立', right: '協調' },
  positivity: { left: '消極的', right: '積極的' },
};

type BipolarSliderProps = {
  /** スコア軸のキー（AXIS_POLES のキー） */
  axis: string;
  /** 実測スコア（0–100）。ピンの位置 */
  score: number;
  /**
   * ▼ マーカーを表示する位置（0–100）。
   * overview では baseline_scores（自己申告）を渡す。
   * 詳細画面では渡さない（マーカー非表示）。
   */
  baselineScore?: number;
};

/**
 * 両極スライダー行コンポーネント。
 *
 * - score < 50 → 左端からピンまでをオレンジで塗りつぶし、左バッジをオレンジにする
 * - score ≥ 50 → ピンから右端までをブルーで塗りつぶし、右バッジをブルーにする
 * - baselineScore が渡されると、トラック上方に赤い ▼ を表示する（MBTI目安）
 */
export default function BipolarSlider({
  axis,
  score,
  baselineScore,
}: BipolarSliderProps) {
  const poles = AXIS_POLES[axis] ?? { left: axis, right: axis };
  const isRight = score >= 50;

  // 各側の表示パーセント
  const leftPct = isRight ? 100 - score : score;
  const rightPct = isRight ? score : 100 - score;

  // カラーフィルのスタイル（score < 50 → 左起点オレンジ, score ≥ 50 → 右起点ブルー）
  const fillStyle: React.CSSProperties = isRight
    ? { background: '#4d85ff', left: `${score}%`, right: 0 }
    : { background: '#f87171', left: 0, width: `${score}%` };

  return (
    <div className="mbti-slider-row-new">
      <div className="mbti-slider-track-new">
        {/* 左バッジ */}
        <div className="badge-pct-container">
          <span className={`mbti-badge-new ${!isRight ? 'btn-orange' : 'btn-white'}`}>
            {poles.left}
          </span>
          <span className={`badge-pct-under ${!isRight ? 'active-orange' : ''}`}>
            {leftPct}%
          </span>
        </div>

        {/* トラック */}
        <div className="slider-wrapper">
          <div className="slider-line-track">
            <div className="slider-color-fill" style={fillStyle} />
            <div className="slider-pin-point" style={{ left: `${score}%` }} />
          </div>

          {/* ▼ ベースラインマーカー（baselineScore が渡されたときのみ） */}
          {baselineScore !== undefined && (
            <div className="average-marker-wrapper">
              <div className="average-marker" style={{ left: `${baselineScore}%` }}>
                ▼
              </div>
            </div>
          )}
        </div>

        {/* 右バッジ */}
        <div className="badge-pct-container">
          <span className={`mbti-badge-new ${isRight ? 'btn-blue' : 'btn-white'}`}>
            {poles.right}
          </span>
          <span className={`badge-pct-under ${isRight ? 'active-blue' : ''}`}>
            {rightPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
