// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import "../openapi/registry";
import { z } from "zod";
import {
  healthErrorResponseExample,
  healthOkResponseExample,
} from "../openapi/examples";

/**
 * GET /health のスキーマ群。
 *
 * - リクエストは入力なし（params / query / body すべて空）のため validate ミドルウェアは不要
 * - 200（正常）と 503（DB 切断）で形が異なるため両方を用意する
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - OpenAPI メタデータ（description / example）は本ファイルに寄せ、
 *   example の値は `openapi/examples.ts` に集約する
 *
 * エラーフォーマットについて:
 * Notion 仕様書「API 設計書」で `/health` の 503 は他のエンドポイントの
 * `ApiError`（`status: 'error', error, message`）とは異なる独自形を返す規定に
 * なっている（`database: 'disconnected'` を含む運用監視向けのフィールド）。
 * そのため本ファイルは apiErrorSchema を使わず個別に定義する。
 */

/**
 * GET /health のレスポンス（200 OK）。
 *
 * - `uptime` はプロセス起動からの経過秒数（`process.uptime()`）を Math.round した値
 * - `timestamp` は ISO 8601 形式の UTC 時刻文字列
 */
export const healthOkResponseSchema = z
  .object({
    status: z.literal("ok").openapi({
      description: '固定値 "ok"（DB 接続成功時）',
    }),
    timestamp: z.iso.datetime().openapi({
      description: "レスポンス生成時刻（ISO 8601 UTC）",
      example: healthOkResponseExample.timestamp,
    }),
    database: z.literal("connected").openapi({
      description: '固定値 "connected"（Supabase への疎通成功）',
    }),
    uptime: z.number().int().nonnegative().openapi({
      description: "プロセス起動からの経過秒数（整数）",
      example: healthOkResponseExample.uptime,
    }),
  })
  .openapi({
    description: "ヘルスチェック成功レスポンス（200 OK）",
    example: healthOkResponseExample,
  });

/**
 * GET /health のレスポンス（503 Service Unavailable, DB 切断時）。
 *
 * 仕様書の規定により通常の ApiError 形式ではなく 200 と対称の形を返す。
 */
export const healthErrorResponseSchema = z
  .object({
    status: z.literal("error").openapi({
      description: '固定値 "error"（DB 切断時）',
    }),
    timestamp: z.iso.datetime().openapi({
      description: "レスポンス生成時刻（ISO 8601 UTC）",
      example: healthErrorResponseExample.timestamp,
    }),
    database: z.literal("disconnected").openapi({
      description: '固定値 "disconnected"（Supabase への疎通失敗）',
    }),
    uptime: z.number().int().nonnegative().openapi({
      description: "プロセス起動からの経過秒数（整数）",
      example: healthErrorResponseExample.uptime,
    }),
  })
  .openapi({
    description:
      "ヘルスチェック失敗レスポンス（503 Service Unavailable, DB 切断時）",
    example: healthErrorResponseExample,
  });

export type HealthOkResponse = z.infer<typeof healthOkResponseSchema>;
export type HealthErrorResponse = z.infer<typeof healthErrorResponseSchema>;
