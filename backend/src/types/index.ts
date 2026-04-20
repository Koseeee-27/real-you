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

export type GameType = 1 | 2 | 3;

// games エンドポイントの型は schemas/games.ts に集約済み
export type {
  SubmitGameRequest,
  SubmitGameResponse,
} from '../schemas/games';

// results エンドポイントの型は schemas/results.ts に集約済み
export type {
  DiagnosisFeedback,
  GameBreakdown,
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

export interface ApiError {
  status: "error";
  error: string;
  message: string;
}

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

export interface GameLog {
  id: number;
  user_id: string;
  game_type: number;
  raw_data: any;
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
