// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { registry } from '../openapi/registry';

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
 * `ERROR_CODES` の全値を 1 箇所に集約した配列。
 *
 * `z.literal(...)` の引数と `.openapi({ enum: [...] })` の両方から参照することで、
 * 値の追加時に `ERROR_CODES` のみを更新すれば
 * 型と OpenAPI enum が自動で追随する（二重管理を解消）。
 *
 * `Object.values(ERROR_CODES)` の戻り値型は `ErrorCode[]`（9 個の文字列リテラル union 配列）で、
 * `z.literal<const T extends ReadonlyArray<Literal>>(value: T)` の T[number] 推論により
 * 内部型は `'invalid_request' | 'invalid_mbti' | ... | 'server_error'` の union が維持される。
 */
const ERROR_CODE_VALUES = Object.values(ERROR_CODES);

/**
 * エラーコードの zod スキーマ。
 *
 * `ERROR_CODES` 定数を唯一の真実とし、`ERROR_CODE_VALUES` 経由で
 * zod スキーマと OpenAPI enum の両方に展開する。
 *
 * NOTE: zod v4 の `z.literal(array)` は内部的に `'invalid_request' | ...` の literal union として
 * 振る舞うが、`@asteasolutions/zod-to-openapi` v8.5 の `LiteralTransformer` は
 * multi-value literal を `enum: [values[0]]`（先頭 1 要素のみ）にしか展開しない。
 * よって OpenAPI で正しい enum を出すには `.openapi({ enum: [...] })` で全値を
 * 明示する必要がある。値のソースは同じ `ERROR_CODE_VALUES` なので二重管理にはならない。
 */
const errorCodeSchema = z.literal(ERROR_CODE_VALUES).openapi({
    description:
        'API 設計書「エラーレスポンス」で規定された業務エラーコード。 ' +
        '400: invalid_mbti / invalid_answers / invalid_request / invalid_user_id / ' +
        'invalid_game_type / incomplete_games、404: user_not_found、' +
        '409: duplicate_submission、500: server_error。',
    enum: ERROR_CODE_VALUES,
    example: ERROR_CODES.INVALID_REQUEST,
});

/**
 * API 共通エラーレスポンス。
 *
 * Notion 仕様書「API 設計書」の「エラーレスポンス」で規定された
 * `{ status: "error", error, message }` 形式を zod 化したもの。
 * `ApiError` 型は本スキーマから `z.infer` で導出する。
 *
 * `registry.register('ApiError', ...)` で共通コンポーネントとして登録し、
 * PR-2 で各エンドポイントのエラーレスポンスから `$ref` で参照する。
 */
export const apiErrorSchema = registry.register(
    'ApiError',
    z
        .object({
            status: z.literal('error').openapi({
                description: '固定値 "error"（成功時は各レスポンスが個別に status を返す）',
            }),
            error: errorCodeSchema,
            message: z.string().openapi({
                description: '開発者向けの日本語説明（エンドユーザー向け文言ではない）',
                example: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
            }),
        })
        .openapi({
            description: 'API 共通エラーレスポンス形式',
            example: {
                status: 'error',
                error: ERROR_CODES.INVALID_MBTI,
                message: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
            },
        }),
);

export type ApiError = z.infer<typeof apiErrorSchema>;
