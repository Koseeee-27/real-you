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

// ========================================
// ローカル型拡張（feat/result-screen-be が develop にマージされ
// `npm run gen:api-types` が通るまでの暫定定義）
// マージ・再生成後はここを削除して generated.ts の型に差し戻す。
// ========================================

// 診断フィードバック（最大ギャップ軸に基づく見出し・説明・指摘点）
// NOTE: subtitle は feat/result-screen-be で追加されたフィールド
export type DiagnosisFeedback = components['schemas']['DiagnosisFeedback'] & {
  subtitle: string;
};

// ゲームごとの偏差上位指標（top_deviation_metrics の要素型）
export type TopDeviationMetric = {
  label: string;
  user: number;
  average: number;
  deviation: number;
  praise: string;
};

// ゲーム単位の詳細情報（タイトル / feature_scores / metrics）
// NOTE: analysis_comment / top_deviation_metrics は feat/result-screen-be で追加
export type GameDetail = components['schemas']['GameDetail'] & {
  analysis_comment: string[];
  top_deviation_metrics: TopDeviationMetric[];
};

// 診断結果レスポンス（feedback / details を拡張型で上書き）
export type ResultResponse = Omit<
  components['schemas']['ResultResponse'],
  'feedback' | 'details'
> & {
  feedback: DiagnosisFeedback;
  details: GameDetail[];
};

// ========================================
// 派生型（GameDetail から導出）
// ========================================

// 各ゲームの feature_scores / metrics は GameDetail のインライン定義から導出する
export type FeatureScore = GameDetail['feature_scores'][number];
export type Metric = GameDetail['metrics'][number];

// 各ゲーム終了後の行動を日本語テキストで振り返ったサマリー
export type PhaseSummaries = components['schemas']['PhaseSummaries'];
