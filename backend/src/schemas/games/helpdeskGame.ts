// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../../openapi/registry';
import { z } from 'zod';
import { registry } from '../../openapi/registry';

/**
 * AI カスタマーサポート（helpdesk_game / 旧 Game 2）の行動データ（raw_data）の zod スキーマ群。
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
 * AI カスタマーサポートの入力方式（音声 / テキスト）。
 *
 * HelpdeskGameData 直下の `inputMethod` と各ターン（`turns[].inputMethod`）の両方で
 * 使うため、共通サブスキーマとして定義する。
 *
 * 文字列リテラルかつエラーコードの個別マッピング（invalid_xxx 等）が不要なため
 * z.enum で簡潔に書く（voice.ts の voiceEmotionSchema と同方針）。OpenAPI 出力は
 * `{ type: 'string', enum: [...] }` のクリーンな形になる。
 */
const helpdeskGameInputMethodSchema = registry.register(
    'HelpdeskGameInputMethod',
    z.enum(['voice', 'text']).openapi({
        description: 'AI カスタマーサポートの入力方式（voice: 音声 / text: テキスト）',
    }),
);

/**
 * AI カスタマーサポートの 1 ターン分のメトリクス。
 *
 * テキスト入力時は音声系メトリクス（reactionTimeMs / speechDurationMs /
 * silenceDurationMs / volumeDb）が取得できないため `nullable`。
 */
const helpdeskGameTurnSchema = registry.register(
    'HelpdeskGameTurn',
    z
        .object({
            turnIndex: z.number().int().openapi({
                description: 'ターン番号（1 始まり）',
            }),
            inputMethod: helpdeskGameInputMethodSchema,
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
                'AI カスタマーサポートの 1 ターン分のメトリクス。テキスト入力時は音声系フィールドが null',
        }),
);

/**
 * AI カスタマーサポートのテキスト入力メトリクス。
 *
 * テキスト入力が一度も発生しなかった場合（全ターン音声）は null。
 */
const helpdeskGameTextInputMetricsSchema = registry.register(
    'HelpdeskGameTextInputMetrics',
    z
        .object({
            typingIntervalVariance: z.number().openapi({
                description: 'タイピング間隔の分散',
            }),
        })
        .openapi({
            description:
                'AI カスタマーサポートのテキスト入力メトリクス。全ターン音声入力の場合は HelpdeskGameData 側で null',
        }),
);

/**
 * HelpdeskGameData（AI カスタマーサポート）。
 */
export const helpdeskGameDataSchema = registry.register(
    'HelpdeskGameData',
    z
        .object({
            inputMethod: helpdeskGameInputMethodSchema,
            turnCount: z.number().int().openapi({
                description: '実施ターン数',
            }),
            turns: z.array(helpdeskGameTurnSchema).openapi({
                description: '各ターンのメトリクス（turnCount 件）',
            }),
            // textInputMetrics は `z.union([..., z.null()])` で nullable にする。
            // `.nullable()` を使うと OpenAPI 3.1 上で `allOf: [$ref, type: ['object','null']]`
            // という形になり、openapi-typescript が `HelpdeskGameTextInputMetrics & (Record<string, never> | null)`
            // という壊れた交差型を生成する（null も具体値も代入できなくなる）。
            // `z.union([schema, z.null()])` だと `oneOf: [$ref, type: 'null']` 形式になり、
            // 生成型が `HelpdeskGameTextInputMetrics | null` で正しく表現される。
            textInputMetrics: z.union([helpdeskGameTextInputMetricsSchema, z.null()]),
        })
        .openapi({
            description:
                'AI カスタマーサポートの行動データ。仕様書「データ構造 → HelpdeskGameData」準拠',
        }),
);

export type HelpdeskGameData = z.infer<typeof helpdeskGameDataSchema>;
