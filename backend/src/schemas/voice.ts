import { z } from 'zod';
import { userIdSchema } from './common';

/**
 * POST /api/voice/respond のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - 業務エラーコード（invalid_user_id / invalid_request）への
 *   マッピングは errorHandler の resolveZodErrorCode に集約する
 *   （schemas/common.ts の設計方針と同じ）
 */

/**
 * 会話履歴の 1 メッセージ。role は Gemini API の慣例に合わせて
 * 'user' / 'assistant' のみ許可する（system は別枠で扱うため含めない）。
 */
export const conversationMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

/**
 * POST /api/voice/respond のリクエストボディ。
 *
 * - `message` は仕様書で「空文字不可」のため `.min(1)` を付ける
 * - `conversation_history` は任意。未指定時は service 層で空配列扱い
 */
export const voiceRespondRequestSchema = z.object({
    user_id: userIdSchema,
    message: z
        .string({ error: 'message は文字列で指定してください' })
        .min(1, { error: 'message は空文字にできません' }),
    conversation_history: z.array(conversationMessageSchema).optional(),
});

/**
 * 応答の感情ラベル。
 *
 * 仕様書「API 設計書」で 4 種（confident / apologetic / confused / neutral）に列挙されており、
 * 実装側（voiceService.estimateEmotion と fallbackData）も同 4 種のみを返す。
 * enum 化により Issue #5（OpenAPI 化）でも enum 情報をそのまま活用できる。
 */
export const voiceEmotionSchema = z.enum([
    'confident',
    'apologetic',
    'confused',
    'neutral',
]);

/**
 * POST /api/voice/respond のレスポンス（200 OK）。
 *
 * `confidence` は仕様書で Gemini 成功時 0.6 / フォールバック 0.2-0.3 と規定されているため
 * 0-1 の範囲制約を付ける（範囲違反は実装バグなのでランタイム検証目的ではなく
 * 将来の OpenAPI の minimum/maximum 反映を見越した制約）。
 */
export const voiceRespondResponseSchema = z.object({
    response: z.string(),
    emotion: voiceEmotionSchema,
    confidence: z.number().min(0).max(1),
});

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type VoiceEmotion = z.infer<typeof voiceEmotionSchema>;
export type VoiceRespondRequest = z.infer<typeof voiceRespondRequestSchema>;
export type VoiceRespondResponse = z.infer<typeof voiceRespondResponseSchema>;
