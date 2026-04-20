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
    // ZodError（入力検証失敗）は 400 系の想定挙動なので warn、それ以外は error で記録する
    if (err instanceof ZodError) {
        console.warn('Validation failed:', err.issues);

        const apiError: ApiError = {
            status: 'error',
            error: resolveZodErrorCode(err),
            message: formatZodErrorMessage(err),
        };
        res.status(400).json(apiError);
        return;
    }

    console.error('Error:', err);

    // service 層で投げる業務エラーは { status, code, message } 形式。
    // status と code の両方が揃っているときだけ業務エラーとして扱い、
    // それ以外（Error インスタンスや未知オブジェクト）は 500 server_error 固定で返す。
    // message をそのまま返してしまうと DB 由来のエラー文などの内部情報が漏れうるため。
    if (isBusinessError(err)) {
        const apiError: ApiError = {
            status: 'error',
            error: err.code,
            message: err.message ?? 'Internal server error',
        };
        res.status(err.status).json(apiError);
        return;
    }

    const apiError: ApiError = {
        status: 'error',
        error: ERROR_CODES.SERVER_ERROR,
        message: 'Internal server error',
    };
    res.status(500).json(apiError);
};

/**
 * service 層が throw する業務エラー形式か判定する。
 * `status`（数値）と `code`（文字列）の両方が揃っていることを必須とする。
 */
function isBusinessError(
    err: unknown,
): err is { status: number; code: string; message?: string } {
    if (typeof err !== 'object' || err === null) return false;
    const e = err as { status?: unknown; code?: unknown };
    return typeof e.status === 'number' && typeof e.code === 'string';
}

/**
 * ZodError の issue からエラーコードを決定する。
 *
 * - `baseline_answers` 配下のフィールドエラー → `invalid_answers`
 *   （必須キー欠落や A-D 以外の値が該当）
 * - `mbti` フィールドのフォーマット違反 → `invalid_mbti`
 *   （型違反＝未指定は後段で `invalid_request` として扱う）
 * - 上記以外 → `invalid_request`
 *
 * 注: 現状は register endpoint 向けのヒューリスティックなマッピング。
 * 他 endpoint の validate 差し込みが進んだ段階で、スキーマ側にエラーコードの
 * メタ情報を持たせる設計（例: .refine の params で errorCode を宣言）への
 * 移行を検討する（Issue #6 の PR 6「仕上げ」で再評価）。
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
