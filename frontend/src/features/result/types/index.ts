// ========================================
// 結果画面で使う API 型
// OpenAPI から自動生成された型を再エクスポートする。
// 手書き定義は廃止済み。スキーマ変更は backend/src/schemas/ の zod 定義を更新したうえで
// `npm run gen:api-types` で frontend/src/lib/api/generated.ts を再生成する。
// （新規エンドポイント追加時は backend/src/openapi/paths/ への登録も必要）
// ========================================

import type { components } from '@/lib/api/generated';

// ゲーム識別子（terms_game / helpdesk_game / sorter_game / group_chat_game）
export type GameId = components['schemas']['GameId'];

// 5 軸スコア（自己申告基準値・実測値・MBTI 理論値で共通利用）
export type DiagnosisScores = components['schemas']['BaselineScores'];

// 5 軸ギャップ（実測 - 自己申告。負値を取りうる）
export type GapScores = components['schemas']['GapScores'];

// 診断フィードバック（見出し・subtitle・説明・指摘点）
export type DiagnosisFeedback = components['schemas']['DiagnosisFeedback'];

// ゲームごとの詳細情報（feature_scores / metrics / analysis_comment / top_deviation_metrics）
export type GameDetail = components['schemas']['GameDetail'];

// 診断結果レスポンス
export type ResultResponse = components['schemas']['ResultResponse'];

// ========================================
// 派生型（GameDetail から導出）
// ========================================

// 各ゲームの feature_scores / metrics は GameDetail のインライン定義から導出する
export type FeatureScore = GameDetail['feature_scores'][number];
export type Metric = GameDetail['metrics'][number];

// top_deviation_metrics の要素型（generated.ts から導出）
export type TopDeviationMetric = GameDetail['top_deviation_metrics'][number];

// 各ゲーム終了後の行動を日本語テキストで振り返ったサマリー
export type PhaseSummaries = components['schemas']['PhaseSummaries'];
