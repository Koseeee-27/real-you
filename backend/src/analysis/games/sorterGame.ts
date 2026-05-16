import { SorterGameData, sorterGameDataSchema } from '../../schemas/games/sorterGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv } from '../scoreUtils';

/**
 * sorter_game の分析で使う閾値定数。
 * チームで合意後にここだけ変更すれば全スコア式に反映される。
 * 値は分析ロジック仕様書「閾値の根拠 Game 2」の初期値。
 */
const THRESHOLDS = {
    hesitation: { best: 200, worst: 4000 },
    cancelCount: { best: 0, worst: 5, fallback: 0 },
    wrongSortRate: { best: 0, worst: 0.3 },
    panicClick: { best: 0, worst: 10, fallback: 0 },
    adaptMs: { best: 0, worst: 20000, fallback: 20000 },
    concentration: { lo: 0, hi: 1 },
} as const;

/**
 * 各軸スコアの重み定数。
 * 合計が 1.0 になるよう維持すること。
 */
const WEIGHTS = {
    caution: { hesitation: 0.7, cancel: 0.3 },
    calmness: { wrongRate: 0.5, panic: 0.3, concentration: 0.2 },
    logic: { adapt: 0.7, concentration: 0.3 },
} as const;

/**
 * concentration の最低サンプル数閾値。
 * 誤仕分けが少なすぎる場合に中立値 0.5 を使う。
 * 仕様書「※注9」参照。実装段階で決定後に本書を更新する（暗定 3）。
 */
const MIN_SAMPLE_FOR_CONCENTRATION = 3;

export type SorterGameAnalyzeResult = {
    scores: { caution: number; calmness: number; logic: number; positivity: number };
    avgHesitationMs: number;
    wrongSortRate: number;
    concentration: number;
};

function analyze(data: SorterGameData | undefined): SorterGameAnalyzeResult {
    if (!data)
        return {
            scores: { caution: 50, calmness: 50, logic: 50, positivity: 50 },
            avgHesitationMs: 0,
            wrongSortRate: 0,
            concentration: 0.5,
        };

    // --- 誤仕分け率 ---
    const sortEventCount = data.events.filter((e) => e.eventType === 'sort').length;
    const wrongSortRate = Math.min(1, data.wrongSortCount / Math.max(1, sortEventCount));

    // --- 誤仕分け集中度（concentration）---
    // wrongPatterns の全エントリ数値を1配列にまとめ max/sum で算出
    const allCounts: number[] = [
        ...Object.values(data.wrongPatterns.urgent ?? {}),
        ...Object.values(data.wrongPatterns.fragile ?? {}),
        ...Object.values(data.wrongPatterns.heavy ?? {}),
    ].filter((v): v is number => typeof v === 'number');

    const sumCounts = allCounts.reduce((a, b) => a + b, 0);
    const concentration =
        data.wrongSortCount < MIN_SAMPLE_FOR_CONCENTRATION || sumCounts === 0
            ? 0.5
            : Math.max(...allCounts) / sumCounts;

    // --- 慎重さ ---
    // 平均判断時間(0.70) + やり直し・取り消し回数(0.30)
    const sCaution =
        linearInv(
            data.averageHesitationMs,
            THRESHOLDS.hesitation.best,
            THRESHOLDS.hesitation.worst,
        ) *
            WEIGHTS.caution.hesitation +
        linearInv(data.cancelCount, THRESHOLDS.cancelCount.best, THRESHOLDS.cancelCount.worst) *
            WEIGHTS.caution.cancel;

    // --- 冷静さ ---
    // 誤仕分け率(0.50) + 凍結中パニッククリック(0.30) + 誤仕分け集中度(冷静さ向け)(0.20)
    // 冷静さ向け集中度は linear（散発=パニック=低得点 / 一貫=落ち着き=高得点）
    const sCalmness =
        linearInv(wrongSortRate, THRESHOLDS.wrongSortRate.best, THRESHOLDS.wrongSortRate.worst) *
            WEIGHTS.calmness.wrongRate +
        linearInv(data.panicClickCount, THRESHOLDS.panicClick.best, THRESHOLDS.panicClick.worst) *
            WEIGHTS.calmness.panic +
        linear(concentration, THRESHOLDS.concentration.lo, THRESHOLDS.concentration.hi) *
            WEIGHTS.calmness.concentration;

    // --- 論理性 ---
    // ルール変更適応速度(0.70) + 誤仕分け集中度(論理性向け)(0.30)
    // 論理性向け集中度は linearInv（散らばり=高得点 / 一貫した誤認知=低得点）
    const adaptMs = data.ruleChangeAdaptMs ?? THRESHOLDS.adaptMs.fallback;
    const sLogic =
        linearInv(adaptMs, THRESHOLDS.adaptMs.best, THRESHOLDS.adaptMs.worst) * WEIGHTS.logic.adapt +
        linearInv(concentration, THRESHOLDS.concentration.lo, THRESHOLDS.concentration.hi) *
            WEIGHTS.logic.concentration;

    // --- 積極性 ---
    // ルール変更適応速度(1.00)
    const sPositivity = linearInv(adaptMs, THRESHOLDS.adaptMs.best, THRESHOLDS.adaptMs.worst);

    return {
        scores: {
            caution: Math.round(sCaution),
            calmness: Math.round(sCalmness),
            logic: Math.round(sLogic),
            positivity: Math.round(sPositivity),
        },
        avgHesitationMs: data.averageHesitationMs,
        wrongSortRate,
        concentration,
    };
}

function buildSummary(data: SorterGameData | undefined): string {
    if (!data) return 'データなし';

    const adaptText =
        data.ruleChangeAdaptMs != null
            ? `ルール変更には ${(data.ruleChangeAdaptMs / 1000).toFixed(1)} 秒で適応しました。`
            : 'ルール変更には適応できませんでした。';

    const panicText =
        data.panicClickCount > 5
            ? 'システム障害中に焦りが見られました。'
            : 'システム障害中も落ち着いて待てました。';

    return `${adaptText}${panicText}`;
}

function buildDetails(data: SorterGameData | undefined, result: SorterGameAnalyzeResult): GameDetail {
    return {
        game_id: sorterGameModule.id,
        title: sorterGameModule.title,
        feature_scores: [
            { axis: 'caution', name: '慎重さ', score: result.scores.caution },
            { axis: 'calmness', name: '冷静さ', score: result.scores.calmness },
            { axis: 'logic', name: '論理性', score: result.scores.logic },
            { axis: 'positivity', name: '積極性', score: result.scores.positivity },
        ],
        metrics: [
            {
                label: '平均判断時間(ms)',
                user: Math.round(result.avgHesitationMs),
                average: 1500,
                category: 'time',
            },
            {
                label: '誤仕分け率(%)',
                user: Math.round(result.wrongSortRate * 100),
                average: 15,
                category: 'sort',
            },
            {
                label: '流出ミス(回)',
                user: data?.outflowMissCount ?? 0,
                average: 2,
                category: 'sort',
            },
            {
                label: 'パニッククリック(回)',
                user: data?.panicClickCount ?? THRESHOLDS.panicClick.fallback,
                average: 3,
                category: 'input',
            },
            {
                label: 'ルール適応速度(ms)',
                user: data?.ruleChangeAdaptMs ?? THRESHOLDS.adaptMs.fallback,
                average: 5000,
                category: 'time',
            },
        ],
    };
}

export const sorterGameModule = {
    id: 'sorter_game' as const,
    title: '荷物仕分けゲーム',
    schema: sorterGameDataSchema,
    analyze: (data: unknown) => analyze(data as SorterGameData | undefined),
    buildSummary: (data: unknown) => buildSummary(data as SorterGameData | undefined),
    buildDetails: (data: unknown, result: unknown) =>
        buildDetails(data as SorterGameData | undefined, result as SorterGameAnalyzeResult),
};
