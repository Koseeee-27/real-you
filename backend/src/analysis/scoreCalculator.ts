import { BaselineScores } from '../types';
import { Game1Data, Game2Data, Game3Data } from '../schemas/gameData';
import { generateFeedback } from './feedbackGenerator';
import { termsGameModule } from './games/termsGame';
import { helpdeskGameModule } from './games/helpdeskGame';
import { groupChatGameModule } from './games/groupChatGame';
import { safeScore } from './scoreUtils';

/**
 * 3ゲームの行動データから5軸特性を連続値(0-100)で算出する統合分析ロジック。
 *
 * Issue #100 で各ゲームの計算ロジック（旧 calculateGame1/2/3）と要約テキスト生成
 * （旧 buildPhaseSummaries）は `analysis/games/<game>.ts` に分離され、本ファイルは
 * 各モジュールの結果を統合してレスポンスに整形する役割に絞られた。
 *
 * 後続 Issue #102（aggregator 導入）で軸統合ロジック（5 軸の合算 / details / metrics 構築）
 * は更に `analysis/aggregator.ts` に切り出される予定。
 *
 * ▼評価軸定義
 * 慎重さ(caution):
 *   情報確認・迷い時間・再確認行動の多さから算出。
 *
 * 冷静さ(calmness):
 *   マウスのブレ、無駄操作、音量安定性、打鍵安定性から算出。
 *
 * 論理性(logic):
 *   再確認行動、論理接続詞使用、不要語の少なさから算出。
 *
 * 協調性(cooperativeness):
 *   同調率、譲り待機時間、本音葛藤行動から算出。
 *
 * 積極性(positivity):
 *   反応速度、発話量、即応性から算出。
 */

//統合生成

export function generateAnalysisResult(
    userId: string,
    selfMbti: string | undefined,
    game1Raw: Game1Data | undefined,
    game2Raw: Game2Data | undefined,
    game3Raw: Game3Data | undefined,
    baseline_scores: BaselineScores,
) {
    const g1 = termsGameModule.analyze(game1Raw);
    const g2 = helpdeskGameModule.analyze(game2Raw);
    const g3 = groupChatGameModule.analyze(game3Raw);

    // 配列形式（Phase 1 / Issue #97）。game_id は各モジュールの `id` フィールドを参照する
    // （Phase 3 / Issue #101 で `analysis/registry.ts` の `NORMAL_FLOW` 経由に置き換える予定）。
    // 配列順は terms_game → helpdesk_game → group_chat_game の通常フロー順。
    const phaseSummaries = [
        { game_id: termsGameModule.id, summary: termsGameModule.buildSummary(game1Raw) },
        { game_id: helpdeskGameModule.id, summary: helpdeskGameModule.buildSummary(game2Raw) },
        { game_id: groupChatGameModule.id, summary: groupChatGameModule.buildSummary(game3Raw) },
    ];

    const scores = {
        caution: safeScore((g1.caution + g3.caution) / 2),
        calmness: safeScore((g1.calmness + g2.calmness) / 2),
        logic: safeScore((g1.logic + g2.logic) / 2),
        cooperativeness: safeScore(g3.cooperativeness),
        positivity: safeScore((g2.positivity + g3.positivity) / 2),
    };

    const gaps = {
        caution: scores.caution - baseline_scores.caution,
        calmness: scores.calmness - baseline_scores.calmness,
        logic: scores.logic - baseline_scores.logic,
        cooperativeness: scores.cooperativeness - baseline_scores.cooperativeness,
        positivity: scores.positivity - baseline_scores.positivity,
    };

    const avgGap =
        (Math.abs(gaps.caution) +
            Math.abs(gaps.calmness) +
            Math.abs(gaps.logic) +
            Math.abs(gaps.cooperativeness) +
            Math.abs(gaps.positivity)) /
        5;

    const accuracy_score = safeScore(100 - avgGap);
    const feedback = generateFeedback(scores, gaps);

    return {
        user_id: userId,
        self_mbti: selfMbti,
        scores: scores,
        baseline_scores: baseline_scores,
        gaps: gaps,
        // game_breakdown は配列形式（Phase 1 / Issue #97）。game_id は各モジュールの `id`
        // フィールドを参照する（Phase 3 / Issue #101 で registry 経由に置き換え予定）。
        // 配列順は terms_game → helpdesk_game → group_chat_game の通常フロー順。
        game_breakdown: [
            {
                game_id: termsGameModule.id,
                scores: { caution: g1.caution, logic: g1.logic, calmness: g1.calmness },
            },
            {
                game_id: helpdeskGameModule.id,
                scores: { positivity: g2.positivity, calmness: g2.calmness, logic: g2.logic },
            },
            {
                game_id: groupChatGameModule.id,
                scores: {
                    cooperativeness: g3.cooperativeness,
                    positivity: g3.positivity,
                    caution: g3.caution,
                },
            },
        ],
        accuracy_score: accuracy_score,
        feedback: feedback,
        phase_summaries: phaseSummaries,

        // details も配列形式（Phase 1 / Issue #97）。配列順は game_breakdown と揃える
        // （terms_game → helpdesk_game → group_chat_game の通常フロー順）。
        details: [
            {
                game_id: termsGameModule.id,
                title: termsGameModule.title,
                feature_scores: [
                    { axis: 'caution', name: '慎重さ', score: g1.caution },
                    { axis: 'logic', name: '論理性', score: g1.logic },
                    { axis: 'calmness', name: '冷静さ', score: g1.calmness },
                ],
                // g1.averageSpeed / g1.reversalCount は termsGameModule.analyze() 内で
                // scrollEvents から算出済み（仕様書上、FE は scrollEvents のみ送信する設計のため、
                // raw_data には scrollMetrics は無い）
                metrics: [
                    {
                        label: '読了速度(px/s)',
                        user: Math.round(g1.averageSpeed ?? 0),
                        average: 800,
                        category: 'scroll',
                    },
                    {
                        label: '総滞在時間(秒)',
                        user: Number((game1Raw?.totalTime ?? 0).toFixed(1)),
                        average: 15.0,
                        category: 'time',
                    },
                    {
                        label: '決断前迷い(ms)',
                        user: game1Raw?.agreeButtonHoverTimeMs ?? 0,
                        average: 1200,
                        category: 'mouse',
                    },
                    {
                        label: 'チェック変更(回)',
                        user: g1.changedCount,
                        average: 3.2,
                        category: 'input',
                    },
                    {
                        label: '逆行確認(回)',
                        user: g1.reversalCount ?? 0,
                        average: 2.1,
                        category: 'scroll',
                    },
                    {
                        label: 'マウスブレ(px)',
                        user: game1Raw?.popupStats?.mouseJitter ?? 0,
                        average: 12.0,
                        category: 'mouse',
                    },
                    {
                        label: '無駄クリック(回)',
                        user: game1Raw?.popupStats?.clickCount ?? 0,
                        average: 1.5,
                        category: 'mouse',
                    },
                ],
            },
            {
                game_id: helpdeskGameModule.id,
                title: helpdeskGameModule.title,
                feature_scores: [
                    { axis: 'positivity', name: '積極性', score: g2.positivity },
                    { axis: 'calmness', name: '冷静さ', score: g2.calmness },
                    { axis: 'logic', name: '論理性', score: g2.logic },
                ],
                metrics: [
                    {
                        label: '反応潜時(ms)',
                        user: Math.round(g2.avgReact ?? 0),
                        average: 2500,
                        category: 'time',
                    },
                    {
                        label: '発話時間(秒)',
                        user: Number(((g2.totalSpeech ?? 0) / 1000).toFixed(1)),
                        average: 4.2,
                        category: 'time',
                    },
                    {
                        label: '平均音量(dB)',
                        user: Number((g2.avgVolume ?? 0).toFixed(1)),
                        average: -25.0,
                        category: 'voice',
                    },
                    {
                        label: '論理的接続詞(回)',
                        user: g2.logicWordsCount ?? 0,
                        average: 0.5,
                        category: 'logic',
                    },
                ],
            },
            {
                game_id: groupChatGameModule.id,
                title: groupChatGameModule.title,
                feature_scores: [
                    { axis: 'cooperativeness', name: '協調性', score: g3.cooperativeness },
                    { axis: 'positivity', name: '積極性', score: g3.positivity },
                ],
                metrics: [
                    {
                        label: '同調率(%)',
                        user: Math.round(
                            ((g3.conformCount ?? 0) / (game3Raw?.stages?.length || 1)) * 100,
                        ),
                        average: 75,
                        category: 'social',
                    },
                    {
                        label: '反応潜時(ms)',
                        user: Math.round(g3.avgReact ?? 0),
                        average: 3500,
                        category: 'time',
                    },
                    {
                        label: '本音ホバー(回)',
                        user: game3Raw?.hoveredOptions ?? 0,
                        average: 2.4,
                        category: 'mouse',
                    },
                    {
                        label: '譲り合い待機(ms)',
                        user: game3Raw?.typingIndicatorReactTimeMs ?? 0,
                        average: 2000,
                        category: 'time',
                    },
                ],
            },
        ],
    };
}
