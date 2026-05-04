import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../types";
import { ERROR_CODES, ErrorCode } from "../schemas/errorCodes";

/**
 * CORS による拒否を表す専用エラー。
 *
 * `cors` ミドルウェアの origin コールバックで `new Error(...)` を投げると、
 * Express のエラーハンドラに流れて通常の Error と区別が付かなくなる
 * （メッセージ文字列で判定することになり脆い）。
 * 専用クラスを用意して `instanceof` で判定できるようにすることで、
 * errorHandler 側で 403 系の扱いに振り分ける。
 */
export class CorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorsError";
  }
}

/**
 * Express のエラーハンドラ。
 *
 * 対応するエラー:
 * - ZodError: validate ミドルウェアから来る検証失敗。
 *   path / code から API 設計書のエラーコードへマッピングして 400 で返す
 *   （resolveZodErrorCode 参照）。
 * - CorsError: CORS 許可リスト外のオリジンからのリクエスト。403 で返す。
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
    console.warn("Validation failed:", err.issues);

    const apiError: ApiError = {
      status: "error",
      error: resolveZodErrorCode(err),
      message: formatZodErrorMessage(err),
    };
    res.status(400).json(apiError);
    return;
  }

  // CORS による拒否は設定ミスや許可外オリジンからのアクセスであり、
  // サーバー内部エラー（500）ではなく 403 で返す。
  // ログは warn（業務上想定しうる 4xx 挙動のため error 扱いにしない）。
  // エラーコードは既存の `invalid_request` を流用（仕様書への新規コード追加はスコープ外）。
  // 内部情報（許可リストの中身など）を漏らさないため、クライアントへの message は固定文言にする。
  if (err instanceof CorsError) {
    console.warn("CORS rejected:", err.message);

    const apiError: ApiError = {
      status: "error",
      error: ERROR_CODES.INVALID_REQUEST,
      message: "CORS によりリクエストが拒否されました",
    };
    res.status(403).json(apiError);
    return;
  }

  console.error("Error:", err);

  // service 層で投げる業務エラーは { status, code, message } 形式。
  // status と code の両方が揃っているときだけ業務エラーとして扱い、
  // それ以外（Error インスタンスや未知オブジェクト）は 500 server_error 固定で返す。
  // message をそのまま返してしまうと DB 由来のエラー文などの内部情報が漏れうるため。
  if (isBusinessError(err)) {
    const apiError: ApiError = {
      status: "error",
      error: err.code,
      message: err.message ?? "Internal server error",
    };
    res.status(err.status).json(apiError);
    return;
  }

  const apiError: ApiError = {
    status: "error",
    error: ERROR_CODES.SERVER_ERROR,
    message: "Internal server error",
  };
  res.status(500).json(apiError);
};

/**
 * service 層が throw する業務エラー形式か判定する。
 *
 * `status`（数値）と `code`（ERROR_CODES のいずれか）が揃っていることを必須とする。
 * code を ErrorCode に narrowing することで、ApiError.error（ErrorCode 型）への
 * 代入がキャストなしで通る。
 *
 * code が ERROR_CODES に含まれない値（定義ミス・typo）だった場合は本関数で false を返し、
 * errorHandler 側で 500 server_error に振り分けられる（内部情報の漏洩を防ぐ）。
 */
const ERROR_CODE_VALUES: readonly string[] = Object.values(ERROR_CODES);

function isBusinessError(
  err: unknown,
): err is { status: number; code: ErrorCode; message?: string } {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { status?: unknown; code?: unknown };
  return (
    typeof e.status === "number" &&
    typeof e.code === "string" &&
    ERROR_CODE_VALUES.includes(e.code)
  );
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
 * - `user_id` フィールド:
 *   - 型違反・UUID 形式違反・キー欠落 → invalid_user_id
 *     （mbti パターンと同じく、フィールド単位でエラーコードを寄せる方針。
 *      旧手書き実装の「user_id が存在しない → invalid_user_id」と同じカテゴリ）
 * - `game_type` フィールド:
 *   - 型違反・値違反（invalid_union）・キー欠落 → invalid_game_type
 *     （mbti パターン踏襲）
 * - `data` フィールド（および配下）:
 *   - 型違反・空オブジェクト違反・キー欠落 → invalid_request
 *     （data は構造がゲームごとに異なるためフィールド固有コードを用意しない）
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
 * - user_id / game_type の「キー欠落」は旧実装では invalid_request にしていたが、
 *   フィールド単位で寄せる方針に統一したため invalid_user_id / invalid_game_type
 *   として扱う。FE は TS 型で必須を強制しており実運用では発生しない（明示的妥協）。
 *
 * エンドポイント（results / voice 等）が増えた場合は、本関数に
 * 対応するマッピング分岐を 1 行ずつ追加する。
 *
 * 優先度制御について:
 * 複数 issue が同時に存在する場合（例: mbti と baseline_answers の両方にエラー）、
 * 最初にマッチした issue で即 return するため、結果は zod の issue 順序
 * （スキーマ定義順、今回は mbti → baseline_answers）に従う。
 * 現状のスキーマ定義順で API 設計書上も自然な優先度になっており実害はないが、
 * 将来エンドポイントが増え明示的な優先度制御が必要になった場合は、
 * 全 issue を走査した後に優先度リストで選ぶ方式へリファクタする。
 */
function resolveZodErrorCode(error: ZodError): ErrorCode {
  for (const issue of error.issues) {
    const top = issue.path[0];
    const isNested = issue.path.length > 1;

    // mbti フィールドのエラー
    // 形式違反 ("XXXX" 等) と型違反 (数値等) の両方を invalid_mbti に寄せる
    if (
      top === "mbti" &&
      (issue.code === "invalid_format" || issue.code === "invalid_type")
    ) {
      return ERROR_CODES.INVALID_MBTI;
    }

    // baseline_answers 配下のフィールドエラー
    // 注: baseline_answers 自体の欠落（path が ['baseline_answers'] のみ）は
    // isNested=false のため本分岐には入らず、ループ末尾の fallthrough で
    // INVALID_REQUEST として扱われる（仕様書「必須フィールド欠落」に合致）。
    if (top === "baseline_answers" && isNested) {
      // invalid_type = キー欠落 (undefined) または非文字列型違反
      // （上述の通り区別不可のため一律 invalid_request に寄せる）
      if (issue.code === "invalid_type") return ERROR_CODES.INVALID_REQUEST;
      // それ以外（custom など）= A-D 以外の値違反
      return ERROR_CODES.INVALID_ANSWERS;
    }

    // user_id フィールドのエラー（型違反・UUID 形式違反・キー欠落）
    if (top === "user_id") {
      return ERROR_CODES.INVALID_USER_ID;
    }

    // game_type フィールドのエラー（型違反・値違反・キー欠落）
    // z.union の値違反は issue.code = 'invalid_union' で届く
    if (top === "game_type") {
      return ERROR_CODES.INVALID_GAME_TYPE;
    }

    // data フィールドのエラー（型違反・空オブジェクト違反・ネスト配下）
    // data は構造がゲーム依存のためフィールド固有コードは持たず、
    // すべて invalid_request に寄せる（仕様書「data が空 → 400」に合致）
    if (top === "data") {
      return ERROR_CODES.INVALID_REQUEST;
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
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
