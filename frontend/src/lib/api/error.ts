/**
 * API 通信用の共通エラークラスと関連定数。
 *
 * バックエンドの共通エラーレスポンス（`{ status: "error", error, message }`）を
 * FE 側で扱いやすくするためのラッパー。
 *
 * - `ApiClientError` … fetch のレスポンスが `!res.ok` のときに throw する
 * - `RESTART_CODES` … 「最初からやり直してください」を出すべき業務エラーコード
 * - `MAX_RETRY_COUNT` … 通信エラー時のリトライ上限回数
 *
 * 既存の各画面は `err instanceof Error` で `err.message` を読み続けるだけで
 * 動き続ける（`ApiClientError` は Error を継承しているため）。
 */
import type { components } from '@/lib/api/generated';

/**
 * バックエンドが返す共通エラーレスポンス本体の型。
 * OpenAPI 由来の `components['schemas']['ApiError']` を re-export している。
 */
export type ApiErrorBody = components['schemas']['ApiError'];

/**
 * 業務エラーコードの型（`invalid_request` / `user_not_found` / ...）。
 * `ApiErrorBody['error']` から抽出している。
 */
export type ApiErrorCode = ApiErrorBody['error'];

/**
 * 「リトライしても回復しない」業務エラーコードの一覧。
 * これらが返ってきた場合は ErrorScreen の `variant: 'restart'` を出して
 * トップ画面からのやり直しを促す。
 */
export const RESTART_CODES: readonly ApiErrorCode[] = [
  'user_not_found',
  'invalid_user_id',
  'incomplete_games',
] as const;

/**
 * 通信エラー時のリトライ上限回数。
 * 後続の画面適用 Issue で各画面の retry ロジックから参照する。
 */
export const MAX_RETRY_COUNT = 3;

/**
 * API 通信失敗時に throw される共通エラー。
 *
 * - `httpStatus` … fetch のレスポンスステータス（400 / 404 / 500 等）
 * - `body` … サーバから返ってきた `ApiErrorBody`。JSON パースに失敗した場合は `null`
 * - `code` … `body.error`（業務エラーコード）。body が無ければ `null`
 *
 * `Error` を継承しているため、既存の `err instanceof Error` / `err.message`
 * の読み出しはそのまま機能する。
 */
export class ApiClientError extends Error {
  readonly httpStatus: number;
  readonly body: ApiErrorBody | null;

  constructor(httpStatus: number, body: ApiErrorBody | null, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.httpStatus = httpStatus;
    this.body = body;
  }

  /**
   * 業務エラーコード。body が無い（JSON パース失敗等）場合は `null`。
   */
  get code(): ApiErrorCode | null {
    return this.body?.error ?? null;
  }
}

/**
 * `ApiClientError` 判定用の型ガード。
 * 既存の汎用 `Error` ハンドリングと使い分けるときに使う。
 */
export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError;
}
