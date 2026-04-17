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
