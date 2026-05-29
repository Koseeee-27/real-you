import { AXIS_POLES } from '../components/BipolarSlider';

// ハイライト正規表現（BEが埋め込む数値 + 単位 / 『テキスト』引用）
export const COMBINED_RE =
  /(『[^』]+』|「[^」]+」|\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分))/g;
const NUM_RE = /^\d+\.?\d*(?:秒|%|回|px|ms|個|点|倍|分)$/;
const QUOTE_RE = /^(?:『[^』]+』|「[^」]+」)$/;

/** 解析コメントの1行を数値・引用ハイライト付きの JSX に変換する */
export function renderComment(text: string): React.ReactNode {
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

export type GapHighlight = {
  gap: number;
  selfLabel: string;
  actualLabel: string;
  sameSide: boolean;
};

/** score >= 50 を「右ポール側」とみなしてラベル化する */
export function sideLabel(axis: string, score: number): string {
  const poles = AXIS_POLES[axis] ?? { left: axis, right: axis };
  return score >= 50 ? poles.right : poles.left;
}

/** 5軸の中で「自己申告 ↔ 実測」のズレが最大の軸を抽出する */
export function computeBiggestGap(
  scores: Record<string, number>,
  baseline: Record<string, number>
): GapHighlight | null {
  const AXES = [
    'caution',
    'calmness',
    'logic',
    'cooperativeness',
    'positivity',
  ] as const;

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
