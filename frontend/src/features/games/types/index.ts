// OpenAPI から自動生成された型を再エクスポートする。
// 手書き定義は廃止済み。スキーマ変更は backend/src/openapi/ を更新したうえで
// `npm run gen:openapi:fe` で frontend/src/lib/api/generated.ts を再生成する。

import type { components } from '@/lib/api/generated';

// ========================================
// Game 共通型
// ========================================
export type SubmitGameRequest = components['schemas']['SubmitGameRequest'];
export type SubmitGameResponse = components['schemas']['SubmitGameResponse'];

// ========================================
// Game 1: 利用規約ゲーム
// ========================================
export type ScrollEvent = components['schemas']['ScrollEvent'];
export type CheckboxState = components['schemas']['CheckboxState'];
export type PopupStats = components['schemas']['PopupStats'];
export type Game1Data = components['schemas']['Game1Data'];

// ========================================
// Game 2: カスタマーサポートチャット
// ========================================
export type Game2Turn = components['schemas']['Game2Turn'];
export type Game2TextInputMetrics =
  components['schemas']['Game2TextInputMetrics'];
export type Game2Data = components['schemas']['Game2Data'];
export type VoiceRespondRequest = components['schemas']['VoiceRespondRequest'];
export type VoiceRespondResponse =
  components['schemas']['VoiceRespondResponse'];

// ========================================
// Game 3: グループチャット（空気読み）
// ========================================
export type Game3Stage = components['schemas']['Game3Stage'];
export type Game3Data = components['schemas']['Game3Data'];
