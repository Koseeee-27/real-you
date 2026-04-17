import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../types';
import { ERROR_CODES, ErrorCode } from '../schemas/errorCodes';

/**
 * Express のエラーハンドラ。
 *
 * 対応するエラー:
 * - ZodError: validate ミドルウェアから来る検証失敗。
 *   path / code から適切な ErrorCode にマッピングして 400 で返す。
 * - { status, code, message } 形式のオブジェクト: service 層で throw される業務エラー。
 *   status / code をそのまま使う。
 * - その他: 500 server_error として返す。
 *
 * どのケースでも Notion 仕様書「API 設計書」の統一エラーフォーマット
 * （`status` / `error` / `message`）で応答する。
 */
export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    console.error('Error:', err);

    if (err instanceof ZodError) {
        const apiError: ApiError = {
            status: 'error',
            error: resolveZodErrorCode(err),
            message: formatZodErrorMessage(err),
        };
        res.status(400).json(apiError);
        return;
    }

    // 既存の { status, code, message } 形式の業務エラー
    const legacy = err as { status?: number; code?: string; message?: string };
    const status = legacy?.status ?? 500;
    const code: string = legacy?.code ?? ERROR_CODES.SERVER_ERROR;
    const message = legacy?.message ?? 'Internal server error';

    const apiError: ApiError = {
        status: 'error',
        error: code,
        message,
    };

    res.status(status).json(apiError);
};

/**
 * ZodError の issue からエラーコードを決定する。
 *
 * - `baseline_answers` 配下のフィールドエラー → `invalid_answers`
 *   （必須キー欠落や A-D 以外の値が該当）
 * - `mbti` フィールドのフォーマット違反 → `invalid_mbti`
 *   （型違反＝未指定は後段で `invalid_request` として扱う）
 * - 上記以外 → `invalid_request`
 */
function resolveZodErrorCode(error: ZodError): ErrorCode {
    const baselineAnswerIssue = error.issues.some(
        (issue) => issue.path.length > 1 && issue.path[0] === 'baseline_answers',
    );
    if (baselineAnswerIssue) return ERROR_CODES.INVALID_ANSWERS;

    const mbtiFormatIssue = error.issues.some(
        (issue) => issue.path[0] === 'mbti' && issue.code !== 'invalid_type',
    );
    if (mbtiFormatIssue) return ERROR_CODES.INVALID_MBTI;

    return ERROR_CODES.INVALID_REQUEST;
}

/**
 * ZodError の issue 配列を人間可読な 1 行メッセージに整形する。
 * 例: `baseline_answers.q1_caution: 回答は A / B / C / D のいずれかで指定してください`
 */
function formatZodErrorMessage(error: ZodError): string {
    return error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
            return `${path}: ${issue.message}`;
        })
        .join('; ');
}
