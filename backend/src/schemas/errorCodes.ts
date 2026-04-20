import { z } from 'zod';

/**
 * API 共通エラーコード定数。
 *
 * Notion 仕様書「API 設計書」の「エラーレスポンス」テーブルに定義された
 * エラーコード文字列を集約し、型で縛って誤字や表記ゆれを防ぐ。
 */
export const ERROR_CODES = {
    INVALID_REQUEST: 'invalid_request',
    INVALID_MBTI: 'invalid_mbti',
    INVALID_ANSWERS: 'invalid_answers',
    INVALID_USER_ID: 'invalid_user_id',
    INVALID_GAME_TYPE: 'invalid_game_type',
    INCOMPLETE_GAMES: 'incomplete_games',
    USER_NOT_FOUND: 'user_not_found',
    DUPLICATE_SUBMISSION: 'duplicate_submission',
    SERVER_ERROR: 'server_error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * エラーコードの zod スキーマ。
 * 仕様書で列挙されたコードのみに縛るため、`ERROR_CODES` の値を z.literal に展開する。
 * 値を追加する際は `ERROR_CODES` と本配列の両方を更新すること。
 */
const errorCodeSchema = z.union([
    z.literal(ERROR_CODES.INVALID_REQUEST),
    z.literal(ERROR_CODES.INVALID_MBTI),
    z.literal(ERROR_CODES.INVALID_ANSWERS),
    z.literal(ERROR_CODES.INVALID_USER_ID),
    z.literal(ERROR_CODES.INVALID_GAME_TYPE),
    z.literal(ERROR_CODES.INCOMPLETE_GAMES),
    z.literal(ERROR_CODES.USER_NOT_FOUND),
    z.literal(ERROR_CODES.DUPLICATE_SUBMISSION),
    z.literal(ERROR_CODES.SERVER_ERROR),
]);

/**
 * API 共通エラーレスポンス。
 *
 * Notion 仕様書「API 設計書」の「エラーレスポンス」で規定された
 * `{ status: "error", error, message }` 形式を zod 化したもの。
 * `ApiError` 型は本スキーマから `z.infer` で導出する。
 */
export const apiErrorSchema = z.object({
    status: z.literal('error'),
    error: errorCodeSchema,
    message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
