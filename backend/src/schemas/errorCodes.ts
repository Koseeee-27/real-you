// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import "../openapi/registry";
import { z } from "zod";
import { registry } from "../openapi/registry";

/**
 * API 共通エラーコード定数。
 *
 * Notion 仕様書「API 設計書」の「エラーレスポンス」テーブルに定義された
 * エラーコード文字列を集約し、型で縛って誤字や表記ゆれを防ぐ。
 */
export const ERROR_CODES = {
  INVALID_REQUEST: "invalid_request",
  INVALID_MBTI: "invalid_mbti",
  INVALID_ANSWERS: "invalid_answers",
  INVALID_USER_ID: "invalid_user_id",
  INVALID_GAME_TYPE: "invalid_game_type",
  INCOMPLETE_GAMES: "incomplete_games",
  USER_NOT_FOUND: "user_not_found",
  DUPLICATE_SUBMISSION: "duplicate_submission",
  SERVER_ERROR: "server_error",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * エラーコードの zod スキーマ。
 * 仕様書で列挙されたコードのみに縛るため、`ERROR_CODES` の値を z.literal に展開する。
 * 値を追加する際は `ERROR_CODES` と本配列の両方を更新すること。
 *
 * OpenAPI では `.openapi({ enum: [...] })` で enum として出力する。
 * z.union<z.literal> の構成から OpenAPI 側で `anyOf` に落ちてしまうのを避け、
 * 単一の string enum として Swagger UI / IDE 補完で扱いやすくするため。
 */
const errorCodeSchema = z
  .union([
    z.literal(ERROR_CODES.INVALID_REQUEST),
    z.literal(ERROR_CODES.INVALID_MBTI),
    z.literal(ERROR_CODES.INVALID_ANSWERS),
    z.literal(ERROR_CODES.INVALID_USER_ID),
    z.literal(ERROR_CODES.INVALID_GAME_TYPE),
    z.literal(ERROR_CODES.INCOMPLETE_GAMES),
    z.literal(ERROR_CODES.USER_NOT_FOUND),
    z.literal(ERROR_CODES.DUPLICATE_SUBMISSION),
    z.literal(ERROR_CODES.SERVER_ERROR),
  ])
  .openapi({
    description:
      "API 設計書「エラーレスポンス」で規定された業務エラーコード。 " +
      "400: invalid_mbti / invalid_answers / invalid_request / invalid_user_id / " +
      "invalid_game_type / incomplete_games、404: user_not_found、" +
      "409: duplicate_submission、500: server_error。",
    enum: Object.values(ERROR_CODES),
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
  "ApiError",
  z
    .object({
      status: z.literal("error").openapi({
        description:
          '固定値 "error"（成功時は各レスポンスが個別に status を返す）',
      }),
      error: errorCodeSchema,
      message: z.string().openapi({
        description: "開発者向けの日本語説明（エンドユーザー向け文言ではない）",
        example: "mbti は INTJ / ESFP などの 4 文字で指定してください",
      }),
    })
    .openapi({
      description: "API 共通エラーレスポンス形式",
      example: {
        status: "error",
        error: ERROR_CODES.INVALID_MBTI,
        message: "mbti は INTJ / ESFP などの 4 文字で指定してください",
      },
    }),
);

export type ApiError = z.infer<typeof apiErrorSchema>;
