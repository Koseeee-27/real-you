import { z } from 'zod';

/**
 * GET /health のスキーマ群。
 *
 * - リクエストは入力なし（params / query / body すべて空）のため validate ミドルウェアは不要
 * - 200（正常）と 503（DB 切断）で形が異なるため両方を用意する
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
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
export const healthOkResponseSchema = z.object({
    status: z.literal('ok'),
    timestamp: z.iso.datetime(),
    database: z.literal('connected'),
    uptime: z.number().int().nonnegative(),
});

/**
 * GET /health のレスポンス（503 Service Unavailable, DB 切断時）。
 *
 * 仕様書の規定により通常の ApiError 形式ではなく 200 と対称の形を返す。
 */
export const healthErrorResponseSchema = z.object({
    status: z.literal('error'),
    timestamp: z.iso.datetime(),
    database: z.literal('disconnected'),
    uptime: z.number().int().nonnegative(),
});

export type HealthOkResponse = z.infer<typeof healthOkResponseSchema>;
export type HealthErrorResponse = z.infer<typeof healthErrorResponseSchema>;
