import { ZodType } from 'zod';
import { userRepository } from '../repositories/userRepository';
import { gameRepository } from '../repositories/gameRepository';
import { generateAnalysisResult } from '../analysis/scoreCalculator';
import { analysisResultRepository, AnalysisResultRow } from '../repositories/analysisResultRepository';
import {
    Game1Data,
    Game2Data,
    Game3Data,
    game1DataSchema,
    game2DataSchema,
    game3DataSchema,
} from '../schemas/gameData';

import { getMbtiScores } from '../analysis/mbtiScoreTable';
import { BaselineScores, GameLog, ResultResponse } from '../types';
import { ERROR_CODES } from '../schemas/errorCodes';

/**
 * DB から取り出した GameLog.raw_data（unknown）を、対応する zod スキーマで parse する。
 *
 * ゲームログが見つからない場合は undefined を返す。parse 失敗時は DB 整合性エラーとして
 * 500 `server_error` を throw する（運用上ほぼ起きない異常系。ログに詳細を残し、
 * クライアントへの message は固定文言にして内部情報の漏洩を防ぐ）。
 */
function parseGameLogOrThrow<T>(
    log: GameLog | undefined,
    schema: ZodType<T>,
    gameLabel: string,
    userId: string,
): T | undefined {
    if (!log) return undefined;

    const result = schema.safeParse(log.raw_data);
    if (!result.success) {
        console.error('Corrupted game data in DB:', {
            gameLabel,
            userId,
            issues: result.error.issues,
        });
        throw {
            status: 500,
            code: ERROR_CODES.SERVER_ERROR,
            message: 'Stored game data is corrupted',
        };
    }
    return result.data;
}

export const resultService = {
    async getResult(userId: string): Promise<ResultResponse> {
        // ユーザー取得
        const user = await userRepository.findById(userId);
        if (!user) {
            throw { status: 404, code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' };
        }

        // 1. ベースラインスコア取得 (アンケート結果)
        let baseline_scores: BaselineScores = {
            caution: user.baseline_caution,
            calmness: user.baseline_calmness,
            logic: user.baseline_logic,
            cooperativeness: user.baseline_coop,
            positivity: user.baseline_positive,
        };

        // 2. MBTI理論値スコア取得
        const mbti_scores = user.self_mbti ? getMbtiScores(user.self_mbti) : null;

        // 3. MBTIが回答されている場合、ベースラインを理論値で補正する（極端な値を抑える）
        if (mbti_scores) {
            baseline_scores = this.blendScores(baseline_scores, mbti_scores);
        }

        // キャッシュ確認：analysis_results にあればそこから返す
        const cached = await analysisResultRepository.findByUserId(userId);
        if (cached) {
            return this.buildResponseFromCache(userId, user.self_mbti, baseline_scores, cached);
        }

        // キャッシュなし → ゲームログから計算
        const gameLogs = await gameRepository.findLogsByUserId(userId);
        if (gameLogs.length < 3) {
            throw { status: 400, code: ERROR_CODES.INCOMPLETE_GAMES, message: 'All games must be completed' };
        }

        // 分析（analysis/ に委譲）。Issue #101 で GameLog はドメイン文字列 ID
        // （`game_id: GameId`）を保持する形に変更されたため、find のキーは文字列リテラル
        // で照合する（DB の数値 game_type は repositories 層で吸収済み）。
        const game1Log = gameLogs.find(log => log.game_id === 'terms_game');
        const game2Log = gameLogs.find(log => log.game_id === 'helpdesk_game');
        const game3Log = gameLogs.find(log => log.game_id === 'group_chat_game');

        // raw_data は GameLog.raw_data: unknown のため、scoreCalculator に渡す前に
        // game_id ごとの zod スキーマで parse する。DB 整合性が壊れていた場合は
        // 500 `server_error` で明示的に失敗させる（parseGameLogOrThrow 内で throw）。
        const game1Data: Game1Data | undefined = parseGameLogOrThrow(game1Log, game1DataSchema, 'game1', userId);
        const game2Data: Game2Data | undefined = parseGameLogOrThrow(game2Log, game2DataSchema, 'game2', userId);
        const game3Data: Game3Data | undefined = parseGameLogOrThrow(game3Log, game3DataSchema, 'game3', userId);

        const analysisResult = generateAnalysisResult(
            userId,
            user.self_mbti ?? undefined,
            game1Data,
            game2Data,
            game3Data,
            baseline_scores
        );

        // analysis_results にキャッシュとして保存
        const cacheRow: AnalysisResultRow = {
            user_id: userId,
            score_caution: analysisResult.scores.caution,
            score_calmness: analysisResult.scores.calmness,
            score_logic: analysisResult.scores.logic,
            score_coop: analysisResult.scores.cooperativeness,
            score_positive: analysisResult.scores.positivity,
            mbti_caution: mbti_scores?.caution ?? null,
            mbti_calmness: mbti_scores?.calmness ?? null,
            mbti_logic: mbti_scores?.logic ?? null,
            mbti_coop: mbti_scores?.cooperativeness ?? null,
            mbti_positive: mbti_scores?.positivity ?? null,
            gap_caution: analysisResult.gaps.caution,
            gap_calmness: analysisResult.gaps.calmness,
            gap_logic: analysisResult.gaps.logic,
            gap_coop: analysisResult.gaps.cooperativeness,
            gap_positive: analysisResult.gaps.positivity,
            feedback_title: analysisResult.feedback.title,
            feedback_description: analysisResult.feedback.description,
            feedback_gap_point: analysisResult.feedback.gap_point,
            game_contributions: analysisResult.game_breakdown,
            accuracy_score: analysisResult.accuracy_score,
            phase_summaries: analysisResult.phase_summaries,
            details: analysisResult.details,
        };

        await analysisResultRepository.save(cacheRow);

        return {
            ...analysisResult,
            self_mbti: user.self_mbti,
            mbti_scores
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
            details: cached.details,
        };
    },

    /**
     * アンケート結果とMBTI理論値をブレンドして、ベースラインの極端な値を調整する
     */
    blendScores(survey: BaselineScores, mbti: BaselineScores): BaselineScores {
        // 比重: アンケート 70%, 理論値 30%
        const blend = (s: number, m: number) => Math.round(s * 0.7 + m * 0.3);

        return {
            caution: blend(survey.caution, mbti.caution),
            calmness: blend(survey.calmness, mbti.calmness),
            logic: blend(survey.logic, mbti.logic),
            cooperativeness: blend(survey.cooperativeness, mbti.cooperativeness),
            positivity: blend(survey.positivity, mbti.positivity),
        };
    },
};

