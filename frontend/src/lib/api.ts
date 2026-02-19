import type { BaselineAnswers } from '@/features/diagnosis/types';
// import type { SubmitGameRequest, SubmitGameResponse } from '@/features/games/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RegisterRequest = {
  mbti: string | null;
  baseline_answers: BaselineAnswers;
};

type RegisterResponse = {
  user_id: string;
  status: 'success';
};

export async function postRegister(
  body: RegisterRequest
): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'データ送信に失敗しました');
  }

  return res.json();
}

// TODO: バックエンド接続時にコメントアウトを解除する
// export async function submitGame(
//   body: SubmitGameRequest
// ): Promise<SubmitGameResponse> {
//   const res = await fetch(`${API_BASE}/api/games/submit`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   });
//
//   if (!res.ok) {
//     const errorData = await res.json().catch(() => null);
//     throw new Error(errorData?.message || 'ゲームデータの送信に失敗しました');
//   }
//
//   return res.json();
// }
