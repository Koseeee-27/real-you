// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import {
    baselineScoresSchema,
    gapScoresSchema,
    mbtiSchema,
    userIdSchema,
} from './common';
import { resultsResponseExample } from '../openapi/examples';

/**
 * GET /api/results/:user_id のスキーマ群。
 *
 * - 入力検証は validate ミドルウェア経由で zod に一元化
 * - 型は z.infer から導出して TS と zod の二重管理を避ける
 * - 業務エラーコード（invalid_user_id / user_not_found / incomplete_games 等）の
 *   マッピングは errorHandler の resolveZodErrorCode / isBusinessError に集約する
 *   （schemas/common.ts の設計方針と同じ）
 * - OpenAPI メタデータ（description / example）は本ファイルに寄せ、
 *   example の値は `openapi/examples.ts` に集約する
 */

/**
 * パスパラメータ。user_id は UUID 文字列。
 *
 * 共通スキーマの `userIdSchema`（UUID 検証）をそのまま利用する。
 * errorHandler 側で path[0] === 'user_id' のエラーは `invalid_user_id` に
 * マッピング済みのため、検証失敗時の業務コードも仕様書準拠となる。
 */
export const resultsParamsSchema = z.object({
    user_id: userIdSchema,
});

/**
 * 5 軸各軸ごとのスコアを optional にした構造。
 *
 * ゲームごとにどの軸を測るかが異なるため（例: game_1 は caution/logic/calmness のみ）、
 * Partial 相当として各軸を optional にしている。
 *
 * `baselineScoresSchema.partial()` を使うことで、キー定義の単一ソース化と
 * 0-100 の範囲制約の継承を同時に実現している。
 */
const partialBaselineScoresSchema = baselineScoresSchema.partial();

/**
 * ゲームごとのスコア内訳。
 * 各ゲームキー（game_1 / game_2 / game_3）は optional。
 */
export const gameBreakdownSchema = z
    .object({
        game_1: partialBaselineScoresSchema.optional(),
        game_2: partialBaselineScoresSchema.optional(),
        game_3: partialBaselineScoresSchema.optional(),
    })
    .openapi({
        description:
            'ゲームごとのスコア内訳。各ゲームで測定される軸のみが含まれるため ' +
            '5 軸すべてが揃うとは限らない（例: game_1 は caution / logic / calmness のみ）',
        example: resultsResponseExample.game_breakdown,
    });

/**
 * 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）。
 */
export const diagnosisFeedbackSchema = z
    .object({
        title: z.string().openapi({
            description: '診断タイプの見出し（最大ギャップ軸に基づく）',
            example: resultsResponseExample.feedback.title,
        }),
        description: z.string().openapi({
            description: '診断タイプの説明文',
            example: resultsResponseExample.feedback.description,
        }),
        gap_point: z.string().openapi({
            description: '自己認識と実測の乖離が最大だった軸名（日本語ラベル）',
            example: resultsResponseExample.feedback.gap_point,
        }),
    })
    .openapi({
        description: '診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）',
        example: resultsResponseExample.feedback,
    });

/**
 * 各フェーズ（ゲーム）の振り返りテキスト。
 */
export const phaseSummariesSchema = z
    .object({
        phase_1: z.string().openapi({
            description: 'Game 1（利用規約）の行動要約',
        }),
        phase_2: z.string().openapi({
            description: 'Game 2（AI カスタマーサポート）の行動要約',
        }),
        phase_3: z.string().openapi({
            description: 'Game 3（グループチャット）の行動要約',
        }),
    })
    .openapi({
        description: '各ゲーム終了後の行動を日本語テキストで振り返ったサマリー',
        example: resultsResponseExample.phase_summaries,
    });

/**
 * GET /api/results/:user_id のレスポンス（200 OK）。
 *
 * `details` について（暫定定義）:
 * - 本フィールドは各ゲーム固有のメトリクスと特徴スコアを含み、構造が広く
 *   analysis 層（scoreCalculator.ts）の戻り値構造に直接依存する
 * - 現時点では `z.unknown()` とし、FE 側は既存の型定義に従って参照する
 * - 厳密化は analysis 戻り値の構造を固めてから別 Issue で対応する
 *   （Issue #6 の実装計画「論点」参照）
 */
export const resultsResponseSchema = z
    .object({
        user_id: userIdSchema,
        self_mbti: mbtiSchema.nullable().openapi({
            description: '自己申告の MBTI タイプ。登録時にスキップした場合は null',
        }),
        mbti_scores: baselineScoresSchema.nullable().openapi({
            description: 'MBTI 理論値（self_mbti から導出）。self_mbti が null の場合は null',
        }),
        scores: baselineScoresSchema.openapi({
            description: '3 ゲームから算出された実測の 5 軸スコア',
        }),
        baseline_scores: baselineScoresSchema.openapi({
            description:
                'ベースライン（アンケート由来）。self_mbti があれば MBTI 理論値と 70:30 でブレンド済み',
        }),
        gaps: gapScoresSchema.openapi({
            description: '実測 - ベースライン の差分。負値はベースラインを下回ったことを意味する',
        }),
        game_breakdown: gameBreakdownSchema,
        feedback: diagnosisFeedbackSchema,
        accuracy_score: z.number().int().min(0).max(100).openapi({
            description: '自己認識精度（0-100 の整数）。100 - |平均ギャップ|',
            example: resultsResponseExample.accuracy_score,
        }),
        phase_summaries: phaseSummariesSchema,
        /**
         * 各ゲーム固有の詳細メトリクス。構造は `analysis/scoreCalculator` の戻り値に
         * 直接依存するため現時点では `z.unknown()` で緩く定義している。
         * 厳密化は analysis 戻り値の構造を固めてから別 Issue で対応する
         * （本ファイル冒頭の `details` コメント参照）。
         */
        details: z.unknown().openapi({
            description:
                '各ゲーム固有の詳細メトリクス（ゲーム別タイトル / feature_scores / metrics）。' +
                '構造の詳細は仕様書「データ構造」→ GameDetail を参照',
            example: resultsResponseExample.details,
        }),
    })
    .openapi({
        description: '診断結果レスポンス（200 OK）',
        example: resultsResponseExample,
    });

export type ResultsParams = z.infer<typeof resultsParamsSchema>;
export type GameBreakdown = z.infer<typeof gameBreakdownSchema>;
export type DiagnosisFeedback = z.infer<typeof diagnosisFeedbackSchema>;
export type PhaseSummaries = z.infer<typeof phaseSummariesSchema>;
export type ResultResponse = z.infer<typeof resultsResponseSchema>;
