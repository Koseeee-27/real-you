// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { registry } from '../openapi/registry';

/**
 * 各ゲーム（Game1 / Game2 / Game3）の行動データ（raw_data）の zod スキーマ群。
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

/**
 * Game2 の入力方式（音声 / テキスト）。
 *
 * Game2Data 直下の `inputMethod` と各ターン（`turns[].inputMethod`）の両方で
 * 使うため、共通サブスキーマとして定義する。
 *
 * 文字列リテラルかつエラーコードの個別マッピング（invalid_xxx 等）が不要なため
 * z.enum で簡潔に書く（voice.ts の voiceEmotionSchema と同方針）。OpenAPI 出力は
 * `{ type: 'string', enum: [...] }` のクリーンな形になる。
 */
const game2InputMethodSchema = registry.register(
    'Game2InputMethod',
    z.enum(['voice', 'text']).openapi({
        description: 'Game2 の入力方式（voice: 音声 / text: テキスト）',
    }),
);

/**
 * Game2 の 1 ターン分のメトリクス。
 *
 * テキスト入力時は音声系メトリクス（reactionTimeMs / speechDurationMs /
 * silenceDurationMs / volumeDb）が取得できないため `nullable`。
 */
const game2TurnSchema = registry.register(
    'Game2Turn',
    z
        .object({
            turnIndex: z.number().int().openapi({
                description: 'ターン番号（1 始まり）',
            }),
            inputMethod: game2InputMethodSchema,
            reactionTimeMs: z.number().nullable().openapi({
                description: '喋り出しまでの反応速度（ms）。テキスト入力時は null',
            }),
            speechDurationMs: z.number().nullable().openapi({
                description: '発話時間（ms）。テキスト入力時は null',
            }),
            silenceDurationMs: z.number().nullable().openapi({
                description: '発話中の沈黙合計（ms）。テキスト入力時は null',
            }),
            volumeDb: z.number().nullable().openapi({
                description: '平均音量（dB）。テキスト入力時は null',
            }),
            transcribedText: z.string().openapi({
                description: '文字起こし結果 or テキスト入力内容',
            }),
        })
        .openapi({
            description:
                'Game2 の 1 ターン分のメトリクス。テキスト入力時は音声系フィールドが null',
        }),
);

/**
 * Game2 のテキスト入力メトリクス。
 *
 * テキスト入力が一度も発生しなかった場合（全ターン音声）は null。
 */
const game2TextInputMetricsSchema = registry.register(
    'Game2TextInputMetrics',
    z
        .object({
            typingIntervalVariance: z.number().openapi({
                description: 'タイピング間隔の分散',
            }),
        })
        .openapi({
            description:
                'Game2 のテキスト入力メトリクス。全ターン音声入力の場合は Game2Data 側で null',
        }),
);

/**
 * Game2Data（AI カスタマーサポート）。
 */
export const game2DataSchema = registry.register(
    'Game2Data',
    z
        .object({
            inputMethod: game2InputMethodSchema,
            turnCount: z.number().int().openapi({
                description: '実施ターン数',
            }),
            turns: z.array(game2TurnSchema).openapi({
                description: '各ターンのメトリクス（turnCount 件）',
            }),
            // textInputMetrics は `z.union([..., z.null()])` で nullable にする。
            // `.nullable()` を使うと OpenAPI 3.1 上で `allOf: [$ref, type: ['object','null']]`
            // という形になり、openapi-typescript が `Game2TextInputMetrics & (Record<string, never> | null)`
            // という壊れた交差型を生成する（null も具体値も代入できなくなる）。
            // `z.union([schema, z.null()])` だと `oneOf: [$ref, type: 'null']` 形式になり、
            // 生成型が `Game2TextInputMetrics | null` で正しく表現される。
            textInputMetrics: z.union([game2TextInputMetricsSchema, z.null()]),
        })
        .openapi({
            description:
                'Game2（AI カスタマーサポート）の行動データ。仕様書「データ構造 → Game2Data」準拠',
        }),
);

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

export type Game1Data = z.infer<typeof game1DataSchema>;
export type Game2Data = z.infer<typeof game2DataSchema>;
export type Game3Data = z.infer<typeof game3DataSchema>;
