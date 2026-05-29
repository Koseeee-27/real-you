'use client';

import { useEffect, useState } from 'react';

// 各軸の左端ラベル（0側）と右端ラベル（100側）
export const AXIS_POLES: Record<string, { left: string; right: string }> = {
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

  // 各側の表示パーセント（左右対称: 常に leftPct=100-score, rightPct=score）
  const leftPct = 100 - score;
  const rightPct = score;

  // フィルとピンは常に (100-score)% の位置を境界とする
  const boundary = 100 - score;

  // マウント後に false → true へ切り替え、CSS transition でバー/ピンを
  // 「空」の状態から実値まで伸ばすアニメーションを発火させる。
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 境界（ピン位置）。アニメ前は各ポール端（左モード=0% / 右モード=100%）に寄せ、
  // アニメ後に boundary% へ。fill は端から伸びる形になる。
  const pinLeft = animated ? `${boundary}%` : isRight ? '100%' : '0%';

  const fillStyle: React.CSSProperties = isRight
    ? {
        background: '#4d85ff',
        left: animated ? `${boundary}%` : '100%',
        right: 0,
      }
    : {
        background: '#f97316',
        left: 0,
        width: animated ? `${boundary}%` : '0%',
      };

  // ===== 自己申告 ▼ の可視化 =====
  // 表示座標系は pin と同じく (100 - 値)%。
  const hasBaseline = baselineScore !== undefined;
  const selfX = hasBaseline ? 100 - baselineScore : 0; // ▼ の x（自己申告）
  // 自己申告(点線) ↔ 実測(黒ピン) の差。2本の線の中間にこの数字を置く。
  // 符号は「色付き極（優勢側）の方向」基準。＋＝自己申告より実測が極寄り。
  const signedGap = hasBaseline
    ? isRight
      ? score - baselineScore
      : baselineScore - score
    : 0;
  const gap = Math.abs(signedGap);
  const gapLabel = `${signedGap > 0 ? '+' : signedGap < 0 ? '−' : '±'}${gap}`;
  const gapMidX = (selfX + boundary) / 2; // 点線(selfX) と 黒ピン(boundary) の中点

  return (
    <div className="mbti-slider-row-new">
      <div className="mbti-slider-track-new">
        {/* 左バッジ */}
        <div className="badge-pct-container">
          <span
            className={`mbti-badge-new ${!isRight ? 'btn-orange' : 'btn-white'}`}
          >
            {poles.left}
          </span>
          <span
            className={`badge-pct-under ${!isRight ? 'active-orange' : ''}`}
          >
            {leftPct}%
          </span>
        </div>

        {/* トラック */}
        <div className="slider-wrapper">
          <div className="slider-line-track">
            <div className="slider-color-fill" style={fillStyle} />
            <div className="slider-pin-point" style={{ left: pinLeft }} />
          </div>

          {/* 実測▼（黒）＋ 自己申告▼（赤）＋ グレー点線（baselineScore があるときのみ）
              座標は pin と同じ (100 - 値)% 系で揃える。 */}
          {hasBaseline && (
            <div className="gap-arrow-band">
              <div className="actual-tri" style={{ left: pinLeft }}>▼</div>
              <div className="self-tri" style={{ left: `${selfX}%` }}>
                ▼
              </div>
              <div className="self-guide-line" style={{ left: `${selfX}%` }} />
              {gap >= 5 && (
                <span className="gap-diff" style={{ left: `${gapMidX}%` }}>
                  {gapLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 右バッジ */}
        <div className="badge-pct-container">
          <span
            className={`mbti-badge-new ${isRight ? 'btn-blue' : 'btn-white'}`}
          >
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
