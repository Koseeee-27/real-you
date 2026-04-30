// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { registry } from '../openapi/registry';
import { userIdSchema } from './common';
import { GAME_TYPES } from '../types';
import {
    game1DataSchema,
    game2DataSchema,
    game3DataSchema,
} from './gameData';
import {
    submitGameRequestExampleGame1,
    submitGameRequestExampleGame2,
    submitGameRequestExampleGame3,
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
 * `submitGameRequestSchema` は discriminatedUnion 化（Issue #58）したため
 * `game_type` は各 branch で `z.literal(...)` に展開される。本 `gameTypeSchema`
 * は OpenAPI 公開用の独立コンポーネント（GameType）として残し、他エンドポイントや
 * FE 生成型から再利用可能にする。
 *
 * OpenAPI では `.openapi({ enum: [...] })` で enum 情報を補う
 * （z.union<z.literal> のままだと OpenAPI 側で `anyOf` に落ちてしまうため）。
 */
export const gameTypeSchema = registry.register(
    'GameType',
    z
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
        }),
);

/**
 * POST /api/games/submit の game_type 別リクエスト branch。
 *
 * 各 branch を `registry.register()` で名前付きコンポーネント化することで、
 * zod-to-openapi が `discriminator: { propertyName: 'game_type', mapping }` を
 * OpenAPI ドキュメントに出力する（branch が登録されていないと discriminator が
 * 自動付与されないため。zod-to-openapi v8 のソース参照）。
 *
 * 各 branch は `SubmitGameRequest` の oneOf 要素として独立コンポーネント化されるが、
 * FE/BE どちらも基本は親の `SubmitGameRequest` 型を介して扱うため、ここで生成される
 * 個別型は OpenAPI ドキュメント表示と discriminator マッピング用の副産物と捉える。
 */
const submitGameRequestGame1Schema = registry.register(
    'SubmitGameRequestGame1',
    z
        .object({
            user_id: userIdSchema,
            game_type: z.literal(GAME_TYPES.TERMS_GAME),
            data: game1DataSchema,
        })
        .openapi({
            description: 'Game1（利用規約ゲーム）の終了時に送るリクエスト',
            example: submitGameRequestExampleGame1,
        }),
);

const submitGameRequestGame2Schema = registry.register(
    'SubmitGameRequestGame2',
    z
        .object({
            user_id: userIdSchema,
            game_type: z.literal(GAME_TYPES.AI_CHAT),
            data: game2DataSchema,
        })
        .openapi({
            description: 'Game2（AI カスタマーサポート）の終了時に送るリクエスト',
            example: submitGameRequestExampleGame2,
        }),
);

const submitGameRequestGame3Schema = registry.register(
    'SubmitGameRequestGame3',
    z
        .object({
            user_id: userIdSchema,
            game_type: z.literal(GAME_TYPES.GROUP_CHAT),
            data: game3DataSchema,
        })
        .openapi({
            description: 'Game3（グループチャット）の終了時に送るリクエスト',
            example: submitGameRequestExampleGame3,
        }),
);

/**
 * POST /api/games/submit のリクエストボディ。
 *
 * `z.discriminatedUnion('game_type', [...])` で `game_type` × `data` の対応を
 * 型レベルで強制する（Issue #58）:
 * - game_type === 1 のとき data は Game1Data
 * - game_type === 2 のとき data は Game2Data
 * - game_type === 3 のとき data は Game3Data
 *
 * これにより OpenAPI 上は `oneOf` + `discriminator: { propertyName: 'game_type' }`
 * として表現され、Swagger UI / 生成型からも game_type 別の構造が見える。
 *
 * 入口バリデーション（discriminatedUnion）で既に data 構造は検証済みだが、
 * 既存挙動の維持を優先して `gameService.parseGameData` 側でも safeParse を残す
 * （多重防御 + 将来 service が他経路から呼ばれた場合の安全策）。
 */
export const submitGameRequestSchema = registry.register(
    'SubmitGameRequest',
    z
        .discriminatedUnion('game_type', [
            submitGameRequestGame1Schema,
            submitGameRequestGame2Schema,
            submitGameRequestGame3Schema,
        ])
        .openapi({
            description:
                '各ゲーム終了時に行動データを送信するリクエスト。' +
                'game_type を discriminator として data 構造が決まる。' +
                '同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す',
        }),
);

/**
 * POST /api/games/submit のレスポンス（200 OK）。
 */
export const submitGameResponseSchema = registry.register(
    'SubmitGameResponse',
    z
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
        }),
);

/**
 * ゲーム種別（1/2/3）の TS 型。
 * `gameTypeSchema` から `z.infer` で導出するため、値の追加時は
 * `types/index.ts` の `GAME_TYPES` と本スキーマの z.literal 配列を同期すれば
 * 本型も自動で追随する。
 */
export type GameType = z.infer<typeof gameTypeSchema>;

export type SubmitGameRequest = z.infer<typeof submitGameRequestSchema>;
export type SubmitGameResponse = z.infer<typeof submitGameResponseSchema>;
