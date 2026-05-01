import type {
  SubmitGameRequest,
  SubmitGameResponse,
  VoiceRespondRequest,
  VoiceRespondResponse,
} from '@/features/games/types';
import type { ResultResponse } from '@/features/result/types';
import type { components } from '@/lib/api/generated';
import { ApiClientError, type ApiErrorBody } from '@/lib/api/error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RegisterRequest = components['schemas']['RegisterRequest'];
type RegisterResponse = components['schemas']['RegisterResponse'];

/**
 * fetch のレスポンスが `!res.ok` のときに `ApiClientError` を生成して返す。
 *
 * - サーバが返す JSON が `ApiErrorBody`（`{ status, error, message }`）の形なら
 *   そのまま `body` として保持し、`message` も流用する
 * - JSON パースに失敗した場合（HTML エラーページ・ネットワーク途絶等）は
 *   `body: null` でフォールバックし、`fallbackMessage` を `message` にする
 *
 * 返却直前に `console.error('[ApiClientError]', ...)` を出して開発者の追跡を助ける。
 * 呼び出し側は `throw await buildApiClientError(res, '...')` の形で投げる。
 */
async function buildApiClientError(
  res: Response,
  fallbackMessage: string
): Promise<ApiClientError> {
  // `!res.ok` の場合のみ呼ばれる前提。レスポンスは一度しか read できないため、
  // ここで JSON を読み切ってから ApiClientError を組み立てる。
  const rawBody: unknown = await res.json().catch(() => null);
  const body = isApiErrorBody(rawBody) ? rawBody : null;
  const message = body?.message ?? fallbackMessage;

  console.error('[ApiClientError]', {
    httpStatus: res.status,
    code: body?.error ?? null,
    message,
  });

  return new ApiClientError(res.status, body, message);
}

/**
 * 受け取った値が `ApiErrorBody` の形をしているかをチェックする。
 * サーバ側の OpenAPI で型を縛っているため通常は常に true だが、
 * 想定外の JSON が返ってきたとき（プロキシが差し込んだエラー等）に備えて検証する。
 */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.status === 'error' &&
    typeof v.error === 'string' &&
    typeof v.message === 'string'
  );
}

export async function postRegister(
  body: RegisterRequest
): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await buildApiClientError(res, 'データ送信に失敗しました');
  }

  return res.json();
}

export async function submitGame(
  body: SubmitGameRequest
): Promise<SubmitGameResponse> {
  const res = await fetch(`${API_BASE}/api/games/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await buildApiClientError(res, 'ゲームデータの送信に失敗しました');
  }

  return res.json();
}

// Game 2 サポート担当の返答をAIで生成する。返答内容は演出用で、性格判定のスコア計算には使用しない。
export async function postVoiceRespond(
  body: VoiceRespondRequest
): Promise<VoiceRespondResponse> {
  const res = await fetch(`${API_BASE}/api/voice/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw await buildApiClientError(res, 'AI返答の生成に失敗しました');
  }

  return res.json();
}

export async function getResult(userId: string): Promise<ResultResponse> {
  const res = await fetch(`${API_BASE}/api/results/${userId}`, {
    method: 'GET',
  });

  if (!res.ok) {
    throw await buildApiClientError(res, '結果の取得に失敗しました');
  }

  return res.json();
}
