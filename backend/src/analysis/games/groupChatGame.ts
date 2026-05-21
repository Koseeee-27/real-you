import { GroupChatGameData, groupChatGameDataSchema } from '../../schemas/games/groupChatGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv, logNorm } from '../scoreUtils';

/**
 * 空気読みグループチャット（group_chat_game）の分析モジュール。
 *
 * 3 ターン実装（Task 2）として旧 5 ステージ版を全面置き換え。
 * 評価軸: 協調性・積極性・慎重さ
 */

/**
 * 分析で使う閾値定数。
 * 値は仕様書「閾値の根拠 Game 3」の初期値。
 */
const THRESHOLDS = {
    typingReact:           { lo: 0,    hi: 5000  },
    reactionMs:            { best: 1000, worst: 8000, fallback: 8000 },
    firstHoverMs:          { best: 500,  worst: 5000, fallback: 5000 },
    timeoutRate:           { best: 0,    worst: 1                    },
    finalChoiceHoverOrder: { lo: 1,    hi: 4,    fallback: 2.5       },
    decisionConfidenceMs:  { lo: 0,    hi: 2000, fallback: 0         },
    mouseMovementDist:     { lo: 100,  hi: 3000, fallback: 50        },
    hoverSeqLength:        { lo: 0,    hi: 15                        },
    scrollCount:           { lo: 0,    hi: 5                         },
    tutorialViewTime:      { lo: 2000, hi: 30000                     },
    reactionStdDev:        { best: 500, worst: 5000                  },
} as const;

/**
 * 各軸スコアの重み定数。
 * 合計が 1.0 になるよう維持すること。
 */
const WEIGHTS = {
    cooperativeness: { conformRate: 0.50, typingReact: 0.30, hoverChanged: 0.20 },
    positivity:      { answeredFirst: 0.40, reactionMs: 0.30, firstHoverMs: 0.20, timeoutRate: 0.10 },
    caution: {
        finalChoiceHoverOrder: 0.15,
        decisionConfidenceMs:  0.15,
        mouseMovementDist:     0.15,
        hoverSeqLength:        0.15,
        scrollCount:           0.10,
        tutorialViewTime:      0.10,
        reactionStdDev:        0.20,
    },
} as const;

/**
 * `analyze()` の戻り値型。
 * `conformRate` / `avgReactionMs` / `timeoutRate` は buildDetails / buildSummary でも参照する。
 */
export type GroupChatGameAnalyzeResult = {
    scores: { cooperativeness: number; positivity: number; caution: number };
    conformRate: number;
    avgReactionMs: number;
    timeoutRate: number;
};

/**
 * 空気読みグループチャットの行動データ → 協調性・積極性・慎重さの中間集計。
 */
function analyze(data: GroupChatGameData | undefined): GroupChatGameAnalyzeResult {
    if (!data)
        return {
            scores: { cooperativeness: 50, positivity: 50, caution: 50 },
            conformRate: 0,
            avgReactionMs: THRESHOLDS.reactionMs.fallback,
            timeoutRate: 0,
        };

    const turns = data.turns;

    // null を除外した平均。全 null の場合は fallback を返す。
    const nullAvg = (vals: (number | null)[], fallback: number): number => {
        const filtered = vals.filter((v): v is number => v !== null);
        return filtered.length === 0 ? fallback : filtered.reduce((a, b) => a + b, 0) / filtered.length;
    };

    // --- 協調性 ---
    const conformRate = turns.filter(
        (t) => t.selectedOptionId === 1 || t.selectedOptionId === 2,
    ).length / 3;
    const sConformRate = linear(conformRate, 0, 1);
    const sTypingReact = logNorm(
        data.turn1TypingIndicatorReactTimeMs ?? 0,
        THRESHOLDS.typingReact.lo,
        THRESHOLDS.typingReact.hi,
    );
    const sHoverChanged =
        data.turn1HoverChangedAfterColleagueATyping === true  ? 100
        : data.turn1HoverChangedAfterColleagueATyping === false ? 0
        : 50; // null = 中立（仕様書 ※注N2）
    const cooperativeness = Math.round(
        sConformRate  * WEIGHTS.cooperativeness.conformRate
        + sTypingReact  * WEIGHTS.cooperativeness.typingReact
        + sHoverChanged * WEIGHTS.cooperativeness.hoverChanged,
    );

    // --- 積極性 ---
    const sAnsweredFirst = data.turn1AnsweredBeforeColleagueA === true ? 100 : 0; // null も 0（仕様書 ※注N3）
    const avgReactionMs = nullAvg(
        turns.map((t) => t.reactionTimeMs),
        THRESHOLDS.reactionMs.fallback,
    );
    const sReactionMs = linearInv(avgReactionMs, THRESHOLDS.reactionMs.best, THRESHOLDS.reactionMs.worst);
    const avgFirstHoverMs = nullAvg(
        turns.map((t) => t.firstHoverElapsedMs),
        THRESHOLDS.firstHoverMs.fallback,
    );
    const sFirstHoverMs = linearInv(avgFirstHoverMs, THRESHOLDS.firstHoverMs.best, THRESHOLDS.firstHoverMs.worst);
    const timeoutRate = turns.filter((t) => t.isTimeout).length / 3;
    const sTimeoutRate = linearInv(timeoutRate, THRESHOLDS.timeoutRate.best, THRESHOLDS.timeoutRate.worst);
    const positivity = Math.round(
        sAnsweredFirst * WEIGHTS.positivity.answeredFirst
        + sReactionMs   * WEIGHTS.positivity.reactionMs
        + sFirstHoverMs * WEIGHTS.positivity.firstHoverMs
        + sTimeoutRate  * WEIGHTS.positivity.timeoutRate,
    );

    // --- 慎重さ ---
    const avgFinalChoice = nullAvg(
        turns.map((t) => t.finalChoiceHoverOrder),
        THRESHOLDS.finalChoiceHoverOrder.fallback,
    );
    const sFinalChoice = linear(avgFinalChoice, THRESHOLDS.finalChoiceHoverOrder.lo, THRESHOLDS.finalChoiceHoverOrder.hi);

    const avgDecisionConf = nullAvg(
        turns.map((t) => t.decisionConfidenceMs),
        THRESHOLDS.decisionConfidenceMs.fallback,
    );
    const sDecisionConf = logNorm(avgDecisionConf, THRESHOLDS.decisionConfidenceMs.lo, THRESHOLDS.decisionConfidenceMs.hi);

    // inputDeviceType が mouse 以外のときはマウス移動距離を中立値 50 に固定（仕様書 ※注N6）
    const avgMouseDist =
        data.inputDeviceType !== 'mouse'
            ? 50
            : turns.reduce((a, t) => a + t.mouseMovementDistance, 0) / 3;
    const sMouseDist = logNorm(avgMouseDist, THRESHOLDS.mouseMovementDist.lo, THRESHOLDS.mouseMovementDist.hi);

    const totalHoverSeqLen = turns.reduce((a, t) => a + t.hoverSequence.length, 0);
    const sHoverSeq = linear(totalHoverSeqLen, THRESHOLDS.hoverSeqLength.lo, THRESHOLDS.hoverSeqLength.hi);

    const totalScrollCount = turns.reduce((a, t) => a + t.scrolledChatHistoryCount, 0);
    const sScrollCount = linear(totalScrollCount, THRESHOLDS.scrollCount.lo, THRESHOLDS.scrollCount.hi);

    const sTutorial = logNorm(data.tutorialViewTime ?? 0, THRESHOLDS.tutorialViewTime.lo, THRESHOLDS.tutorialViewTime.hi);

    const reactionMean = turns.reduce((a, t) => a + t.reactionTimeMs, 0) / 3;
    const reactionStdDev = Math.sqrt(
        turns.reduce((a, t) => a + (t.reactionTimeMs - reactionMean) ** 2, 0) / 3,
    );
    const sStdDev = linearInv(reactionStdDev, THRESHOLDS.reactionStdDev.best, THRESHOLDS.reactionStdDev.worst);

    const caution = Math.round(
        sFinalChoice   * WEIGHTS.caution.finalChoiceHoverOrder
        + sDecisionConf  * WEIGHTS.caution.decisionConfidenceMs
        + sMouseDist     * WEIGHTS.caution.mouseMovementDist
        + sHoverSeq      * WEIGHTS.caution.hoverSeqLength
        + sScrollCount   * WEIGHTS.caution.scrollCount
        + sTutorial      * WEIGHTS.caution.tutorialViewTime
        + sStdDev        * WEIGHTS.caution.reactionStdDev,
    );

    return {
        scores: { cooperativeness, positivity, caution },
        conformRate,
        avgReactionMs,
        timeoutRate,
    };
}

/**
 * 空気読みグループチャットの行動データ → 結果画面に表示するサマリーテキスト。
 */
function buildSummary(data: GroupChatGameData | undefined): string {
    if (!data) return 'データなし';

    const turns = data.turns;
    const conformRate =
        turns.filter((t) => t.selectedOptionId === 1 || t.selectedOptionId === 2).length / 3;
    const avgReactionMs =
        turns.length > 0
            ? turns.reduce((sum, t) => sum + t.reactionTimeMs, 0) / turns.length
            : THRESHOLDS.reactionMs.fallback;

    const socialText =
        conformRate >= 0.67
            ? '周りの空気を読んで行動し'
            : '自分の判断を優先し';
    const speedText =
        avgReactionMs < 3000
            ? '素早く決断しました。'
            : '慎重に考えてから選択しました。';

    return `${socialText}、${speedText}`;
}

/**
 * 空気読みグループチャットの行動データ + analyze 結果 → 結果画面 details 用の構造体。
 */
function buildDetails(
    data: GroupChatGameData | undefined,
    result: GroupChatGameAnalyzeResult,
): GameDetail {
    return {
        game_id: groupChatGameModule.id,
        title: groupChatGameModule.title,
        feature_scores: [
            { axis: 'cooperativeness', name: '協調性', score: result.scores.cooperativeness },
            { axis: 'positivity',      name: '積極性', score: result.scores.positivity },
            { axis: 'caution',         name: '慎重さ', score: result.scores.caution },
        ],
        metrics: [
            {
                label: '同調率(%)',
                user: Math.round(result.conformRate * 100),
                average: 67,
                category: 'social',
            },
            {
                label: '反応時間平均(ms)',
                user: Math.round(result.avgReactionMs),
                average: 3500,
                category: 'time',
            },
            {
                label: 'タイムアウト率(%)',
                user: Math.round(result.timeoutRate * 100),
                average: 10,
                category: 'input',
            },
            {
                label: '先回り回答',
                user: data?.turn1AnsweredBeforeColleagueA === true ? 1 : 0,
                average: 0.5,
                category: 'social',
            },
        ],
    };
}

/**
 * 空気読みグループチャット（group_chat_game）モジュール。
 * registry の `GameModuleEntry` 型に合わせて `unknown` 入力のアダプタを薄く挟む
 * （詳細は `termsGame.ts` の export コメント参照）。
 */
export const groupChatGameModule = {
    id: 'group_chat_game' as const,
    title: '空気読みグループチャット',
    schema: groupChatGameDataSchema,
    analyze: (data: unknown) => analyze(data as GroupChatGameData | undefined),
    buildSummary: (data: unknown) => buildSummary(data as GroupChatGameData | undefined),
    buildDetails: (data: unknown, result: unknown) =>
        buildDetails(data as GroupChatGameData | undefined, result as GroupChatGameAnalyzeResult),
};
