// 値ではなく型のみ参照する import は通常の `export type { ... } from ...` では
// このファイル内のスコープには値が入らない（再エクスポート専用）ため、`GameLog`
// の型注釈用に別途明示的に import する。
import type { GameId } from '../schemas/results';

// ========================================
// API Request/Response型
// ========================================

// BaselineScores は schemas/common.ts の baselineScoresSchema から導出した型を再エクスポート
export type { BaselineScores } from '../schemas/common';

// AnswerOption は zod の answerOptionSchema から導出した型を再エクスポート
export type { AnswerOption } from '../schemas/common';

// register エンドポイントの型は schemas/register.ts に集約済み
export type {
  BaselineAnswers,
  RegisterRequest,
  RegisterResponse,
} from '../schemas/register';

// games エンドポイントの型は schemas/games.ts に集約済み
// GameType は gameTypeSchema（= GAME_TYPES の z.literal 展開）からの導出型を再エクスポート
export type {
  GameType,
  SubmitGameRequest,
  SubmitGameResponse,
} from '../schemas/games';

// results エンドポイントの型は schemas/results.ts に集約済み
// GameId は schemas/results.ts の gameIdSchema からの導出型を再エクスポート
// （`analysis/registry.ts` の GAME_MODULES のキーとも一致）。
export type {
  Details,
  DiagnosisFeedback,
  GameBreakdown,
  GameDetail,
  GameId,
  PhaseSummaries,
  ResultResponse,
} from '../schemas/results';

// voice エンドポイントの型は schemas/voice.ts に集約済み
export type {
  ConversationMessage,
  VoiceEmotion,
  VoiceRespondRequest,
  VoiceRespondResponse,
} from '../schemas/voice';

// ApiError は schemas/errorCodes.ts の apiErrorSchema から導出した型を再エクスポート
export type { ApiError } from '../schemas/errorCodes';

// ========================================
// DB型定義
// ========================================

export interface User {
  id: string;
  self_mbti: string | null;
  baseline_caution: number;
  baseline_calmness: number;
  baseline_logic: number;
  baseline_coop: number;
  baseline_positive: number;
  created_at: string;
}

// GameLog はドメイン層（services / analysis）で参照される型のため、Issue #101 の
// Anti-Corruption Layer 設計に従い文字列 ID（`game_id: GameId`）で扱う。
// DB の game_logs テーブル自体は `game_type INT` のままで、
// `repositories/gameRepository.ts` が SELECT/INSERT 時に GAME_TYPE_TO_ID / ID_TO_GAME_TYPE で
// 双方向変換する責務を持つ。
export interface GameLog {
  id: number;
  user_id: string;
  game_id: GameId;
  // raw_data は JSONB カラム。型は Game1Data / Game2Data / Game3Data のいずれかで、
  // game_id に応じて分かれるが、DB 読み出し時点では構造の整合性は未検証のため `unknown` とする。
  // service 境界（resultService）で zod スキーマ（schemas/gameData.ts）により parse する。
  raw_data: unknown;
  played_at: string;
}

// ========================================
// Enum
// ========================================

export const GAME_TYPES = {
  TERMS_GAME: 1,
  AI_CHAT: 2,
  GROUP_CHAT: 3,
} as const;

export const SCORE_KEYS = {
  CAUTION: 'caution',
  CALMNESS: 'calmness',
  LOGIC: 'logic',
  COOPERATIVENESS: 'cooperativeness',
  POSITIVITY: 'positivity',
} as const;

export type ScoreKey = typeof SCORE_KEYS[keyof typeof SCORE_KEYS];
