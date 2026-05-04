import { registry } from "../registry";
import {
  voiceRespondRequestSchema,
  voiceRespondResponseSchema,
} from "../../schemas/voice";
import { apiErrorSchema, ERROR_CODES } from "../../schemas/errorCodes";
import { apiErrorExamples } from "../examples";

/**
 * POST /api/voice/respond のパス登録。
 *
 * 設計方針:
 * - 仕様書「API 設計書」準拠で 200 / 400 を定義する
 * - 実装側（routes/voice.ts）では user_id が不正（形式違反 / 欠落 / 未存在）の場合に
 *   400 `invalid_user_id` を返すため、400 の examples に `invalid_user_id` を含める
 */
registry.registerPath({
  method: "post",
  path: "/api/voice/respond",
  tags: ["Voice"],
  summary: "AI 応答生成（Game 2 用）",
  description:
    "Game 2（AI カスタマーサポート）のユーザー発話に対し、Gemini API で AI 応答を生成する。" +
    "Gemini 失敗時はキーワードマッチングのフォールバックに切り替わる（confidence が下がる）。",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: voiceRespondRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "AI 応答生成成功",
      content: {
        "application/json": {
          schema: voiceRespondResponseSchema,
        },
      },
    },
    400: {
      description:
        "リクエスト不正。主な業務エラーコード: " +
        "invalid_request（必須フィールド欠落 / message が空）/ " +
        "invalid_user_id（user_id が不正 = 形式違反 / 欠落 / 存在しない）",
      content: {
        "application/json": {
          schema: apiErrorSchema,
          examples: {
            invalid_request: {
              summary: "必須フィールド欠落 / message が空",
              value: apiErrorExamples[ERROR_CODES.INVALID_REQUEST],
            },
            invalid_user_id: {
              summary: "user_id が不正（形式違反 / 欠落 / 存在しない）",
              value: apiErrorExamples[ERROR_CODES.INVALID_USER_ID],
            },
          },
        },
      },
    },
  },
});
