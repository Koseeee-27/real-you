// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { answerOptionSchema, mbtiSchema } from './common';
import {
    registerRequestExample,
    registerResponseExample,
} from '../openapi/examples';

/**
 * POST /api/register のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - OpenAPI メタデータ（description / example）は本ファイルに寄せ、
 *   example の値は `openapi/examples.ts` に集約して複数参照（スキーマ / パス登録）を単一ソース化する
 */

/**
 * 5 軸の基準値アンケート回答（A/B/C/D）。
 * 5 設問すべて必須。未知プロパティは zod v4 のデフォルト挙動で strip される。
 */
export const baselineAnswersSchema = z
    .object({
        q1_caution: answerOptionSchema,
        q2_calmness: answerOptionSchema,
        q3_logic: answerOptionSchema,
        q4_cooperativeness: answerOptionSchema,
        q5_positivity: answerOptionSchema,
    })
    .openapi({
        description:
            '5 軸の基準値アンケート回答。各軸（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性）に ' +
            'A / B / C / D のいずれかで回答する（A=100, B=75, C=25, D=0 点に内部変換される）',
        example: registerRequestExample.baseline_answers,
    });

/**
 * POST /api/register のリクエストボディ。
 * mbti は省略・null 許容（自己診断スキップに対応）。指定された場合は MBTI 形式に従う。
 */
export const registerRequestSchema = z
    .object({
        mbti: mbtiSchema.nullish(),
        baseline_answers: baselineAnswersSchema,
    })
    .openapi({
        description:
            'MBTI 選択 + 基準値アンケート（5 設問）完了時に送信する登録リクエスト。' +
            'mbti は任意（null / 省略でスキップ扱い）、baseline_answers は全 5 設問必須',
        example: registerRequestExample,
    });

/**
 * POST /api/register のレスポンス（201 Created）。
 */
export const registerResponseSchema = z
    .object({
        user_id: z.uuid().openapi({
            description: '新規発行されたユーザー識別子（UUID v4）',
            example: registerResponseExample.user_id,
        }),
        status: z.literal('success').openapi({
            description: '固定値 "success"',
        }),
    })
    .openapi({
        description: '登録成功レスポンス（201 Created）',
        example: registerResponseExample,
    });

export type BaselineAnswers = z.infer<typeof baselineAnswersSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
