// ========================================
// 結果画面で使う API 型
// OpenAPI から自動生成された型を再エクスポートする。
// 手書き定義は廃止済み。スキーマ変更は backend/src/schemas/ の zod 定義を更新したうえで
// `npm run gen:api-types` で frontend/src/lib/api/generated.ts を再生成する。
// （新規エンドポイント追加時は backend/src/openapi/paths/ への登録も必要）
// ========================================

import type { components } from '@/lib/api/generated';

// 5 軸スコア（自己申告基準値・実測値・MBTI 理論値で共通利用）
export type DiagnosisScores = components['schemas']['BaselineScores'];

// 5 軸ギャップ（実測 - 自己申告。負値を取りうる）
export type GapScores = components['schemas']['GapScores'];

// 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）
export type DiagnosisFeedback = components['schemas']['DiagnosisFeedback'];

// 各ゲーム終了後の行動を日本語テキストで振り返ったサマリー
export type PhaseSummaries = components['schemas']['PhaseSummaries'];

// ゲーム単位の詳細情報（タイトル / feature_scores / metrics）
export type GameDetail = components['schemas']['GameDetail'];

// 各ゲームの feature_scores / metrics は GameDetail のインライン定義から導出する
export type FeatureScore = GameDetail['feature_scores'][number];
export type Metric = GameDetail['metrics'][number];

// 全ゲームの詳細情報（game_1 / game_2 / game_3）
export type Details = components['schemas']['Details'];

// 診断結果レスポンス（GET /api/results/:user_id の 200 OK）
export type ResultResponse = components['schemas']['ResultResponse'];
