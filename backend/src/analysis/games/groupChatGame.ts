import { GroupChatGameData, groupChatGameDataSchema } from '../../schemas/games/groupChatGame';
import type { GameDetail } from '../../schemas/results';
import { linear, linearInv, logNorm, buildTopDeviationMetrics } from '../scoreUtils';

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
 * `answeredFirst` / `hoverChanged` / `avgReaction` は buildHighlights / feedbackGenerator で使用する。
 */
export type GroupChatGameAnalyzeResult = {
    scores: { cooperativeness: number; positivity: number; caution: number };
    conformRate: number;
    avgReactionMs: number;
    timeoutRate: number;
    /** ターン1で同期より先に回答したか */
    answeredFirst: boolean;
    /** 同期のタイピング後にホバー先が変わったか（null = データなし） */
    hoverChanged: boolean | null;
    /** 全ターンの平均反応時間（秒） */
    avgReaction: number;
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
            answeredFirst: false,
            hoverChanged: null,
            avgReaction: THRESHOLDS.reactionMs.fallback / 1000,
        };

    const turns = data.turns;

    // null を除外した平均。全 null の場合は fallback を返す。
    const nullAvg = (vals: (number | null)[], fallback: number): number => {
        const filtered = vals.filter((v): v is number => v !== null);
        return filtered.length === 0 ? fallback : filtered.reduce((a, b) => a + b, 0) / filtered.length;
    };

    // --- 協調性 ---
    // タイムアウトしたターンは「選択していない」ため同調にカウントしない（分母は 3 固定 = 非同調扱い）。
    const conformRate = turns.filter(
        (t) => !t.isTimeout && (t.selectedOptionId === 1 || t.selectedOptionId === 2),
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
    const avgReactionMs = turns.reduce((a, t) => a + t.reactionTimeMs, 0) / turns.length;
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

    // inputDeviceType が mouse 以外のときはマウス移動距離が無意味なため、
    // 正規化後スコアを中立値 50 に固定する（仕様書 ※注N6）。
    // raw 50 を logNorm(lo=100, ...) に渡すと下限クランプで 0 点になり中立にならないため、ここで直接 50 を入れる。
    const sMouseDist =
        data.inputDeviceType !== 'mouse'
            ? 50
            : logNorm(
                  turns.reduce((a, t) => a + t.mouseMovementDistance, 0) / turns.length,
                  THRESHOLDS.mouseMovementDist.lo,
                  THRESHOLDS.mouseMovementDist.hi,
              );

    const totalHoverSeqLen = turns.reduce((a, t) => a + t.hoverSequence.length, 0);
    const sHoverSeq = linear(totalHoverSeqLen, THRESHOLDS.hoverSeqLength.lo, THRESHOLDS.hoverSeqLength.hi);

    const totalScrollCount = turns.reduce((a, t) => a + t.scrolledChatHistoryCount, 0);
    const sScrollCount = linear(totalScrollCount, THRESHOLDS.scrollCount.lo, THRESHOLDS.scrollCount.hi);

    const sTutorial = logNorm(data.tutorialViewTime ?? 0, THRESHOLDS.tutorialViewTime.lo, THRESHOLDS.tutorialViewTime.hi);

    const reactionMean = turns.reduce((a, t) => a + t.reactionTimeMs, 0) / turns.length;
    const reactionStdDev = Math.sqrt(
        turns.reduce((a, t) => a + (t.reactionTimeMs - reactionMean) ** 2, 0) / turns.length,
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
        answeredFirst: data.turn1AnsweredBeforeColleagueA === true,
        hoverChanged: data.turn1HoverChangedAfterColleagueATyping,
        avgReaction: avgReactionMs / 1000,
    };
}

/**
 * 空気読みグループチャットの行動データ + analyze 結果 → 結果画面 highlights 用のカード配列。
 */
function buildHighlights(data: GroupChatGameData | undefined, result: GroupChatGameAnalyzeResult) {
    void data;
    const answeredFirst = result.answeredFirst;
    const hoverChanged = result.hoverChanged ?? false;
    return [
        {
            text: `同期が動き出す前に返答${answeredFirst ? 'できました' : 'できませんでした'}。`,
            comparison: '全体の約40%が先手を取れています',
            reason: '先手を取れるかから〈積極性〉がわかるため',
        },
        {
            text: `他の人が動いたあと、選択肢への迷いが${hoverChanged ? 'ありました' : 'ありませんでした'}。`,
            comparison: '全体の約60%が影響を受けています',
            reason: '周囲の動きで意思が変わるかから〈協調性〉がわかるため',
        },
        {
            text: `返答までの平均時間は${result.avgReaction.toFixed(1)}秒。`,
            comparison: '平均は約3秒',
            reason: '即断か熟考かから〈積極性・慎重さ〉がわかるため',
        },
    ];
}

/**
 * 空気読みグループチャットの行動データ → 結果画面に表示するサマリーテキスト。
 */
function buildSummary(data: GroupChatGameData | undefined): string {
    if (!data) return 'データなし';

    const turns = data.turns;
    const conformRate =
        turns.filter((t) => !t.isTimeout && (t.selectedOptionId === 1 || t.selectedOptionId === 2))
            .length / 3;
    const avgReactionMs = turns.reduce((sum, t) => sum + t.reactionTimeMs, 0) / turns.length;

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

/** 空気読みグループチャットの解析コメント（軸スコアの根拠を複数文で説明） */
function buildAnalysisComment(data: GroupChatGameData, result: GroupChatGameAnalyzeResult): string[] {
    const comments: string[] = [];

    // 積極性（answeredFirst）
    if (result.answeredFirst) {
        comments.push(`ターン1で同僚より先に回答。場の流れを待たず動く積極性が「積極性」の高スコアにつながっています。`);
    } else if (data.turn1AnsweredBeforeColleagueA === null) {
        comments.push(`タイムアウトにより先手行動の測定ができませんでした。`);
    } else {
        comments.push(`同僚の動きを確認してから回答するパターンが見られました。様子を見てから動く行動が「積極性」のスコアに表れています。`);
    }

    // 協調性（hoverChanged）
    if (result.hoverChanged === true) {
        comments.push(`同僚の入力中にホバー先を変えていました。周囲への反応が「協調性」の高スコアにつながっています。`);
    } else if (result.hoverChanged === false) {
        comments.push(`周囲の動きに左右されず最初の選択を維持。自分軸の強さが「協調性」のスコアに表れています。`);
    }

    // 慎重さ（avgReaction は秒単位）
    const avgSec = result.avgReaction;
    if (avgSec > 4.0) {
        comments.push(`返答までの平均${avgSec.toFixed(1)}秒と、じっくり考えてから選ぶ行動が「慎重さ」に反映されています。`);
    } else if (avgSec < 2.0) {
        comments.push(`素早いテンポで返答が続きました。直感で動く行動パターンが「慎重さ」のスコアに表れています。`);
    } else {
        comments.push(`返答までの平均${avgSec.toFixed(1)}秒と、標準的なテンポで進みました。`);
    }

    return comments;
}

/** 空気読みグループチャットの行動データカード用 褒め言葉マップ */
const GROUP_PRAISE_MAP: Record<string, { above: string; below: string }> = {
    '同調率(%)': {
        above: '場の雰囲気を自然に読み取れる！チームワークを大切にする協力的なタイプ。',
        below: '周りに流されない自分軸を持っている！自立した判断力が光る。',
    },
    '反応時間平均(ms)': {
        above: 'じっくり考えてから発言する思慮深さがある！言葉を大切にする誠実なコミュニケーター。',
        below: 'テンポよく会話に参加できる！コミュニケーション力が高く場が盛り上がる存在。',
    },
    'タイムアウト率(%)': {
        above: '慎重に考えるあまり迷ってしまうことも。それだけ真剣に向き合っている証拠。',
        below: '時間内に判断できる決断力がある！プレッシャーの中でも動ける実力派。',
    },
    '先回り回答': {
        above: '場の先頭に立って動ける行動力がある！リーダーシップを自然に発揮できるタイプ。',
        below: '周りの状況を把握してから動く観察力がある！場の空気を読む感受性の高い持ち主。',
    },
};

/**
 * 空気読みグループチャットの行動データ + analyze 結果 → 結果画面 details 用の構造体。
 */
function buildDetails(
    data: GroupChatGameData | undefined,
    result: GroupChatGameAnalyzeResult,
): GameDetail {
    const metrics = [
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
    ];

    return {
        game_id: groupChatGameModule.id,
        title: groupChatGameModule.title,
        feature_scores: [
            { axis: 'cooperativeness', name: '協調性', score: result.scores.cooperativeness },
            { axis: 'positivity',      name: '積極性', score: result.scores.positivity },
            { axis: 'caution',         name: '慎重さ', score: result.scores.caution },
        ],
        metrics,
        analysis_comment: data ? buildAnalysisComment(data, result) : [],
        top_deviation_metrics: buildTopDeviationMetrics(metrics, GROUP_PRAISE_MAP),
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
    buildHighlights: (data: unknown, result: unknown) =>
        buildHighlights(data as GroupChatGameData | undefined, result as GroupChatGameAnalyzeResult),
};
