// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../../openapi/registry';
import { z } from 'zod';
import { registry } from '../../openapi/registry';

/**
 * Game3（空気読みグループチャット）の行動データ（raw_data）の zod スキーマ群。
 *
 * 設計方針:
 * - 仕様書「データ構造」を一次情報として、TS と zod の二重管理を避けるため
 *   スキーマを唯一の真実とし、TS 型は `z.infer` で導出する
 * - 本ファイルのスキーマは `submitGameRequestSchema`（schemas/games.ts）の
 *   `data` フィールド（discriminatedUnion の各 branch）として API 入出力に出るため、
 *   `.openapi()` でメタデータを付与し `registry.register()` で名前付きコンポーネント化する
 *   （Issue #58 で OpenAPI に公開し、FE の生成型に取り込まれるようにした）
 * - 内部サブスキーマも独立コンポーネント化することで、OpenAPI ドキュメント上の重複を避け
 *   FE 生成型でも再利用可能な型として扱えるようにする
 */

/**
 * Game3 の 1 ステージ分のメトリクス。
 *
 * `selectedOptionId`: 1-4 が通常選択、タイムアウト時は 0（仕様書準拠）。
 * 意味的に整数のフィールドには `.int()` を付けて型レベルで小数を弾く。
 * `min/max` 等の値の範囲制約は本スキーマでは表現せず、analysis 層で個別に扱う。
 */
const game3StageSchema = registry.register(
    'Game3Stage',
    z
        .object({
            stageId: z.number().int().openapi({
                description: 'ステージ ID（1-5）',
            }),
            selectedOptionId: z.number().int().openapi({
                description: '選択した選択肢 ID（1-4 が通常選択、タイムアウト時は 0）',
            }),
            reactionTimeMs: z.number().openapi({
                description: 'ステージ表示から選択までの反応時間（ms）',
            }),
            isTimeout: z.boolean().openapi({
                description: 'タイムアウトしたか',
            }),
        })
        .openapi({
            description: 'Game3 の 1 ステージ分のメトリクス',
        }),
);

/**
 * Game3Data（グループチャット）。
 *
 * `typingIndicatorReactTimeMs` はステージ 3 / 5 のみで計測される値のため `nullable`。
 */
export const game3DataSchema = registry.register(
    'Game3Data',
    z
        .object({
            tutorialViewTime: z.number().openapi({
                description: 'チュートリアル閲覧時間（ms）',
            }),
            hoveredOptions: z.number().int().openapi({
                description: '全ステージ通じた選択肢ホバー回数の合計',
            }),
            typingIndicatorReactTimeMs: z.number().nullable().openapi({
                description:
                    'ステージ 3 / 5 で「入力中...」表示後の操作時間（ms）。未計測時は null',
            }),
            stages: z.array(game3StageSchema).openapi({
                description: '各ステージのメトリクス',
            }),
        })
        .openapi({
            description:
                'Game3（空気読みグループチャット）の行動データ。仕様書「データ構造 → Game3Data」準拠',
        }),
);

export type Game3Data = z.infer<typeof game3DataSchema>;
