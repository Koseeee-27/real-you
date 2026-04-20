import { z } from 'zod';
import { answerOptionSchema, mbtiSchema } from './common';

/**
 * POST /api/register のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 */

/**
 * 5 軸の基準値アンケート回答（A/B/C/D）。
 * 5 設問すべて必須。未知プロパティは zod v4 のデフォルト挙動で strip される。
 */
export const baselineAnswersSchema = z.object({
    q1_caution: answerOptionSchema,
    q2_calmness: answerOptionSchema,
    q3_logic: answerOptionSchema,
    q4_cooperativeness: answerOptionSchema,
    q5_positivity: answerOptionSchema,
});

/**
 * POST /api/register のリクエストボディ。
 * mbti は省略・null 許容（自己診断スキップに対応）。指定された場合は MBTI 形式に従う。
 */
export const registerRequestSchema = z.object({
    mbti: mbtiSchema.nullish(),
    baseline_answers: baselineAnswersSchema,
});

/**
 * POST /api/register のレスポンス（201 Created）。
 */
export const registerResponseSchema = z.object({
    user_id: z.uuid(),
    status: z.literal('success'),
});

export type BaselineAnswers = z.infer<typeof baselineAnswersSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
