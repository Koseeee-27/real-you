// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../../openapi/registry';
import { z } from 'zod';
import { registry } from '../../openapi/registry';

/**
 * 空気読みグループチャット（group_chat_game / game_type=3）の行動データ（raw_data）の zod スキーマ群。
 *
 * 設計方針:
 * - 仕様書「データ構造」を一次情報として、TS と zod の二重管理を避けるため
 *   スキーマを唯一の真実とし、TS 型は `z.infer` で導出する
 * - 本ファイルのスキーマは `submitGameRequestSchema`（schemas/games.ts）の
 *   `data` フィールド（discriminatedUnion の各 branch）として API 入出力に出るため、
 *   `.openapi()` でメタデータを付与し `registry.register()` で名前付きコンポーネント化する
 * - 内部サブスキーマも独立コンポーネント化することで、OpenAPI ドキュメント上の重複を避け
 *   FE 生成型でも再利用可能な型として扱えるようにする
 */

/**
 * 空気読みグループチャットの 1 ターン分のメトリクス。
 *
 * `turnId` は 1-3 の固定リテラル union。
 * `selectedOptionId`: 1-4 の内部設計上の意図 ID（表示順とは独立）。
 * 意味的に整数のフィールドには `.int()` を付けて型レベルで小数を弾く。
 */
const groupChatGameTurnSchema = registry.register(
    'GroupChatGameTurn',
    z
        .object({
            turnId: z.union([z.literal(1), z.literal(2), z.literal(3)]).openapi({
                description: 'ターン ID（1-3 固定）',
            }),
            selectedOptionId: z.number().int().openapi({
                description: '選択した選択肢 ID（1-4 の内部設計上の意図 ID。表示順と独立）',
            }),
            reactionTimeMs: z.number().openapi({
                description: '選択肢提示 → 選択までの反応時間（ms）',
            }),
            isTimeout: z.boolean().openapi({
                description: 'タイムアウトしたか',
            }),
            firstHoverElapsedMs: z.number().nullable().openapi({
                description: '選択肢表示 → 初ホバーまでの経過時間（ms）。ホバーなしの場合は null',
            }),
            finalChoiceHoverOrder: z.number().int().nullable().openapi({
                description:
                    '最終選択した選択肢が何番目にホバーされたか（1-4）。ホバーなしの場合は null',
            }),
            decisionConfidenceMs: z.number().nullable().openapi({
                description:
                    '最終クリック直前の最後のホバー時間（ms）。ホバーなしの場合は null',
            }),
            mouseMovementDistance: z.number().openapi({
                description: '選択肢表示 → 決定までのマウス総移動距離（px）',
            }),
            hoverSequence: z.array(z.number().int()).openapi({
                description:
                    'ホバーした選択肢 ID の順番（上限 10 件。超過分は切り捨て）',
            }),
            scrolledChatHistoryCount: z.number().int().openapi({
                description: 'チャット履歴を遡るスクロールの回数',
            }),
        })
        .openapi({
            description: '空気読みグループチャットの 1 ターン分のメトリクス',
        }),
);

/**
 * GroupChatGameData（空気読みグループチャット）。
 *
 * `turns` は要素数 3 固定の配列。
 * `turn1AnsweredBeforeColleagueA` / `turn1TypingIndicatorReactTimeMs` /
 * `turn1HoverChangedAfterColleagueATyping` はターン 1 固有の計測値のため `nullable`。
 */
export const groupChatGameDataSchema = registry.register(
    'GroupChatGameData',
    z
        .object({
            tutorialViewTime: z.number().openapi({
                description: 'オンボーディング滞在時間（スライド 1 + 2 合計、ms）',
            }),
            turns: z.array(groupChatGameTurnSchema).length(3).openapi({
                description: '各ターンのメトリクス（要素数 3 固定）',
            }),
            turn1AnsweredBeforeColleagueA: z.boolean().nullable().openapi({
                description:
                    'ターン 1 でプレイヤーが同僚 A より先に回答したか。true=先回り / false=譲った / null=タイムアウト',
            }),
            turn1TypingIndicatorReactTimeMs: z.number().nullable().openapi({
                description:
                    'ターン 1 で同僚 A の「入力中」表示 → プレイヤー操作までの時間（ms）。未計測時は null',
            }),
            turn1HoverChangedAfterColleagueATyping: z.boolean().nullable().openapi({
                description:
                    'ターン 1 で同僚 A の「入力中」表示後にホバー先が変わったか。未計測時は null',
            }),
            inputDeviceType: z.enum(['mouse', 'touch', 'keyboard']).openapi({
                description: '入力デバイスの種類',
            }),
        })
        .openapi({
            description:
                '空気読みグループチャットの行動データ。仕様書「データ構造 → GroupChatGameData」準拠',
        }),
);

export type GroupChatGameTurnData = z.infer<typeof groupChatGameTurnSchema>;
export type GroupChatGameData = z.infer<typeof groupChatGameDataSchema>;
