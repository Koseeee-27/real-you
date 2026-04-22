import { registry } from '../registry';
import {
    resultsParamsSchema,
    resultsResponseSchema,
} from '../../schemas/results';
import { apiErrorSchema, ERROR_CODES } from '../../schemas/errorCodes';
import { apiErrorExamples } from '../examples';

/**
 * GET /api/results/:user_id のパス登録。
 *
 * 設計方針:
 * - 仕様書「API 設計書」準拠で 200 / 400 / 404 を定義する
 * - user_id の UUID 形式違反は validate ミドルウェア経由で 400 `invalid_user_id` に
 *   マッピングされる（schemas/common.ts の設計方針参照）
 * - 3 ゲーム全て未完了は resultService 内で 400 `incomplete_games` を投げる
 * - user_not_found は resultService 内で 404 `user_not_found` を投げる
 *   （games / voice が user 欠落で 400 を返すのとは仕様が異なる点に注意）
 *
 * 本ファイルは `document.ts` から副作用 import されることで registry に登録される。
 */
registry.registerPath({
    method: 'get',
    path: '/api/results/{user_id}',
    tags: ['Results'],
    summary: '診断結果取得',
    description:
        '3 ゲーム完了後に呼び出す。analysis_results にキャッシュがあればそれを、' +
        'なければゲームログから計算して UPSERT した結果を返す。',
    request: {
        params: resultsParamsSchema,
    },
    responses: {
        200: {
            description: '診断結果取得成功',
            content: {
                'application/json': {
                    schema: resultsResponseSchema,
                },
            },
        },
        400: {
            description:
                'リクエスト不正。主な業務エラーコード: ' +
                'invalid_user_id（UUID 形式違反。path params の validate ミドルウェアで検出し errorHandler が 400 にマップ） / ' +
                'incomplete_games（3 ゲーム全て完了していない。resultService で throw）',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    examples: {
                        // 共通の apiErrorExamples[INVALID_USER_ID] は games / voice の
                        // 「user_id が DB に存在しない」ケース（message: 'ユーザーIDが存在しません'）に
                        // 合わせてあるが、results では「ユーザー存在しない = 404 user_not_found」のため
                        // 400 invalid_user_id は UUID 形式違反に限定される。共通 example をそのまま
                        // 使うと Swagger UI 閲覧者に誤解を与えるため、ここでは errorHandler の
                        // formatZodErrorMessage が実際に出力する文言（path プレフィックス付き）を inline で与える
                        invalid_user_id: {
                            summary: 'user_id が UUID 形式でない',
                            value: {
                                status: 'error',
                                error: ERROR_CODES.INVALID_USER_ID,
                                message: 'user_id: user_id は UUID 形式で指定してください',
                            },
                        },
                        incomplete_games: {
                            summary: '3 ゲーム未完了で結果取得',
                            value: apiErrorExamples[ERROR_CODES.INCOMPLETE_GAMES],
                        },
                    },
                },
            },
        },
        404: {
            description: '指定された user_id のユーザーが存在しない',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    examples: {
                        user_not_found: {
                            summary: 'ユーザーが見つからない',
                            value: apiErrorExamples[ERROR_CODES.USER_NOT_FOUND],
                        },
                    },
                },
            },
        },
    },
});
