// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../../openapi/registry';
import { z } from 'zod';
import { registry } from '../../openapi/registry';

/**
 * Game1（利用規約ゲーム）の行動データ（raw_data）の zod スキーマ群。
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
 * Game1 のスクロールイベント（200ms 間隔のサンプリングログ）。
 */
const scrollEventSchema = registry.register(
    'ScrollEvent',
    z
        .object({
            position: z.number().openapi({
                description: 'スクロール位置（px）',
            }),
            timestamp: z.number().openapi({
                description: 'ゲーム開始からの経過時間（ms）',
            }),
        })
        .openapi({
            description: 'Game1 のスクロールイベント（200ms 間隔のサンプリングログ）',
            example: { position: 1200, timestamp: 2500 },
        }),
);

/**
 * Game1 のチェックボックス状態。
 *
 * - `checked`: 最終的なチェック状態
 * - `changed`: ユーザーが初期状態から変更したか
 *
 * 仕様書「データ構造 → Game1Data → checkboxStates」では readConfirm / mailMagazine /
 * thirdPartyShare の 3 つに同形が使われるため、共通サブスキーマとして定義する。
 */
const checkboxStateSchema = registry.register(
    'CheckboxState',
    z
        .object({
            checked: z.boolean().openapi({
                description: '最終的なチェック状態',
            }),
            changed: z.boolean().openapi({
                description: 'ユーザーが初期状態から変更したか',
            }),
        })
        .openapi({
            description:
                'Game1 のチェックボックス状態（readConfirm / mailMagazine / thirdPartyShare で共通）',
            example: { checked: true, changed: true },
        }),
);

/**
 * Game1 のポップアップ統計。
 *
 * ポップアップは滞在時間 timeout で出る仕様のため、高速スクロール時は
 * クライアントから送信されない（→ Game1Data 側で `optional`）。
 */
const popupStatsSchema = registry.register(
    'PopupStats',
    z
        .object({
            timeToClose: z.number().openapi({
                description: 'ポップアップ表示から閉じるまでの時間（ms）',
            }),
            clickCount: z.number().int().openapi({
                description: 'ポップアップ閉じるまでのクリック回数',
            }),
            mouseJitter: z.number().openapi({
                description: 'マウス余剰移動距離（px）',
            }),
        })
        .openapi({
            description:
                'Game1 のポップアップ統計。高速スクロール時はポップアップ自体が出ないため Game1Data 側で optional',
            example: { timeToClose: 850, clickCount: 1, mouseJitter: 42.3 },
        }),
);

/**
 * Game1Data（利用規約ゲーム）。
 *
 * 仕様書「データ構造 → Game1Data」と完全に一致させること。
 * `popupStats` のみ optional、それ以外は必須。
 */
export const game1DataSchema = registry.register(
    'Game1Data',
    z
        .object({
            totalTime: z.number().openapi({
                description: '滞在時間（秒）',
            }),
            // 文字列リテラルかつエラーコードの個別マッピング（invalid_xxx 等）が不要なため、
            // OpenAPI 出力をクリーンに保てる z.enum を採用する（voice.ts の voiceEmotionSchema と同方針）。
            // data 配下のフィールドはすべて errorHandler で `invalid_request` に集約されるので、
            // z.enum が「必須欠落と値違反を区別できない」点はここでは問題にならない。
            finalAction: z.enum(['agree', 'disagree']).openapi({
                description: '最終アクション（同意 / 拒否）',
            }),
            reachedBottom: z.boolean().openapi({
                description: '規約の最下部までスクロールしたか',
            }),
            scrollEvents: z.array(scrollEventSchema).openapi({
                description: 'スクロールイベントの時系列ログ',
            }),
            hiddenInput: z.string().nullable().openapi({
                description: '隠しテキスト入力欄の値（未入力なら null）',
            }),
            checkboxStates: z
                .object({
                    readConfirm: checkboxStateSchema,
                    mailMagazine: checkboxStateSchema,
                    thirdPartyShare: checkboxStateSchema,
                })
                .openapi({
                    description: '3 つのチェックボックスの最終状態と変更有無',
                }),
            // popupStats は popupStatsSchema 側に description を寄せている。
            // ここで `.openapi({ description })` を付けると openapi-typescript の生成型で
            // `PopupStats & unknown` という不自然な交差型が出るため、wrapper には description を付けない。
            popupStats: popupStatsSchema.optional(),
            agreeButtonHoverTimeMs: z.number().openapi({
                description: '同意ボタンホバー → クリックの迷い時間（ms）',
            }),
        })
        .openapi({
            description:
                'Game1（利用規約ゲーム）の行動データ。仕様書「データ構造 → Game1Data」準拠',
        }),
);

export type Game1Data = z.infer<typeof game1DataSchema>;
