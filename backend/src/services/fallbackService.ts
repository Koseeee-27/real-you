/**
 * fallbackService.ts
 * キーワードマッチングのロジックを担当するファイル。
 */

import { FALLBACK_TABLE, DEFAULT_RESPONSES } from './fallbackData';
import { VoiceRespondResponse } from '../schemas/voice';

/**
 * フォールバック返答の型。
 * voice API の外向きレスポンス型（VoiceRespondResponse）と完全一致させ、
 * voiceService 側で型アサーションなしでそのまま返せるようにしている。
 */
export type FallbackResponse = VoiceRespondResponse;

/**
 * メッセージのキーワードをもとにフォールバック返答を返す。
 * 複数キーワードにヒットした場合は最初にマッチしたエントリを使う。
 */
export function getKeywordFallback(message: string): FallbackResponse {
  for (const entry of FALLBACK_TABLE) {
    if (entry.keywords.some(kw => message.includes(kw))) {
      const picked = entry.responses[Math.floor(Math.random() * entry.responses.length)];
      return { ...picked, confidence: 0.3 };
    }
  }
  // どのキーワードにもヒットしなかった場合
  const picked = DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
  return { ...picked, confidence: 0.2 };
}