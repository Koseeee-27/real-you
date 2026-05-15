// zod プロトタイプに `.openapi()` を生やすため、z 本体の import より前に
// 拡張モジュールを副作用 import する（openapi/registry.ts 参照）。
import '../openapi/registry';
import { z } from 'zod';
import { registry } from '../openapi/registry';
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
 * ゲームごとにどの軸を測るかが異なるため（例: terms_game は caution/logic/calmness のみ）、
 * Partial 相当として各軸を optional にしている。
 *
 * `baselineScoresSchema.partial()` を使うことで、キー定義の単一ソース化と
 * 0-100 の範囲制約の継承を同時に実現している。
 */
const partialBaselineScoresSchema = baselineScoresSchema.partial();

/**
 * ゲーム識別子（文字列リテラル列挙）の値。
 *
 * `game_breakdown` / `phase_summaries` / `details` の各要素を識別するキーで、
 * `analysis/registry.ts` の `GAME_MODULES` のキーと一致する必要がある（registry.ts 側で
 * `Record<GameId, ...>` の型整合性が強制される）。
 *
 * `analysis/registry.ts` の真実の単一ソース問題:
 * - 本ファイル（schemas）が `analysis/registry.ts` を import すると schemas → analysis の
 *   逆方向依存になる。既存のレイヤー方針（routes → services → repositories と並列で
 *   schemas は analysis に依存されるが逆は持たない）を尊重するため、`GameId` の真実は
 *   本ファイル側に維持する。
 * - registry 側で `as const satisfies Record<GameId, ...>`（実装は GameModulesMap 型）を
 *   使うことで「GAME_MODULES の登録漏れ・余分・キー名と module.id の不一致」を
 *   コンパイル時に検出するため、Issue 本文の参考設計（GAME_MODULES 由来）と同等の
 *   型安全性が得られる。
 *
 * 配列スキーマ（gameBreakdownSchema / phaseSummariesSchema / detailsSchema）の
 * `.length()` 制約は `GAME_COUNT`（通常フロー本数 = 3）を用いる（`GAME_ID_VALUES` の
 * 要素数とは一致しない。ロング版用 GameId が列挙に含まれるため）。
 *
 * 文字列リテラル列挙で OpenAPI に公開する用途、かつエラーコード差別化が不要な
 * ケースのため `z.enum` を採用（同パターンの先行例: `schemas/voice.ts` の
 * `conversationMessageSchema.role`）。
 */
const GAME_ID_VALUES = [
    'terms_game',
    'helpdesk_game',
    'sorter_game',
    'group_chat_game',
] as const;

/**
 * 結果レスポンスの game_breakdown / phase_summaries / details の配列長。
 *
 * 通常フロー（`analysis/registry.ts` の `NORMAL_FLOW`）の本数（現状 3）であり、
 * `GAME_ID_VALUES`（OpenAPI / `GameId` 列挙に含まれる識別子）の要素数とは一致しない。
 *
 * `gameBreakdownSchema` / `phaseSummariesSchema` / `detailsSchema` は `.length(GAME_COUNT)`
 * と `game_id` ユニーク refine で欠落・重複を防ぐ。上流の `incomplete_games` ガード
 * （services/resultService.ts）は `NORMAL_FLOW.length` と整合している。
 */
const GAME_COUNT = 3;

/**
 * 配列要素の `game_id` がユニークか判定する `.refine` 用ヘルパ。
 *
 * `gameBreakdownSchema` / `phaseSummariesSchema` / `detailsSchema` で共通利用する。
 * 上流の `incomplete_games` ガードで 3 ゲーム完走が保証されている前提でも、
 * バリデーション層で重複 `game_id` を弾くことで FE 側の `find(game_id === 'xxx')`
 * が静かに `undefined` を返す状況を構造的に防止する（PR #104 レビュー指摘）。
 */
const hasUniqueGameIds = <T extends { game_id: string }>(arr: readonly T[]): boolean =>
    new Set(arr.map((e) => e.game_id)).size === arr.length;
const uniqueGameIdRefineMessage = 'game_id must be unique within the array';

/**
 * `.length(N).refine(...)` で zod runtime 検証を入れた配列スキーマに対し、
 * OpenAPI 側で `minItems / maxItems` を明示するためのメタデータ片。
 *
 * 現状の `@asteasolutions/zod-to-openapi` v8 は `.refine()` でラップされた
 * ZodEffects から内側の `.length()` 制約を辿らないため、`.length()` だけでは
 * OpenAPI ドキュメントに `minItems/maxItems` が出ない。`.openapi({ minItems, maxItems })`
 * で明示することで Swagger UI と FE 生成型の双方に長さ制約を伝える。
 *
 * runtime 検証は `.length()` チェーン側で担保しているので、本メタデータは
 * ドキュメント表現の補強に過ぎない（値の二重管理は GAME_COUNT に集約済み）。
 */
const fixedGameCountOpenApi = {
    minItems: GAME_COUNT,
    maxItems: GAME_COUNT,
} as const;

export const gameIdSchema = registry.register(
    'GameId',
    z.enum(GAME_ID_VALUES).openapi({
        description:
            'ゲーム識別子。terms_game = 利用規約ゲーム / helpdesk_game = AIカスタマーサポート（ロング版予備）/ ' +
            'sorter_game = 荷物仕分けゲーム / group_chat_game = 空気読みグループチャット',
        example: 'terms_game',
    }),
);

export type GameId = z.infer<typeof gameIdSchema>;

/**
 * ゲームごとのスコア内訳（配列形式）。
 *
 * 各要素は `{ game_id, scores }` の構造で、`game_id` はゲームを識別する文字列
 * （現状は 'terms_game' / 'helpdesk_game' / 'group_chat_game'）。
 * 配列化の理由は将来のゲーム追加・差し替えに耐えるため（Phase 1 / Issue #97）。
 *
 * `scores` は当該ゲームで測定する軸のみを含む（例: terms_game は caution / logic / calmness のみ）。
 */
export const gameBreakdownSchema = registry.register(
    'GameBreakdown',
    z
        .array(
            z.object({
                game_id: gameIdSchema,
                scores: partialBaselineScoresSchema.openapi({
                    description:
                        '当該ゲームで測定した軸のスコア（測定軸のみ含むため 5 軸すべては揃わない）',
                }),
            }),
        )
        // 配列長は登録ゲーム数に固定し、`game_id` の重複を弾く（PR #104 レビュー対応）。
        // 上流の `incomplete_games` ガード（services/resultService.ts）で 3 ゲーム完走が
        // 保証されている前提だが、欠落・重複をバリデーション層で構造的に防止する。
        .length(GAME_COUNT)
        .refine(hasUniqueGameIds, { message: uniqueGameIdRefineMessage })
        .openapi({
            ...fixedGameCountOpenApi,
            description:
                'ゲームごとのスコア内訳の配列。各ゲームで測定される軸のみが含まれるため ' +
                '5 軸すべてが揃うとは限らない（例: terms_game は caution / logic / calmness のみ）。' +
                `配列長は登録ゲーム数（${GAME_COUNT}）に固定され、game_id はユニーク。`,
            example: resultsResponseExample.game_breakdown,
        }),
);

/**
 * 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）。
 */
export const diagnosisFeedbackSchema = registry.register(
    'DiagnosisFeedback',
    z
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
        }),
);

/**
 * 各ゲーム終了後の行動要約（配列形式）。
 *
 * 各要素は `{ game_id, summary }` で、`game_id` は gameBreakdown と同じ識別子。
 * 配列化の理由は gameBreakdown と同じ（将来のゲーム追加・差し替え対応 / Phase 1）。
 */
export const phaseSummariesSchema = registry.register(
    'PhaseSummaries',
    z
        .array(
            z.object({
                game_id: gameIdSchema,
                summary: z.string().openapi({
                    description: '当該ゲームの行動を日本語テキストで振り返ったサマリー',
                }),
            }),
        )
        // 配列長 = 登録ゲーム数 + `game_id` ユニーク強制（PR #104 レビュー対応）。
        // 詳細は gameBreakdownSchema 側のコメント参照。
        .length(GAME_COUNT)
        .refine(hasUniqueGameIds, { message: uniqueGameIdRefineMessage })
        .openapi({
            ...fixedGameCountOpenApi,
            description:
                '各ゲーム終了後の行動を日本語テキストで振り返ったサマリーの配列。' +
                `配列長は登録ゲーム数（${GAME_COUNT}）に固定され、game_id はユニーク。`,
            example: resultsResponseExample.phase_summaries,
        }),
);

/**
 * 各ゲーム固有の詳細情報（タイトル / 特徴スコア / 比較メトリクス）。
 *
 * 構造は仕様書「データ構造」→ `GameDetail` 準拠:
 * - `title`: ゲーム名（例: '利用規約ゲーム'）
 * - `feature_scores[]`: 当該ゲームで測定した軸ごとのスコア（0-100 整数）
 * - `metrics[]`: ユーザー値と平均値の比較指標（読了速度 / 反応潜時 等）
 *
 * `axis` / `category` は仕様書上 `string` のため、リテラル union ではなく
 * `z.string()` で受ける（実装側の `'caution'` / `'scroll'` 等の文字列が
 * リテラル拡張で型エラーになるのを避ける）。
 *
 * `metrics[].user` と `metrics[].average` は ms / 秒 / dB / 回数など多様な
 * 単位を取りうるため、整数制約や正値制約は付けない（仕様書「データ構造」も
 * `number` 規定）。
 */
export const gameDetailSchema = registry.register(
    'GameDetail',
    z
        .object({
            game_id: gameIdSchema,
            title: z.string().openapi({
                description: 'ゲーム名（例: 利用規約ゲーム / AIカスタマーサポート / 空気読みグループチャット）',
            }),
            feature_scores: z
                .array(
                    z.object({
                        axis: z.string().openapi({
                            description: '軸キー（caution / calmness / logic / cooperativeness / positivity）',
                        }),
                        name: z.string().openapi({
                            description: '軸の日本語ラベル（慎重さ / 冷静さ / 論理性 / 協調性 / 積極性）',
                        }),
                        score: z.number().int().min(0).max(100).openapi({
                            description: '当該軸のゲーム単位スコア（0-100 整数）',
                        }),
                    }),
                )
                .openapi({
                    description: '当該ゲームで測定した軸ごとのスコア配列（測定軸数はゲームごとに異なる）',
                }),
            metrics: z
                .array(
                    z.object({
                        label: z.string().openapi({
                            description: '指標の表示ラベル（例: 読了速度(px/s) / 反応潜時(ms)）',
                        }),
                        user: z.number().openapi({
                            description: 'ユーザーの実測値（単位は label に依存）',
                        }),
                        average: z.number().openapi({
                            description: '比較対象の平均値（単位は label に依存）',
                        }),
                        category: z.string().openapi({
                            description: '指標のカテゴリ（scroll / time / mouse / input / voice / logic / message / social 等）',
                        }),
                    }),
                )
                .openapi({
                    description: 'ユーザー値と平均値を並べた比較指標の配列',
                }),
        })
        .openapi({
            description: 'ゲーム単位の詳細情報。仕様書「データ構造」→ GameDetail 参照',
            example: resultsResponseExample.details[0],
        }),
);

/**
 * 全ゲームの詳細情報をまとめた配列。
 *
 * 配列化の理由は gameBreakdown / phaseSummaries と同じ（将来のゲーム追加・差し替え対応 / Phase 1）。
 * 3 ゲーム完了が `incomplete_games` でガードされているため、results レスポンス到達時には
 * 必ず登録済みゲーム分の要素が揃う前提（現状は 3 要素）。
 */
export const detailsSchema = registry.register(
    'Details',
    z
        .array(gameDetailSchema)
        // 配列長 = 登録ゲーム数 + `game_id` ユニーク強制（PR #104 レビュー対応）。
        // 詳細は gameBreakdownSchema 側のコメント参照。
        .length(GAME_COUNT)
        .refine(hasUniqueGameIds, { message: uniqueGameIdRefineMessage })
        .openapi({
            ...fixedGameCountOpenApi,
            description:
                '各ゲーム固有の詳細情報（タイトル / feature_scores / metrics）の配列。' +
                '構造は仕様書「データ構造」→ GameDetail を参照。' +
                `配列長は登録ゲーム数（${GAME_COUNT}）に固定され、game_id はユニーク。`,
            example: resultsResponseExample.details,
        }),
);

/**
 * GET /api/results/:user_id のレスポンス（200 OK）。
 */
export const resultsResponseSchema = registry.register(
    'ResultResponse',
    z
        .object({
            user_id: userIdSchema,
            self_mbti: mbtiSchema.nullable().openapi({
                description: '自己申告の MBTI タイプ。登録時にスキップした場合は null',
            }),
            // baselineScoresSchema.nullable() ではなく z.union を使う理由:
            // zod-to-openapi は `$ref` を持つスキーマに `.nullable()` を後付けすると
            // `allOf: [{$ref}, {type:[object,null], description}]` を出力する。
            // openapi-typescript はこれを `BaselineScores & (Record<string, never> | null)`
            // という壊れた交差型に変換してしまう（Issue #61）。
            // `z.union([X, z.null()])` にすると `oneOf: [{$ref}, {type:null}]` になり、
            // 生成型も `BaselineScores | null` で期待通りとなる。
            mbti_scores: z.union([baselineScoresSchema, z.null()]).openapi({
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
            details: detailsSchema,
        })
        .openapi({
            description: '診断結果レスポンス（200 OK）',
            example: resultsResponseExample,
        }),
);

export type ResultsParams = z.infer<typeof resultsParamsSchema>;
export type GameBreakdown = z.infer<typeof gameBreakdownSchema>;
export type DiagnosisFeedback = z.infer<typeof diagnosisFeedbackSchema>;
export type PhaseSummaries = z.infer<typeof phaseSummariesSchema>;
export type GameDetail = z.infer<typeof gameDetailSchema>;
export type Details = z.infer<typeof detailsSchema>;
export type ResultResponse = z.infer<typeof resultsResponseSchema>;
