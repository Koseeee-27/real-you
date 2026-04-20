import { z } from 'zod';
import {
    baselineScoresSchema,
    mbtiSchema,
    userIdSchema,
} from './common';

/**
 * GET /api/results/:user_id のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - 業務エラーコード（invalid_user_id / user_not_found / incomplete_games 等）の
 *   マッピングは errorHandler の resolveZodErrorCode / isBusinessError に集約する
 *   （schemas/common.ts の設計方針と同じ）
 */

/**
 * パスパラメータ。user_id は UUID 文字列。
 *
 * 共通スキーマの `userIdSchema`（UUID 検証）をそのまま利用する。
 * errorHandler 側で path[0] === 'user_id' のエラーは `invalid_user_id` に
 * マッピング済みのため、検証失敗時の業務コードも仕様書準拠となる。
 */
export const resultsParamsSchema = z.object({
    user_id: userIdSchema,
});

/**
 * 5 軸各軸ごとのスコアを optional にした構造。
 *
 * ゲームごとにどの軸を測るかが異なるため（例: game_1 は caution/logic/calmness のみ）、
 * Partial 相当として各軸を optional にしている。
 */
const partialBaselineScoresSchema = z.object({
    caution: z.number().optional(),
    calmness: z.number().optional(),
    logic: z.number().optional(),
    cooperativeness: z.number().optional(),
    positivity: z.number().optional(),
});

/**
 * ゲームごとのスコア内訳。
 * 各ゲームキー（game_1 / game_2 / game_3）は optional。
 */
export const gameBreakdownSchema = z.object({
    game_1: partialBaselineScoresSchema.optional(),
    game_2: partialBaselineScoresSchema.optional(),
    game_3: partialBaselineScoresSchema.optional(),
});

/**
 * 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）。
 */
export const diagnosisFeedbackSchema = z.object({
    title: z.string(),
    description: z.string(),
    gap_point: z.string(),
});

/**
 * 各フェーズ（ゲーム）の振り返りテキスト。
 */
export const phaseSummariesSchema = z.object({
    phase_1: z.string(),
    phase_2: z.string(),
    phase_3: z.string(),
});

/**
 * GET /api/results/:user_id のレスポンス（200 OK）。
 *
 * `details` について（暫定定義）:
 * - 本フィールドは各ゲーム固有のメトリクスと特徴スコアを含み、構造が広く
 *   analysis 層（scoreCalculator.ts）の戻り値構造に直接依存する
 * - 現時点では `z.unknown()` とし、FE 側は既存の型定義に従って参照する
 * - 厳密化は analysis 戻り値の構造を固めてから別 Issue で対応する
 *   （Issue #6 の実装計画「論点」参照）
 */
export const resultsResponseSchema = z.object({
    user_id: z.string(),
    self_mbti: mbtiSchema.nullable(),
    mbti_scores: baselineScoresSchema.nullable(),
    scores: baselineScoresSchema,
    baseline_scores: baselineScoresSchema,
    gaps: baselineScoresSchema,
    game_breakdown: gameBreakdownSchema,
    feedback: diagnosisFeedbackSchema,
    accuracy_score: z.number(),
    phase_summaries: phaseSummariesSchema,
    details: z.unknown(),
});

export type ResultsParams = z.infer<typeof resultsParamsSchema>;
export type GameBreakdown = z.infer<typeof gameBreakdownSchema>;
export type DiagnosisFeedback = z.infer<typeof diagnosisFeedbackSchema>;
export type PhaseSummaries = z.infer<typeof phaseSummariesSchema>;
export type ResultResponse = z.infer<typeof resultsResponseSchema>;
