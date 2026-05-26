/**
 * 5 軸スコア（0-100）計算で各ゲームモジュールが共通で使うユーティリティ。
 *
 * Issue #100 で `analysis/games/<game>.ts` への分離を行うにあたり、
 * 旧 `scoreCalculator.ts` 内に閉じていた共通関数群をここに切り出した。
 *
 * 切り出し動機:
 * - モジュール化後、`analysis/games/*` から `scoreCalculator.ts` への逆方向依存
 *   （後続 Phase 3 で aggregator になる予定のファイル）が発生するのを避ける
 * - 各モジュールに同じユーティリティをコピペすると DRY 違反かつ閾値変更時に齟齬が生じる
 *
 * 計算式・挙動は旧 `scoreCalculator.ts` の同名関数と完全に同一（純粋なファイル移動）。
 */

/**
 * 0-100 にクランプして整数化。最終スコアの確定で使う。
 */
export const safeScore = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

/**
 * 0-100 にクランプ（小数値のまま）。中間値の正規化で使う。
 */
export const clamp = (v: number) => Math.max(0, Math.min(100, v));

/**
 * 線形正規化: `min` を 0、`max` を 100 にマップする（範囲外はクランプ）。
 *
 * 「値が大きいほど高得点」のメトリクスに使う。
 */
export const linear = (val: number, min: number, max: number) =>
    clamp(((val - min) / (max - min)) * 100);

/**
 * 線形正規化（反転）: `best` を 100、`worst` を 0 にマップする（範囲外はクランプ）。
 *
 * 「値が小さいほど高得点」のメトリクス（迷い時間・ブレ等）に使う。
 */
export const linearInv = (val: number, best: number, worst: number) =>
    clamp(100 - ((val - best) / (worst - best)) * 100);

/**
 * 対数正規化: `[min, max]` の範囲で `log(val + 1)` を 0-100 にマップする。
 *
 * 値域が広く（数 ms ～ 数十秒など）、低～中域の差を強調したいメトリクスに使う。
 * `min` と `max` を等しく設定した場合は 0 を返す（ゼロ除算防止）。
 */
export const logNorm = (val: number, min: number, max: number) => {
    const safe = Math.max(min, Math.min(max, val));
    const num = Math.log(safe + 1) - Math.log(min + 1);
    const den = Math.log(max + 1) - Math.log(min + 1);
    return den === 0 ? 0 : clamp((num / den) * 100);
};

/**
 * シグモイド正規化（反転）: 中心 `c` で 50 点、傾き `k` で立ち上がりを制御する。
 *
 * 「閾値付近で急激に評価が変わる」メトリクス（音量安定性など）に使う。
 */
export const sigmoidInv = (val: number, c: number, k = 0.4) =>
    clamp(100 - 100 / (1 + Math.exp(-k * (val - c))));

// ---------------------------------------------------------------------------
// 行動データカード（top_deviation_metrics）用ユーティリティ
// ---------------------------------------------------------------------------

/**
 * 行動データカードの1件分。
 * `deviation` = |user - average| / |average|（average = 0 の場合は絶対差）。
 */
export type TopDeviationMetric = {
    label: string;
    user: number;
    average: number;
    deviation: number;
    praise: string;
};

/**
 * メトリクス配列から平均との相対乖離が大きい順に上位 N 件を返す。
 * 各件には `praiseMap` から方向（user >= average → above / below）で引いた褒め言葉を付与する。
 *
 * @param metrics    buildDetails の `metrics` 配列と同形
 * @param praiseMap  label → { above: string; below: string }
 * @param topN       返す件数（デフォルト 4）
 */
export function buildTopDeviationMetrics(
    metrics: { label: string; user: number; average: number; category: string }[],
    praiseMap: Record<string, { above: string; below: string }>,
    topN = 4,
): TopDeviationMetric[] {
    return metrics
        .map((m) => {
            const deviation =
                m.average !== 0
                    ? Math.abs(m.user - m.average) / Math.abs(m.average)
                    : Math.abs(m.user - m.average);
            const praise =
                m.user >= m.average
                    ? (praiseMap[m.label]?.above ?? '')
                    : (praiseMap[m.label]?.below ?? '');
            return { label: m.label, user: m.user, average: m.average, deviation, praise };
        })
        .sort((a, b) => b.deviation - a.deviation)
        .slice(0, topN);
}
