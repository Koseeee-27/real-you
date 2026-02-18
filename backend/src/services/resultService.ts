import { userRepository } from '../repositories/userRepository';
import { gameRepository } from '../repositories/gameRepository';
import { calculateGame1Scores, calculateGame2Scores, combineScores } from '../analysis/scoreCalculator';
import { generateFeedback } from '../analysis/feedbackGenerator';
import { buildPhaseSummaries } from '../analysis/phaseSummaryBuilder';
import { BaselineScores, ResultResponse, GameBreakdown } from '../types';

export const resultService = {
    async getResult(userId: string): Promise<ResultResponse> {
        // ユーザー取得
        const user = await userRepository.findById(userId);
        if (!user) {
            throw { status: 404, code: 'user_not_found', message: 'ユーザーが見つかりません' };
        }

        // ゲームログ取得
        const gameLogs = await gameRepository.findLogsByUserId(userId);
        if (gameLogs.length < 2) {
            throw { status: 400, code: 'incomplete_games', message: 'All games must be completed' };
        }

        // 分析（analysis/ に委譲）
        const game1Data = gameLogs.find(log => log.game_type === 1);
        const game2Data = gameLogs.find(log => log.game_type === 2);
        const game3Data = gameLogs.find(log => log.game_type === 3);

        const game1Scores = game1Data ? calculateGame1Scores(game1Data.raw_data) : {};
        const game2Scores = game2Data ? calculateGame2Scores(game2Data.raw_data) : {};
        const scores = combineScores(game1Scores, game2Scores);

        // ベースラインスコア組み立て
        const baseline_scores: BaselineScores = {
            caution: user.baseline_caution,
            calmness: user.baseline_calmness,
            logic: user.baseline_logic,
            cooperativeness: user.baseline_coop,
            positivity: user.baseline_positive,
        };

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
        };

        return {
            user_id: userId,
            self_mbti: user.self_mbti,
            scores,
            baseline_scores,
            gaps,
            game_breakdown,
            feedback,
            accuracy_score,
            phase_summaries,
        };
    }
};
