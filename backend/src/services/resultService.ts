import { userRepository } from '../repositories/userRepository';
import { gameRepository } from '../repositories/gameRepository';
import { calculateGame1Scores, calculateGame2Scores, calculateGame3Scores, combineScores } from '../analysis/scoreCalculator';
import { analysisResultRepository, AnalysisResultRow } from '../repositories/analysisResultRepository';

import { generateFeedback } from '../analysis/feedbackGenerator';
import { buildPhaseSummaries } from '../analysis/phaseSummaryBuilder';
import { getMbtiScores } from '../analysis/mbtiScoreTable';
import { BaselineScores, ResultResponse, GameBreakdown } from '../types';

export const resultService = {
    async getResult(userId: string): Promise<ResultResponse> {
        // ユーザー取得
        const user = await userRepository.findById(userId);
        if (!user) {
            throw { status: 404, code: 'user_not_found', message: 'User not found' };
        }

        // ベースラインスコア組み立て（キャッシュ有無に関わらず必要）
        const baseline_scores: BaselineScores = {
            caution: user.baseline_caution,
            calmness: user.baseline_calmness,
            logic: user.baseline_logic,
            cooperativeness: user.baseline_coop,
            positivity: user.baseline_positive,
        };

        // キャッシュ確認：analysis_results にあればそこから返す
        const cached = await analysisResultRepository.findByUserId(userId);
        if (cached) {
            return this.buildResponseFromCache(userId, user.self_mbti, baseline_scores, cached);
        }

        // キャッシュなし → ゲームログから計算
        const gameLogs = await gameRepository.findLogsByUserId(userId);
        if (gameLogs.length < 3) {
            throw { status: 400, code: 'incomplete_games', message: 'All games must be completed' };
        }

        // 分析（analysis/ に委譲）
        const game1Data = gameLogs.find(log => log.game_type === 1);
        const game2Data = gameLogs.find(log => log.game_type === 2);
        const game3Data = gameLogs.find(log => log.game_type === 3);

        const game1Scores = game1Data ? calculateGame1Scores(game1Data.raw_data) : {};
        const game2Scores = game2Data ? calculateGame2Scores(game2Data.raw_data) : {};
        const game3Scores = game3Data ? calculateGame3Scores(game3Data.raw_data) : {};
        const scores = combineScores(game1Scores, game2Scores, game3Scores);

        // ギャップ計算
        const gaps: BaselineScores = {
            caution: scores.caution - baseline_scores.caution,
            calmness: scores.calmness - baseline_scores.calmness,
            logic: scores.logic - baseline_scores.logic,
            cooperativeness: scores.cooperativeness - baseline_scores.cooperativeness,
            positivity: scores.positivity - baseline_scores.positivity,
        };

        // 自己認識精度スコア（全5軸のギャップ絶対値の平均を100から引く）
        const gapValues = Object.values(gaps).map(v => Math.abs(v));
        const avgGap = gapValues.reduce((sum, v) => sum + v, 0) / gapValues.length;
        const accuracy_score = Math.max(0, Math.round(100 - avgGap));

        // フェーズ別サマリー（analysis/ に委譲）
        const phase_summaries = buildPhaseSummaries(
            game1Data?.raw_data,
            game2Data?.raw_data,
            game3Data?.raw_data,
        );

        // フィードバック生成（analysis/ に委譲）
        const feedback = generateFeedback(scores, gaps);

        const game_breakdown: GameBreakdown = {
            game_1: game1Scores,
            game_2: game2Scores,
            game_3: game3Scores,
        };

        // MBTI理論値スコア
        const mbti_scores = user.self_mbti ? getMbtiScores(user.self_mbti) : null;

        // analysis_results にキャッシュとして保存
        const cacheRow: AnalysisResultRow = {
            user_id: userId,
            score_caution: scores.caution,
            score_calmness: scores.calmness,
            score_logic: scores.logic,
            score_coop: scores.cooperativeness,
            score_positive: scores.positivity,
            mbti_caution: mbti_scores?.caution ?? null,
            mbti_calmness: mbti_scores?.calmness ?? null,
            mbti_logic: mbti_scores?.logic ?? null,
            mbti_coop: mbti_scores?.cooperativeness ?? null,
            mbti_positive: mbti_scores?.positivity ?? null,
            gap_caution: gaps.caution,
            gap_calmness: gaps.calmness,
            gap_logic: gaps.logic,
            gap_coop: gaps.cooperativeness,
            gap_positive: gaps.positivity,
            feedback_title: feedback.title,
            feedback_description: feedback.description,
            feedback_gap_point: feedback.gap_point,
            game_contributions: game_breakdown,
            accuracy_score,
            phase_summaries,
        };

        await analysisResultRepository.save(cacheRow);

        return {
            user_id: userId,
            self_mbti: user.self_mbti,
            mbti_scores,
            scores,
            baseline_scores,
            gaps,
            game_breakdown,
            feedback,
            accuracy_score,
            phase_summaries,
        };
    },

    /**
     * キャッシュ済みデータからレスポンスを組み立てる
     */
    buildResponseFromCache(
        userId: string,
        selfMbti: string | null,
        baselineScores: BaselineScores,
        cached: AnalysisResultRow,
    ): ResultResponse {
        return {
            user_id: userId,
            self_mbti: selfMbti,
            mbti_scores: (cached.mbti_caution !== null) ? {
                caution: cached.mbti_caution,
                calmness: cached.mbti_calmness!,
                logic: cached.mbti_logic!,
                cooperativeness: cached.mbti_coop!,
                positivity: cached.mbti_positive!,
            } : null,
            scores: {
                caution: cached.score_caution,
                calmness: cached.score_calmness,
                logic: cached.score_logic,
                cooperativeness: cached.score_coop,
                positivity: cached.score_positive,
            },
            baseline_scores: baselineScores,
            gaps: {
                caution: cached.gap_caution,
                calmness: cached.gap_calmness,
                logic: cached.gap_logic,
                cooperativeness: cached.gap_coop,
                positivity: cached.gap_positive,
            },
            game_breakdown: cached.game_contributions,
            feedback: {
                title: cached.feedback_title,
                description: cached.feedback_description,
                gap_point: cached.feedback_gap_point,
            },
            accuracy_score: cached.accuracy_score,
            phase_summaries: cached.phase_summaries,
        };
    },
};

