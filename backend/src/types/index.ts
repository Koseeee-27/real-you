// ========================================
// API Request/Response型
// ========================================

export interface BaselineScores {
  caution: number; // 0-100
  calmness: number;
  logic: number;
  cooperativeness: number;
  positivity: number;
}

export interface RegisterRequest {
  mbti?: string | null; // オプショナル
  baseline_scores: BaselineScores; // 必須
}

export interface RegisterResponse {
  user_id: string; // UUID
  status: "success";
}

export type GameType = 1 | 2 | 3;

export interface SubmitGameRequest {
  user_id: string;
  game_type: GameType;
  data: Record<string, any>;
}

export interface SubmitGameResponse {
  status: "success" | "error";
  message: string;
}

export interface DiagnosisFeedback {
  title: string;
  description: string;
  gap_point: string;
}

export interface GameBreakdown {
  game_1?: Partial<BaselineScores>;
  game_2?: Partial<BaselineScores>;
  game_3?: Partial<BaselineScores>;
}

export interface ResultResponse {
  user_id: string;
  self_mbti: string | null;
  scores: BaselineScores; // 実測スコア
  baseline_scores: BaselineScores; // 自己申告スコア
  gaps: BaselineScores; // 差分
  game_breakdown: GameBreakdown;
  feedback: DiagnosisFeedback;
}

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
  CAUTION: "caution",
  CALMNESS: "calmness",
  LOGIC: "logic",
  COOPERATIVENESS: "cooperativeness",
  POSITIVITY: "positivity",
} as const;

export type ScoreKey = typeof SCORE_KEYS[keyof typeof SCORE_KEYS];
