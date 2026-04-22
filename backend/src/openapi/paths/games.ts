import { registry } from '../registry';
import {
    submitGameRequestSchema,
    submitGameResponseSchema,
} from '../../schemas/games';
import { apiErrorSchema } from '../../schemas/errorCodes';
import { apiErrorExamples } from '../examples';

/**
 * POST /api/games/submit のパス登録。
 *
 * 設計方針:
 * - 仕様書「API 設計書」準拠で 200 / 400 / 404 / 409 を定義する
 * - 404 は仕様書では「user_id の存在確認 → 存在しない → 400」として扱われるが、
 *   実装側（gameService.submitGame / userRepository.exists）の整理で今後 404 になりうる
 *   フロー（ユーザー削除後の送信等）を見越して 404 も登録する
 *   → 現状の実装（2026-04-22 時点）では 400 `invalid_user_id` を返すため、
 *     404 の example も `user_not_found` を明示する
 */
registry.registerPath({
    method: 'post',
    path: '/api/games/submit',
    tags: ['Games'],
    summary: 'ゲームプレイデータ送信',
    description:
        '各ゲーム（1: 利用規約 / 2: AI チャット / 3: グループチャット）の終了時に行動データを送信する。' +
        '同一ユーザー × 同一 game_type の重複送信は 409 `duplicate_submission` を返す。',
    request: {
        body: {
            required: true,
            content: {
                'application/json': {
                    schema: submitGameRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'ゲームデータ保存成功',
            content: {
                'application/json': {
                    schema: submitGameResponseSchema,
                },
            },
        },
        400: {
            description:
                'リクエスト不正。主な業務エラーコード: ' +
                'invalid_request（必須フィールド欠落 / data が空）/ ' +
                'invalid_user_id（user_id が存在しない）/ ' +
                'invalid_game_type（game_type が 1-3 の範囲外）',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    examples: {
                        invalidRequest: {
                            summary: '必須フィールド欠落 / data が空',
                            value: apiErrorExamples.invalidRequest,
                        },
                        invalidUserId: {
                            summary: 'user_id が存在しない',
                            value: apiErrorExamples.invalidUserId,
                        },
                        invalidGameType: {
                            summary: 'game_type 範囲外',
                            value: apiErrorExamples.invalidGameType,
                        },
                    },
                },
            },
        },
        404: {
            description: '指定されたユーザーが見つからない',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    example: apiErrorExamples.userNotFound,
                },
            },
        },
        409: {
            description: '同一ユーザー × 同一 game_type の重複送信',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    example: apiErrorExamples.duplicateSubmission,
                },
            },
        },
    },
});
