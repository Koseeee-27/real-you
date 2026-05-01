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
 *
 * ## エラーコードの型設計（厳格型 + ハイブリッド型）
 *
 * BE が OpenAPI で縛っている既知コード（9 種類）を `ApiErrorCode` 厳格型として
 * export しつつ、サーバから未知のコードが返ってきても落とさず受け止めるため、
 * `ApiClientError.code` の戻り値型は `ApiErrorCodeOrUnknown | null` にしている。
 *
 * `ApiErrorCodeOrUnknown = ApiErrorCode | (string & {})` の `(string & {})`
 * は TypeScript の小ネタ。通常 `'a' | 'b' | string` は `string` に縮約されて
 * リテラル候補が消えてしまうが、`(string & {})` を挟むと縮約を回避でき、
 * IDE の補完で既知 9 コードを候補として出しつつ、任意 string も許容できる。
 *
 * これにより
 *   - BE が新コードを追加しても FE 側の修正なく `message` を保持できる
 *   - 既存コードの比較（`err.code === 'user_not_found'` 等）で IDE 補完が効く
 * の両立を狙っている。
 */
import type { components } from '@/lib/api/generated';

/**
 * バックエンドが返す共通エラーレスポンス本体の厳格型。
 * OpenAPI 由来の `components['schemas']['ApiError']` を re-export している。
 *
 * 「9 種類の既知コードのみが入る」前提で型付けしたい場面（ドキュメント・分岐の網羅）
 * で使う。サーバから来た生 JSON の保持には使わない（`ApiClientError.body` は
 * `RawApiErrorBody` を使う）。
 */
export type ApiErrorBody = components['schemas']['ApiError'];

/**
 * 業務エラーコードの厳格型（`invalid_request` / `user_not_found` / ...）。
 * `ApiErrorBody['error']` から抽出している。
 */
export type ApiErrorCode = ApiErrorBody['error'];

/**
 * 既知の業務エラーコード + 未知の string も許容するハイブリッド型。
 *
 * `(string & {})` は TypeScript が `'a' | 'b' | string` を `string` に縮約
 * してしまうのを避けるテクニック（無意味な交差型を挟むことで両者を別物として保持
 * させる）。結果として IDE は既知コードを補完候補として出しつつ、未知コードも
 * 代入可能になる。
 *
 * 原理: TypeScript の union は「サブタイプ吸収」が起こり、リテラル型 `'a'` は
 * `string` のサブタイプなので `'a' | string` は `string` に潰れて補完候補が消える。
 * `(string & {})` は意味的には `string` と等価だが TypeScript の型システム上は
 * 別オブジェクトとして扱われるため、吸収を回避できる。
 *
 * BE が OpenAPI に新コードを追加しても FE 側で取り落とさないようにするため、
 * `ApiClientError.code` の戻り値型はこちらを使う。
 */
export type ApiErrorCodeOrUnknown = ApiErrorCode | (string & {});

/**
 * `ApiClientError` が内部に保持するエラーレスポンスの形。
 *
 * 公開型 `ApiErrorBody` と違い、`error` フィールドは `ApiErrorCodeOrUnknown` で
 * 緩めに受ける。サーバが OpenAPI に未記載のコードを返した場合でも message を
 * 失わずに保持し、`console.error` でデバッグに使えるようにするため。
 *
 * 構造的には `ApiErrorBody` のスーパータイプ（`ApiErrorBody` を代入可能）。
 */
export type RawApiErrorBody = {
  status: 'error';
  error: ApiErrorCodeOrUnknown;
  message: string;
};

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
 * - `body` … サーバから返ってきた `RawApiErrorBody`。JSON パースに失敗した場合は `null`
 * - `code` … `body.error`（業務エラーコード）。body が無ければ `null`
 *
 * `Error` を継承しているため、既存の `err instanceof Error` / `err.message`
 * の読み出しはそのまま機能する。
 */
export class ApiClientError extends Error {
  readonly httpStatus: number;
  readonly body: RawApiErrorBody | null;

  constructor(
    httpStatus: number,
    body: RawApiErrorBody | null,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.httpStatus = httpStatus;
    this.body = body;
  }

  /**
   * 業務エラーコード。body が無い（JSON パース失敗等）場合は `null`。
   *
   * 戻り値型は `ApiErrorCodeOrUnknown | null`。既知 9 コードは IDE 補完で
   * 候補として出るが、サーバから未知コードが来た場合もそのまま透過する。
   */
  get code(): ApiErrorCodeOrUnknown | null {
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

/**
 * 渡された業務エラーコードが「最初からやり直す」べきものかを判定する。
 *
 * `ApiClientError.code` は `ApiErrorCodeOrUnknown | null` 型なので、
 * `RESTART_CODES.includes(err.code)` の形では TypeScript の型チェックで
 * エラーになる。後続の各画面が catch で扱う際に詰まらないよう、
 * `null` も受け取れる薄いラッパーを用意しておく。
 *
 * `RESTART_CODES` の要素型は厳格型 `ApiErrorCode`、`code` は未知コードを含む
 * `ApiErrorCodeOrUnknown` で型の幅が違うため、比較を string 同士に落として
 * 行うために `as readonly string[]` で幅キャストしている。
 * 未知コード（OpenAPI 未記載）が渡された場合は false（リトライ可能扱い）になる。
 */
export function isRestartCode(code: ApiErrorCodeOrUnknown | null): boolean {
  if (code === null) return false;
  return (RESTART_CODES as readonly string[]).includes(code);
}
