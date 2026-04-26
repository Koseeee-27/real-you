import { z } from 'zod';

/**
 * 各ゲーム（Game1 / Game2 / Game3）の行動データ（raw_data）の zod スキーマ群。
 *
 * 設計方針:
 * - 仕様書「データ構造」を一次情報として、TS と zod の二重管理を避けるため
 *   スキーマを唯一の真実とし、TS 型は `z.infer` で導出する
 * - 本ファイルのスキーマは内部用（analysis 層 / repositories 層の型付け）であり、
 *   API 入出力には直接出ないため `.openapi()` メタデータは付けない
 * - 入口の API バリデーションは `schemas/games.ts` の `submitGameRequestSchema.data`
 *   （汎用 record）が引き続き担う
 */

/**
 * Game1 のスクロールイベント（200ms 間隔のサンプリングログ）。
 */
const scrollEventSchema = z.object({
    position: z.number(),
    timestamp: z.number(),
});

/**
 * Game1 のチェックボックス状態。
 *
 * - `checked`: 最終的なチェック状態
 * - `changed`: ユーザーが初期状態から変更したか
 *
 * 仕様書「データ構造 → Game1Data → checkboxStates」では readConfirm / mailMagazine /
 * thirdPartyShare の 3 つに同形が使われるため、共通サブスキーマとして定義する。
 */
const checkboxStateSchema = z.object({
    checked: z.boolean(),
    changed: z.boolean(),
});

/**
 * Game1 のポップアップ統計。
 *
 * ポップアップは滞在時間 timeout で出る仕様のため、高速スクロール時は
 * クライアントから送信されない（→ Game1Data 側で `optional`）。
 */
const popupStatsSchema = z.object({
    timeToClose: z.number(),
    clickCount: z.number().int(),
    mouseJitter: z.number(),
});

/**
 * Game1Data（利用規約ゲーム）。
 *
 * 仕様書「データ構造 → Game1Data」と完全に一致させること。
 * `popupStats` のみ optional、それ以外は必須。
 */
export const game1DataSchema = z.object({
    totalTime: z.number(),
    finalAction: z.enum(['agree', 'disagree']),
    reachedBottom: z.boolean(),
    scrollEvents: z.array(scrollEventSchema),
    hiddenInput: z.string().nullable(),
    checkboxStates: z.object({
        readConfirm: checkboxStateSchema,
        mailMagazine: checkboxStateSchema,
        thirdPartyShare: checkboxStateSchema,
    }),
    popupStats: popupStatsSchema.optional(),
    agreeButtonHoverTimeMs: z.number(),
});

/**
 * Game2 の入力方式（音声 / テキスト）。
 *
 * Game2Data 直下の `inputMethod` と各ターン（`turns[].inputMethod`）の両方で
 * 使うため、共通サブスキーマとして定義する。
 */
const game2InputMethodSchema = z.enum(['voice', 'text']);

/**
 * Game2 の 1 ターン分のメトリクス。
 *
 * テキスト入力時は音声系メトリクス（reactionTimeMs / speechDurationMs /
 * silenceDurationMs / volumeDb）が取得できないため `nullable`。
 */
const game2TurnSchema = z.object({
    turnIndex: z.number().int(),
    inputMethod: game2InputMethodSchema,
    reactionTimeMs: z.number().nullable(),
    speechDurationMs: z.number().nullable(),
    silenceDurationMs: z.number().nullable(),
    volumeDb: z.number().nullable(),
    transcribedText: z.string(),
});

/**
 * Game2 のテキスト入力メトリクス。
 *
 * テキスト入力が一度も発生しなかった場合（全ターン音声）は null。
 */
const game2TextInputMetricsSchema = z.object({
    typingIntervalVariance: z.number(),
});

/**
 * Game2Data（AI カスタマーサポート）。
 */
export const game2DataSchema = z.object({
    inputMethod: game2InputMethodSchema,
    turnCount: z.number().int(),
    turns: z.array(game2TurnSchema),
    textInputMetrics: game2TextInputMetricsSchema.nullable(),
});

/**
 * Game3 の 1 ステージ分のメトリクス。
 *
 * `selectedOptionId`: 1-4 が通常選択、タイムアウト時は 0（仕様書準拠）。
 * 意味的に整数のフィールドには `.int()` を付けて型レベルで小数を弾く。
 * `min/max` 等の値の範囲制約は本スキーマでは表現せず、analysis 層で個別に扱う。
 */
const game3StageSchema = z.object({
    stageId: z.number().int(),
    selectedOptionId: z.number().int(),
    reactionTimeMs: z.number(),
    isTimeout: z.boolean(),
});

/**
 * Game3Data（グループチャット）。
 *
 * `typingIndicatorReactTimeMs` はステージ 3 / 5 のみで計測される値のため `nullable`。
 */
export const game3DataSchema = z.object({
    tutorialViewTime: z.number(),
    hoveredOptions: z.number().int(),
    typingIndicatorReactTimeMs: z.number().nullable(),
    stages: z.array(game3StageSchema),
});

export type Game1Data = z.infer<typeof game1DataSchema>;
export type Game2Data = z.infer<typeof game2DataSchema>;
export type Game3Data = z.infer<typeof game3DataSchema>;
