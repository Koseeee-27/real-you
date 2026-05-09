// OpenAPI から自動生成された型を再エクスポートする。
// 手書き定義は廃止済み。スキーマ変更は backend/src/schemas/ の zod 定義を更新したうえで
// `npm run gen:api-types` で frontend/src/lib/api/generated.ts を再生成する。
// （新規エンドポイント追加時は backend/src/openapi/paths/ への登録も必要）

import type { components } from '@/lib/api/generated';

// ========================================
// Game 共通型
// ========================================
export type SubmitGameRequest = components['schemas']['SubmitGameRequest'];
export type SubmitGameResponse = components['schemas']['SubmitGameResponse'];

// ========================================
// 利用規約ゲーム（terms_game / 旧 Game 1）
// ========================================
export type ScrollEvent = components['schemas']['ScrollEvent'];
export type CheckboxState = components['schemas']['CheckboxState'];
export type PopupStats = components['schemas']['PopupStats'];
export type TermsGameData = components['schemas']['TermsGameData'];

// ========================================
// AI カスタマーサポート（helpdesk_game / 旧 Game 2）
// ========================================
export type HelpdeskGameTurn = components['schemas']['HelpdeskGameTurn'];
export type HelpdeskGameTextInputMetrics =
  components['schemas']['HelpdeskGameTextInputMetrics'];
export type HelpdeskGameData = components['schemas']['HelpdeskGameData'];
export type VoiceRespondRequest = components['schemas']['VoiceRespondRequest'];
export type VoiceRespondResponse =
  components['schemas']['VoiceRespondResponse'];

// ========================================
// 空気読みグループチャット（group_chat_game / 旧 Game 3）
// ========================================
export type GroupChatGameStage = components['schemas']['GroupChatGameStage'];
export type GroupChatGameData = components['schemas']['GroupChatGameData'];
