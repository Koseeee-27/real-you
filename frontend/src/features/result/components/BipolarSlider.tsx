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

  return (
    <div className="w-full mb-1">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* 左バッジ */}
        <div
          className="flex flex-col items-center flex-shrink-0"
          style={{ width: 84 }}
        >
          <span
            className="text-sm font-black px-2 py-1 rounded border-2 w-full text-center leading-tight"
            style={
              !isRight
                ? {
                    background: '#f87171',
                    color: '#fff',
                    borderColor: '#000',
                    boxShadow: '2px 2px 0 #000',
                  }
                : {
                    background: '#fff',
                    color: '#cbd5e1',
                    borderColor: '#cbd5e1',
                  }
            }
          >
            {poles.left}
          </span>
          <span
            className="text-xs font-black mt-1"
            style={{ color: !isRight ? '#f87171' : '#94a3b8' }}
          >
            {leftPct}%
          </span>
        </div>

        {/* トラック */}
        <div className="relative flex-1" style={{ paddingTop: 22 }}>
          {/* ▼ ベースラインマーカー（baseline_scores） */}
          {baselineScore !== undefined && (
            <div
              className="absolute text-xs text-red-500 leading-none"
              style={{
                left: `${baselineScore}%`,
                top: 4,
                transform: 'translateX(-50%)',
              }}
            >
              ▼
            </div>
          )}

          {/* スライダーバー */}
          <div
            className="relative rounded-full border-2 border-black overflow-hidden"
            style={{ height: 17, background: '#e2e8f0' }}
          >
            {/* カラーフィル */}
            <div
              className="absolute top-0 h-full"
              style={{
                background: isRight ? '#4d85ff' : '#f87171',
                zIndex: 2,
                ...(isRight
                  ? { left: `${score}%`, right: 0 }
                  : { left: 0, width: `${score}%` }),
              }}
            />
            {/* ピン（縦線） */}
            <div
              className="absolute"
              style={{
                left: `${score}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 2,
                height: 18,
                background: '#000',
                zIndex: 4,
              }}
            />
          </div>
        </div>

        {/* 右バッジ */}
        <div
          className="flex flex-col items-center flex-shrink-0"
          style={{ width: 84 }}
        >
          <span
            className="text-sm font-black px-2 py-1 rounded border-2 w-full text-center leading-tight"
            style={
              isRight
                ? {
                    background: '#4d85ff',
                    color: '#fff',
                    borderColor: '#000',
                    boxShadow: '2px 2px 0 #000',
                  }
                : {
                    background: '#fff',
                    color: '#cbd5e1',
                    borderColor: '#cbd5e1',
                  }
            }
          >
            {poles.right}
          </span>
          <span
            className="text-xs font-black mt-1"
            style={{ color: isRight ? '#4d85ff' : '#94a3b8' }}
          >
            {rightPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
