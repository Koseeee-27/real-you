// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';

/**
 * 複数エンドポイントで使い回す横断スキーマ。
 *
 * 設計方針:
 * - スキーマはリクエスト/レスポンスの「形」とメッセージのみカスタマイズする
 * - 業務エラーコード（API 設計書の invalid_mbti / invalid_answers 等）への
 *   マッピングは errorHandler の resolveZodErrorCode に集約する
 *   （理由: zod v4 では error 関数の戻り値の params が issue に伝播せず、
 *    スキーマ宣言時に業務コードを埋め込む一般的手段が存在しないため）
 *
 * zod v4 のトップレベル API（`z.uuid()` 等）と error オプションを使用する。
 *
 * OpenAPI メタデータ（`.openapi({ description, example })`）は Issue #5 の
 * OpenAPI 化で付与。description は API 設計書の文言に合わせる。
 */

/** user_id（UUID 文字列） */
export const userIdSchema = z
    .uuid({ error: 'user_id は UUID 形式で指定してください' })
    .openapi({
        description: 'ユーザー識別子（UUID v4）',
        example: '550e8400-e29b-41d4-a716-446655440000',
    });

/**
 * MBTI 形式（I/E + S/N + T/F + J/P の 4 文字）。
 * 大文字小文字は問わない（service 層で必要に応じて正規化する）。
 */
export const mbtiSchema = z
    .string({ error: 'mbti は文字列で指定してください' })
    .regex(/^[IE][SN][TF][JP]$/i, {
        error: 'mbti は INTJ / ESFP などの 4 文字で指定してください',
    })
    .openapi({
        description: 'MBTI タイプ（I/E + S/N + T/F + J/P の 4 文字、大文字小文字不問）',
        example: 'INTJ',
    });

/**
 * 基準値アンケートの回答選択肢（A/B/C/D）。
 *
 * z.enum ではなく z.string().refine() を使う理由:
 * - z.enum は「必須欠落（undefined）」と「値違反（A-D 以外）」を両方 invalid_value
 *   として返すため、errorHandler 側で API 設計書のエラーコード
 *   （invalid_request / invalid_answers）に区別してマッピングできない
 * - z.string().refine() なら:
 *   - 必須欠落 → z.string() の invalid_type issue
 *   - 値違反 → refine の custom issue
 *   と issue.code で区別可能
 *
 * type predicate（`val is AnswerOption`）により z.infer の型は 'A' | 'B' | 'C' | 'D' に narrowing される。
 *
 * OpenAPI 化では `.openapi({ enum: [...] })` で enum 情報を補う
 * （z.string().refine() のままだと OpenAPI 側で enum が失われるため）。
 */
const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'] as const;
export type AnswerOption = typeof ANSWER_OPTIONS[number];

export const answerOptionSchema = z
    .string({ error: '回答は必須です' })
    .refine(
        (val): val is AnswerOption =>
            (ANSWER_OPTIONS as readonly string[]).includes(val),
        { error: '回答は A / B / C / D のいずれかで指定してください' },
    )
    .openapi({
        description: '基準値アンケートの回答選択肢（A / B / C / D のいずれか）',
        enum: [...ANSWER_OPTIONS],
        example: 'A',
    });

/**
 * 5 軸各軸のスコア値（0-100 の整数）。
 * baseline_scores / scores / mbti_scores の各軸で共通利用する。
 *
 * 整数制約を付ける理由:
 * - 仕様書「DB 設計書」で baseline_* / score_* カラムはすべて `INT` 型
 * - 値の生成経路はすべて `Math.round` または整数定数のため常に整数
 */
const boundedScoreSchema = z.number().int().min(0).max(100);

/**
 * 5 軸スコア（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性）。
 *
 * 用途: baseline_scores / scores / mbti_scores（0-100 の正値）
 * gaps は負値を取りうるため別途 `gapScoresSchema` を用意する。
 *
 * 範囲制約を付ける理由:
 * - 仕様書「API 設計書」で各軸は 0-100 と明示されている
 * - Issue #5（OpenAPI 化）で zod スキーマを API 仕様に流用するため、
 *   制約をスキーマに乗せておくと OpenAPI の number/minimum/maximum に反映される
 * - `z.infer` の結果型は `number` のままで既存コードへの影響はない
 *   （`.min/.max` はランタイム検証にのみ作用）
 */
export const baselineScoresSchema = z
    .object({
        caution: boundedScoreSchema.openapi({ description: '慎重さ（0-100）' }),
        calmness: boundedScoreSchema.openapi({ description: '冷静さ（0-100）' }),
        logic: boundedScoreSchema.openapi({ description: '論理性（0-100）' }),
        cooperativeness: boundedScoreSchema.openapi({
            description: '協調性（0-100）',
        }),
        positivity: boundedScoreSchema.openapi({ description: '積極性（0-100）' }),
    })
    .openapi({
        description: '5 軸スコア（0-100 の整数）。baseline_scores / scores / mbti_scores で共通利用',
        example: {
            caution: 60,
            calmness: 55,
            logic: 70,
            cooperativeness: 45,
            positivity: 65,
        },
    });

export type BaselineScores = z.infer<typeof baselineScoresSchema>;

/**
 * 5 軸ギャップ（実測 - 自己申告の差分）。
 *
 * `baselineScoresSchema` と構造は同一だが、負値を取りうるため
 * 範囲制約（0-100）を付けない別スキーマとして分離している。
 * 整数制約は維持する（仕様書「DB 設計書」で gap_* カラムは `INT` 型）。
 */
export const gapScoresSchema = z
    .object({
        caution: z.number().int().openapi({ description: '慎重さのギャップ（実測 - 自己申告）' }),
        calmness: z.number().int().openapi({ description: '冷静さのギャップ' }),
        logic: z.number().int().openapi({ description: '論理性のギャップ' }),
        cooperativeness: z.number().int().openapi({ description: '協調性のギャップ' }),
        positivity: z.number().int().openapi({ description: '積極性のギャップ' }),
    })
    .openapi({
        description: '5 軸ギャップ（実測 - 自己申告）。負値を取りうる整数',
        example: {
            caution: -5,
            calmness: 10,
            logic: 0,
            cooperativeness: 15,
            positivity: -8,
        },
    });

export type GapScores = z.infer<typeof gapScoresSchema>;
