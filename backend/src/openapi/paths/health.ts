import { registry } from "../registry";
import {
  healthErrorResponseSchema,
  healthOkResponseSchema,
} from "../../schemas/health";

/**
 * GET /health のパス登録。
 *
 * 設計方針:
 * - 仕様書「API 設計書」準拠で 200 / 503 を定義する
 * - `/health` は他のエンドポイントと異なり `/api` プレフィックスを持たない
 *   （index.ts の `app.use('/health', healthRouter)` 参照）
 * - 200 と 503 で独自のレスポンス形（`HealthOkResponse` / `HealthErrorResponse`）を
 *   ステータスコード別に割当てる。`ApiError` とは別形のため `oneOf` は使わない
 *   （schemas/health.ts 冒頭コメント参照）
 * - リクエストボディ / パラメータは存在しないので `request` キー自体を省略する
 */
registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "ヘルスチェック",
  description:
    "Supabase への疎通確認を含む死活監視用エンドポイント。" +
    "200 と 503 で独自レスポンス形を返す（他エンドポイントの ApiError とは別形）。",
  responses: {
    200: {
      description: "DB 接続 OK",
      content: {
        "application/json": {
          schema: healthOkResponseSchema,
        },
      },
    },
    503: {
      description: "DB 切断（Supabase への疎通失敗）",
      content: {
        "application/json": {
          schema: healthErrorResponseSchema,
        },
      },
    },
  },
});
