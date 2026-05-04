import { registry } from "../registry";
import {
  submitGameRequestSchema,
  submitGameResponseSchema,
} from "../../schemas/games";
import { apiErrorSchema, ERROR_CODES } from "../../schemas/errorCodes";
import { apiErrorExamples } from "../examples";

/**
 * POST /api/games/submit のパス登録。
 *
 * 設計方針:
 * - 仕様書「API 設計書」準拠で 200 / 400 / 409 を定義する
 * - user_id が見つからない場合も仕様書・実装ともに 400 `invalid_user_id` を返すため、
 *   404 レスポンスは定義しない（OpenAPI を Single Source of Truth とするため、
 *   実装と乖離する予測を書かない）。仕様変更で 404 を返すようになったら
 *   まず仕様書を更新してから本ファイルに追記する。
 */
registry.registerPath({
  method: "post",
  path: "/api/games/submit",
  tags: ["Games"],
  summary: "ゲームプレイデータ送信",
  description:
    "各ゲーム（1: 利用規約 / 2: AI チャット / 3: グループチャット）の終了時に行動データを送信する。" +
    "同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す。",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: submitGameRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "ゲームデータ保存成功",
      content: {
        "application/json": {
          schema: submitGameResponseSchema,
        },
      },
    },
    400: {
      description:
        "リクエスト不正。主な業務エラーコード: " +
        "invalid_request（必須フィールド欠落 / data が空）/ " +
        "invalid_user_id（user_id が不正 = 形式違反 / 欠落 / 存在しない）/ " +
        "invalid_game_type（game_type が 1-3 の範囲外）",
      content: {
        "application/json": {
          schema: apiErrorSchema,
          examples: {
            invalid_request: {
              summary: "必須フィールド欠落 / data が空",
              value: apiErrorExamples[ERROR_CODES.INVALID_REQUEST],
            },
            invalid_user_id: {
              summary: "user_id が不正（形式違反 / 欠落 / 存在しない）",
              value: apiErrorExamples[ERROR_CODES.INVALID_USER_ID],
            },
            invalid_game_type: {
              summary: "game_type 範囲外",
              value: apiErrorExamples[ERROR_CODES.INVALID_GAME_TYPE],
            },
          },
        },
      },
    },
    409: {
      description: "同一ユーザー × 同一 game_type の重複送信",
      content: {
        "application/json": {
          schema: apiErrorSchema,
          examples: {
            duplicate_submission: {
              summary: "同一ユーザー × 同一 game_type の重複送信",
              value: apiErrorExamples[ERROR_CODES.DUPLICATE_SUBMISSION],
            },
          },
        },
      },
    },
  },
});
