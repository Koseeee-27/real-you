// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { userIdSchema } from './common';
import { GAME_TYPES } from '../types';
import {
    submitGameRequestExampleGame1,
    submitGameResponseExample,
} from '../openapi/examples';

/**
 * POST /api/games/submit のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - 業務エラーコード（invalid_user_id / invalid_game_type 等）への
 *   マッピングは errorHandler の resolveZodErrorCode に集約する
 *   （schemas/common.ts の設計方針と同じ）
 * - OpenAPI メタデータ（description / example）は本ファイルに寄せ、
 *   example の値は `openapi/examples.ts` に集約する
 */

/**
 * ゲーム種別（1: 利用規約 / 2: AI チャット / 3: グループチャット）。
 *
 * types/index.ts の `GAME_TYPES` 定数を唯一の真実とし、
 * ここではその値を z.literal に展開して zod スキーマ化する。
 *
 * NOTE: 現状 GAME_TYPES の値は 1/2/3 で固定のため、
 * 明示的にリテラル配列として記述している。値を追加する際は
 * types/index.ts と本スキーマの両方を更新すること（将来的には
 * GAME_TYPES の値を自動展開する形にリファクタ可）。
 *
 * OpenAPI では `.openapi({ enum: [...] })` で enum 情報を補う
 * （z.union<z.literal> のままだと OpenAPI 側で `anyOf` に落ちてしまうため）。
 */
export const gameTypeSchema = z
    .union([
        z.literal(GAME_TYPES.TERMS_GAME),
        z.literal(GAME_TYPES.AI_CHAT),
        z.literal(GAME_TYPES.GROUP_CHAT),
    ])
    .openapi({
        description:
            'ゲーム種別。1: 利用規約ゲーム / 2: AI カスタマーサポート / 3: グループチャット',
        enum: [
            GAME_TYPES.TERMS_GAME,
            GAME_TYPES.AI_CHAT,
            GAME_TYPES.GROUP_CHAT,
        ],
        example: GAME_TYPES.TERMS_GAME,
    });

/**
 * ゲーム固有の行動データ。
 * 構造はゲームごとに大きく異なるため、スキーマ層では空でないオブジェクトであることのみを検証する。
 * 各ゲームの `data` 構造の検証は analysis 層の責務（別 Issue で型化予定）。
 *
 * OpenAPI 上は自由形式オブジェクト（`additionalProperties: true`）として表現される。
 * 具体的な各ゲームの data 構造は仕様書「データ構造」を参照（examples に game_1 の例を掲載）。
 */
export const gameDataSchema = z
    .record(z.string(), z.unknown())
    .refine((d) => Object.keys(d).length > 0, {
        error: 'data は空オブジェクトにできません',
    })
    .openapi({
        description:
            'ゲーム固有の行動データ。game_type ごとに構造が異なる（仕様書「データ構造」参照）。空オブジェクト不可',
        example: submitGameRequestExampleGame1.data,
    });

/**
 * POST /api/games/submit のリクエストボディ。
 */
export const submitGameRequestSchema = z
    .object({
        user_id: userIdSchema,
        game_type: gameTypeSchema,
        data: gameDataSchema,
    })
    .openapi({
        description:
            '各ゲーム終了時に行動データを送信するリクエスト。' +
            '同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す',
        example: submitGameRequestExampleGame1,
    });

/**
 * POST /api/games/submit のレスポンス（200 OK）。
 */
export const submitGameResponseSchema = z
    .object({
        status: z.literal('success').openapi({
            description: '固定値 "success"',
        }),
        message: z.string().openapi({
            description: '保存されたゲームを示す運用向けメッセージ',
            example: submitGameResponseExample.message,
        }),
    })
    .openapi({
        description: 'ゲームデータ保存成功レスポンス（200 OK）',
        example: submitGameResponseExample,
    });

/**
 * ゲーム種別（1/2/3）の TS 型。
 * `gameTypeSchema` から `z.infer` で導出するため、値の追加時は
 * `types/index.ts` の `GAME_TYPES` と本スキーマの z.literal 配列を同期すれば
 * 本型も自動で追随する。
 */
export type GameType = z.infer<typeof gameTypeSchema>;

export type SubmitGameRequest = z.infer<typeof submitGameRequestSchema>;
export type SubmitGameResponse = z.infer<typeof submitGameResponseSchema>;
