import { z } from 'zod';

/**
 * 複数エンドポイントで使い回す横断スキーマ。
 *
 * zod v4 のトップレベル API（`z.uuid()` 等）と `{ error: ... }` オプションを使用する。
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

/** 基準値アンケートの回答選択肢（A/B/C/D） */
export const answerOptionSchema = z.enum(['A', 'B', 'C', 'D'], {
    error: '回答は A / B / C / D のいずれかで指定してください',
});

export type AnswerOption = z.infer<typeof answerOptionSchema>;
