import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../types';
import { ERROR_CODES, ErrorCode } from '../schemas/errorCodes';

/**
 * Express のエラーハンドラ。
 *
 * 対応するエラー:
 * - ZodError: validate ミドルウェアから来る検証失敗。
 *   path / code から API 設計書のエラーコードへマッピングして 400 で返す
 *   （resolveZodErrorCode 参照）。
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
 * ZodError の issue から API 設計書のエラーコードを決定する。
 *
 * 判定ルール（仕様書 notion-docs/api-design.md のエラーコード表に準拠）:
 * - `mbti` フィールドの形式違反（invalid_format）→ invalid_mbti
 * - `baseline_answers` 配下のフィールド:
 *   - キー欠落（invalid_type）→ invalid_request
 *   - 値違反（custom, A-D 以外）→ invalid_answers
 * - その他（ネスト親レベルの必須欠落など）→ invalid_request
 *
 * 共通スキーマ（schemas/common.ts）が issue.code を区別できる形で設計されている
 * ことを前提とする。特に answerOptionSchema は z.string().refine() を使い、
 * 必須欠落と値違反で異なる issue.code を返すようにしている。
 *
 * エンドポイント（user_id / game_type 等）が増えた場合は、本関数に
 * 対応するマッピング分岐を 1 行ずつ追加する。
 */
function resolveZodErrorCode(error: ZodError): ErrorCode {
    for (const issue of error.issues) {
        const top = issue.path[0];
        const isNested = issue.path.length > 1;

        // mbti フィールドの形式違反
        if (top === 'mbti' && issue.code === 'invalid_format') {
            return ERROR_CODES.INVALID_MBTI;
        }

        // baseline_answers 配下のフィールドエラー
        if (top === 'baseline_answers' && isNested) {
            // invalid_type = キー欠落（値が undefined で z.string() が弾いた）
            if (issue.code === 'invalid_type') return ERROR_CODES.INVALID_REQUEST;
            // それ以外（custom など）= 値違反
            return ERROR_CODES.INVALID_ANSWERS;
        }
    }
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
