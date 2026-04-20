import { z } from 'zod';

/**
 * 複数エンドポイントで使い回す横断スキーマ。
 *
 * 設計方針:
 * - スキーマはリクエスト/レスポンスの「形」とメッセージのみカスタマイズする
 * - 業務エラーコード（API 設計書の invalid_mbti / invalid_answers 等）への
 *   マッピングは errorHandler の resolveZodErrorCode に集約する
 *   （理由: zod v4 では error 関数の戻り値の params が issue に伝播せず、
 *    スキーマ宣言時に業務コードを埋め込む一般的手段が存在しないため）
 *
 * zod v4 のトップレベル API（`z.uuid()` 等）と error オプションを使用する。
 */

/** user_id（UUID 文字列） */
export const userIdSchema = z.uuid({ error: 'user_id は UUID 形式で指定してください' });

/**
 * MBTI 形式（I/E + S/N + T/F + J/P の 4 文字）。
 * 大文字小文字は問わない（service 層で必要に応じて正規化する）。
 */
export const mbtiSchema = z
    .string({ error: 'mbti は文字列で指定してください' })
    .regex(/^[IE][SN][TF][JP]$/i, {
        error: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
    });

/**
 * 基準値アンケートの回答選択肢（A/B/C/D）。
 *
 * z.enum ではなく z.string().refine() を使う理由:
 * - z.enum は「必須欠落（undefined）」と「値違反（A-D 以外）」を両方 invalid_value
 *   として返すため、errorHandler 側で API 設計書のエラーコード
 *   （invalid_request / invalid_answers）に区別してマッピングできない
 * - z.string().refine() なら:
 *   - 必須欠落 → z.string() の invalid_type issue
 *   - 値違反 → refine の custom issue
 *   と issue.code で区別可能
 *
 * type predicate（`val is AnswerOption`）により z.infer の型は 'A' | 'B' | 'C' | 'D' に narrowing される。
 *
 * OpenAPI 化（Issue #6 PR 6）の際は zod-openapi の .openapi({ enum: [...] }) で
 * enum 情報を補う必要がある（z.string() のままだと OpenAPI 側で enum が失われるため）。
 */
const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'] as const;
export type AnswerOption = typeof ANSWER_OPTIONS[number];

export const answerOptionSchema = z
    .string({ error: '回答は必須です' })
    .refine(
        (val): val is AnswerOption =>
            (ANSWER_OPTIONS as readonly string[]).includes(val),
        { error: '回答は A / B / C / D のいずれかで指定してください' },
    );

/**
 * 5 軸スコア（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性）。
 *
 * 本スキーマは以下のいずれの用途にも再利用する:
 * - baseline_scores / scores / mbti_scores（0-100 の正値）
 * - gaps（実測 - 自己申告の差分。負値を取りうる）
 *
 * そのため範囲制約（min/max）は付けず `z.number()` とする。
 * 型は既存の `BaselineScores` interface と構造的に同一になる。
 */
export const baselineScoresSchema = z.object({
    caution: z.number(),
    calmness: z.number(),
    logic: z.number(),
    cooperativeness: z.number(),
    positivity: z.number(),
});

export type BaselineScores = z.infer<typeof baselineScoresSchema>;
