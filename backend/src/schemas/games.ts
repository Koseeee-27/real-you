// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { registry } from '../openapi/registry';
import { userIdSchema } from './common';
import { GAME_TYPES } from '../types';
import {
    termsGameDataSchema,
    helpdeskGameDataSchema,
    groupChatGameDataSchema,
} from './gameData';
import {
    submitGameRequestExampleTermsGame,
    submitGameRequestExampleHelpdeskGame,
    submitGameRequestExampleGroupChatGame,
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
 * `GAME_TYPES` の全値を 1 箇所に集約した配列。
 *
 * `z.literal(...)` の引数と `.openapi({ enum: [...] })` の両方から参照することで、
 * 値の追加時に `types/index.ts` の `GAME_TYPES` のみを更新すれば
 * 型と OpenAPI enum が自動で追随する（二重管理を解消）。
 *
 * `Object.values(GAME_TYPES)` の戻り値型は `(1 | 2 | 3)[]` で、
 * `z.literal<const T extends ReadonlyArray<Literal>>(value: T)` の T[number] 推論により
 * 内部型は `1 | 2 | 3` のユニオンが維持される（`gameService.parseGameData` の
 * 網羅性チェック `const _exh: never = gameType` が機能するために必須）。
 */
const GAME_TYPE_VALUES = Object.values(GAME_TYPES);

/**
 * ゲーム種別（1: 利用規約 / 2: AI チャット / 3: グループチャット）。
 *
 * `types/index.ts` の `GAME_TYPES` 定数を唯一の真実とし、
 * `GAME_TYPE_VALUES` 経由で zod スキーマと OpenAPI enum の両方に展開する。
 *
 * `submitGameRequestSchema` は discriminatedUnion 化（Issue #58）したため
 * `game_type` は各 branch で `z.literal(...)` に展開される。本 `gameTypeSchema`
 * は OpenAPI 公開用の独立コンポーネント（GameType）として残し、他エンドポイントや
 * FE 生成型から再利用可能にする。
 *
 * NOTE: zod v4 の `z.literal(array)` は内部的に `1 | 2 | 3` の literal union として
 * 振る舞うが、`@asteasolutions/zod-to-openapi` v8.5 の `LiteralTransformer` は
 * multi-value literal を `enum: [values[0]]`（先頭 1 要素のみ）にしか展開しない。
 * よって OpenAPI で正しい enum を出すには `.openapi({ enum: [...] })` で全値を
 * 明示する必要がある。値のソースは同じ `GAME_TYPE_VALUES` なので二重管理にはならない。
 */
export const gameTypeSchema = registry.register(
    'GameType',
    z.literal(GAME_TYPE_VALUES).openapi({
        description:
            'ゲーム種別。1: 利用規約ゲーム / 2: AI カスタマーサポート / 3: グループチャット',
        enum: GAME_TYPE_VALUES,
        example: GAME_TYPES.TERMS_GAME,
    }),
);

/**
 * POST /api/games/submit のリクエストボディ。
 *
 * `z.discriminatedUnion('game_type', [...])` で `game_type` × `data` の対応を
 * 型レベルで強制する（Issue #58）:
 * - game_type === 1 のとき data は TermsGameData
 * - game_type === 2 のとき data は HelpdeskGameData
 * - game_type === 3 のとき data は GroupChatGameData
 *
 * OpenAPI 上は `oneOf` で表現され、各 branch の
 * `game_type: { type: 'number', enum: [N] }` リテラル enum で判別する形になる。
 * 明示的な `discriminator` キーは出力しない方針:
 * - 各 branch を named component 化すると zod-to-openapi が
 *   `discriminator: { mapping: { '1': ..., '2': ..., '3': ... } }` を出力する
 * - OpenAPI 仕様上 `mapping` のキーは Map<string, string> のため数値リテラルでも
 *   文字列化される。openapi-typescript v7 はこのキーをそのまま tsLiteral に渡すため、
 *   FE 生成型の game_type が文字列リテラル "1" / "2" / "3" になり、BE の
 *   z.literal(1|2|3) と矛盾する（PR #64 のレビュー経緯参照）。
 *
 * Swagger UI / 生成型からも各 branch の game_type literal で構造が見えるため、
 * discriminator 等価の機能は維持される。
 *
 * 入口バリデーション（discriminatedUnion）で既に data 構造は検証済みだが、
 * 既存挙動の維持を優先して `gameService.parseGameData` 側でも safeParse を残す
 * （多重防御 + 将来 service が他経路から呼ばれた場合の安全策）。
 */
export const submitGameRequestSchema = registry.register(
    'SubmitGameRequest',
    z
        .discriminatedUnion('game_type', [
            z
                .object({
                    user_id: userIdSchema,
                    game_type: z.literal(GAME_TYPES.TERMS_GAME),
                    data: termsGameDataSchema,
                })
                .openapi({
                    description:
                        '利用規約ゲーム（game_type=1）の終了時に送るリクエスト',
                    example: submitGameRequestExampleTermsGame,
                }),
            z
                .object({
                    user_id: userIdSchema,
                    game_type: z.literal(GAME_TYPES.AI_CHAT),
                    data: helpdeskGameDataSchema,
                })
                .openapi({
                    description:
                        'AI カスタマーサポート（game_type=2）の終了時に送るリクエスト',
                    example: submitGameRequestExampleHelpdeskGame,
                }),
            z
                .object({
                    user_id: userIdSchema,
                    game_type: z.literal(GAME_TYPES.GROUP_CHAT),
                    data: groupChatGameDataSchema,
                })
                .openapi({
                    description:
                        '空気読みグループチャット（game_type=3）の終了時に送るリクエスト',
                    example: submitGameRequestExampleGroupChatGame,
                }),
        ])
        .openapi({
            description:
                '各ゲーム終了時に行動データを送信するリクエスト。' +
                'game_type の値（1 / 2 / 3）で data 構造が決まる（oneOf）。' +
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
 * `types/index.ts` の `GAME_TYPES` のみを更新すれば本型・zod スキーマ・
 * OpenAPI enum の全てが `GAME_TYPE_VALUES` 経由で自動的に追随する。
 */
export type GameType = z.infer<typeof gameTypeSchema>;

export type SubmitGameRequest = z.infer<typeof submitGameRequestSchema>;
export type SubmitGameResponse = z.infer<typeof submitGameResponseSchema>;
