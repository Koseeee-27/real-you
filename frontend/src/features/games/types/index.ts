// ========================================
// Game 共通型
// ========================================

export interface SubmitGameRequest {
  user_id: string;
  game_type: 1 | 2 | 3;
  data: Record<string, unknown>;
}

export interface SubmitGameResponse {
  status: 'success' | 'error';
  message: string;
}

// ========================================
// Game 1: 利用規約ゲーム
// ========================================

export interface ScrollEvent {
  position: number;
  timestamp: number;
}

export interface CheckboxState {
  checked: boolean;
  changed: boolean;
}

export interface PopupStats {
  timeToClose: number;
  clickCount: number;
  // ポップアップ表示中のマウス余剰移動距離（px）。総移動距離 − 最短直線距離
  mouseJitter: number;
}

export interface Game1Data {
  totalTime: number;
  finalAction: 'agree' | 'disagree';
  reachedBottom: boolean;
  scrollEvents: ScrollEvent[];
  hiddenInput: string | null;
  checkboxStates: {
    readConfirm: CheckboxState;
    mailMagazine: CheckboxState;
    thirdPartyShare: CheckboxState;
  };
  popupStats: PopupStats;
  // 「同意する」ボタンにホバーしてからクリックするまでの時間（ms）
  agreeButtonHoverTimeMs: number;
}
