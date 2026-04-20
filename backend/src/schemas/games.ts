import { z } from 'zod';
import { userIdSchema } from './common';
import { GAME_TYPES } from '../types';

/**
 * POST /api/games/submit のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - 業務エラーコード（invalid_user_id / invalid_game_type 等）への
 *   マッピングは errorHandler の resolveZodErrorCode に集約する
 *   （schemas/common.ts の設計方針と同じ）
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
 */
export const gameTypeSchema = z.union([
    z.literal(GAME_TYPES.TERMS_GAME),
    z.literal(GAME_TYPES.AI_CHAT),
    z.literal(GAME_TYPES.GROUP_CHAT),
]);

/**
 * ゲーム固有の行動データ。
 * 構造はゲームごとに大きく異なるため、スキーマ層では空でないオブジェクトであることのみを検証する。
 * 各ゲームの `data` 構造の検証は analysis 層の責務（別 Issue で型化予定）。
 */
export const gameDataSchema = z
    .record(z.string(), z.unknown())
    .refine((d) => Object.keys(d).length > 0, {
        error: 'data は空オブジェクトにできません',
    });

/**
 * POST /api/games/submit のリクエストボディ。
 */
export const submitGameRequestSchema = z.object({
    user_id: userIdSchema,
    game_type: gameTypeSchema,
    data: gameDataSchema,
});

/**
 * POST /api/games/submit のレスポンス（200 OK）。
 */
export const submitGameResponseSchema = z.object({
    status: z.literal('success'),
    message: z.string(),
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
