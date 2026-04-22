import { registry } from '../registry';
import {
    registerRequestSchema,
    registerResponseSchema,
} from '../../schemas/register';
import { apiErrorSchema, ERROR_CODES } from '../../schemas/errorCodes';
import { apiErrorExamples } from '../examples';

/**
 * POST /api/register のパス登録。
 *
 * 設計方針:
 * - ルート登録は各エンドポイント単位でファイルを分ける（スキーマファイルとの 1:1 対応）
 * - レスポンス定義の status code は仕様書「API 設計書」準拠（本エンドポイントは 201 と 400 のみ）
 * - エラーレスポンスは `apiErrorSchema`（PR-1 で components に登録済）を参照し、
 *   `examples` で業務コード別のパターンを提示する
 *
 * 本ファイルは `document.ts` から副作用 import されることで registry に登録される。
 * 直接実行せず、import するだけでよい設計。
 */
registry.registerPath({
    method: 'post',
    path: '/api/register',
    tags: ['Register'],
    summary: 'ユーザー登録',
    description:
        'MBTI 選択 + 基準値アンケート（5 設問）完了時にユーザーを新規登録する。' +
        'mbti は null / 省略で MBTI 診断スキップ扱いになる。',
    request: {
        body: {
            required: true,
            content: {
                'application/json': {
                    schema: registerRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'ユーザー登録成功',
            content: {
                'application/json': {
                    schema: registerResponseSchema,
                },
            },
        },
        400: {
            description:
                'リクエスト不正。主な業務エラーコード: ' +
                'invalid_mbti（MBTI 形式違反）/ invalid_answers（A-D 以外の回答）/ ' +
                'invalid_request（必須フィールド欠落）',
            content: {
                'application/json': {
                    schema: apiErrorSchema,
                    examples: {
                        invalid_mbti: {
                            summary: 'MBTI 形式違反',
                            value: apiErrorExamples[ERROR_CODES.INVALID_MBTI],
                        },
                        invalid_answers: {
                            summary: '回答値違反（A-D 以外）',
                            value: apiErrorExamples[ERROR_CODES.INVALID_ANSWERS],
                        },
                        invalid_request: {
                            summary: '必須フィールド欠落',
                            value: apiErrorExamples[ERROR_CODES.INVALID_REQUEST],
                        },
                    },
                },
            },
        },
    },
});
