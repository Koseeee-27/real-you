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
 * - `mbti` フィールド:
 *   - 形式違反（invalid_format、"XXXX" 等）→ invalid_mbti
 *   - 型違反（invalid_type、数値等）→ invalid_mbti（旧手書き実装互換）
 * - `baseline_answers` 配下のフィールド:
 *   - キー欠落（invalid_type、値が undefined）→ invalid_request
 *   - 値違反（custom、A-D 以外の文字列）→ invalid_answers
 * - その他（ネスト親レベルの必須欠落など）→ invalid_request
 *
 * 共通スキーマ（schemas/common.ts）が issue.code を区別できる形で設計されている
 * ことを前提とする。特に answerOptionSchema は z.string().refine() を使い、
 * 必須欠落と値違反で異なる issue.code を返すようにしている。
 *
 * 既知の妥協（実運用で影響なし）:
 * - baseline_answers 配下に数値等の非文字列が来た場合、z.string() では
 *   「キー欠落（undefined）」と「型違反」を issue.code で区別できず、
 *   両方 invalid_type として扱われる。旧実装では後者を invalid_answers に
 *   振り分けていたため厳密にはリグレッションだが、FE は TypeScript 型で
 *   文字列を強制しており実運用では発生しない（明示的妥協）。
 *
 * エンドポイント（user_id / game_type 等）が増えた場合は、本関数に
 * 対応するマッピング分岐を 1 行ずつ追加する。
 */
function resolveZodErrorCode(error: ZodError): ErrorCode {
    for (const issue of error.issues) {
        const top = issue.path[0];
        const isNested = issue.path.length > 1;

        // mbti フィールドのエラー
        // 形式違反 ("XXXX" 等) と型違反 (数値等) の両方を invalid_mbti に寄せる
        if (top === 'mbti' && (issue.code === 'invalid_format' || issue.code === 'invalid_type')) {
            return ERROR_CODES.INVALID_MBTI;
        }

        // baseline_answers 配下のフィールドエラー
        if (top === 'baseline_answers' && isNested) {
            // invalid_type = キー欠落 (undefined) または非文字列型違反
            // （上述の通り区別不可のため一律 invalid_request に寄せる）
            if (issue.code === 'invalid_type') return ERROR_CODES.INVALID_REQUEST;
            // それ以外（custom など）= A-D 以外の値違反
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
