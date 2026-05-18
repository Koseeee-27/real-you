/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）の定数定義。
 *
 * 最低限プレイ可能な範囲で以下を簡略化している:
 *   - 仕様の「コンベア速度: 開始 ×1.0 → 残り 25 秒未満から 4 秒ごとに +0.25、上限 ×3.0」を
 *     「最後の 10 秒で ×2.0」の 2 段階に簡略化（後追いブラッシュアップで戻す想定）
 *   - 凍結（機械停止）の動的タイミング調整を省略（固定タイミングで発動）
 *   - 採点ロジックを動的減点式 `max(5, 20 - floor(hesitation_ms / 400))` から
 *     固定値 +10/-5/-3 に簡略化（仕様書側も実装に合わせて更新済み）
 *
 * 主要なタイミング: 残り 35s でルール変更、残り 18〜12s で凍結。
 */

import type { PackageType } from '@/features/games/types';

// ========================================
// ゲーム全体のタイミング
// ========================================

/** ゲーム本編の制限時間（ms）。カウントダウン終了後から計測 */
export const GAME_DURATION_MS = 50_000;

/**
 * ゲーム本編の制限時間（秒）。
 * オンボーディングなど UI のコピー表示で参照する。GAME_DURATION_MS から派生。
 */
export const GAME_DURATION_SEC = GAME_DURATION_MS / 1000;

/** 荷物のスポーン間隔（ms） */
export const SPAWN_INTERVAL_MS = 2_000;

/** タイマー残り時間の表示更新間隔（ms） */
export const TIMER_TICK_MS = 100;

// ========================================
// オンボーディング
// ========================================

/**
 * 開始前オンボーディングのスライド枚数。
 * OnboardingSlides の進捗ドット表示と、SorterGameFlow / useSorterGame の
 * スライド index 上限制御で共有する真実の単一ソース。
 */
export const ONBOARDING_SLIDE_COUNT = 4;

// ========================================
// Phase 別 duration（ゲーム本編 50s 内で setTimeout チェーン進行）
// ========================================
// onboarding phase はユーザー操作で進むため duration を持たない
//
// 累積時間（カウントダウン除く）:
//   0s   - 15s : normal
//   15s  - 18s : rule-change-notice    （= 仕様の「残り 35s でルール変更」）
//   18s  - 32s : rule-changed-1
//   32s  - 34s : frozen-warning        （= 仕様の「残り 18〜12s で凍結」域内）
//   34s  - 39s : frozen                 （5s に延長、視認性とゲーム性のため）
//   39s  - 40s : recovery
//   40s  - 50s : rule-changed-2         （速度 2 倍、凍結延長分を rule-changed-2 から削減）
//   50s  -     : ended

export const COUNTDOWN_DURATION_MS = 3_500;
export const NORMAL_DURATION_MS = 15_000;
export const RULE_CHANGE_NOTICE_DURATION_MS = 3_000;
export const RULE_CHANGED_1_DURATION_MS = 14_000;
export const FROZEN_WARNING_DURATION_MS = 2_000;
export const FROZEN_DURATION_MS = 5_000;
export const RECOVERY_DURATION_MS = 1_000;
export const RULE_CHANGED_2_DURATION_MS = 10_000;

// ========================================
// 荷物のアニメーション duration（U 字経路 1 周）
// ========================================

/** 荷物が U 字経路を 1 周する時間（ms、通常速度）*/
export const PACKAGE_FLOW_DURATION_MS = 20_000;

/**
 * 速度 2 倍時の倍率。
 * rule-changed-2 phase（凍結関連が完了した後の残り 10s）で適用する。
 * 凍結中の操作不能と 2 倍速の高難度を重ねないよう、必ず recovery 後に発動する。
 */
export const SPEED_UP_MULTIPLIER = 2;

/** 速度 2 倍時の荷物が U 字経路を 1 周する時間（ms）*/
export const PACKAGE_FLOW_DURATION_SPEED_UP_MS =
  PACKAGE_FLOW_DURATION_MS / SPEED_UP_MULTIPLIER;

// ========================================
// ベルトコンベア表示
// ========================================

/** ベルトコンベア全体の高さ（px） */
export const BELT_HEIGHT_PX = 380;
/** 上下それぞれの lane の高さ（px） */
export const BELT_LANE_HEIGHT_PX = 130;
/** U 字の折り返し部分の幅（px） */
export const BELT_TURN_WIDTH_PX = 80;

/** ベルトのシマシマパターン 1 周分（秒、通常速度）。荷物アニメと別系統 */
export const BELT_FLOW_DURATION_SEC = 1.2;

// ========================================
// スコア計算（プレイ画面の表示用、5 軸スコアには使わない）
// ========================================
// 仕様書（game-design.md）に合わせて固定値 +10 / -5 / -3 に簡略化。
// 5 軸スコアは backend 側で `events` / `wrongPatterns` / `averageHesitationMs` 等から
// 別途算出するため、表示用の挙動を変えても問題ない。

/** 正解時の加点（固定） */
export const SCORE_CORRECT = 10;

/** 誤仕分け時のペナルティ（固定） */
export const SCORE_WRONG_PENALTY = 5;

/** 流出（画面外に流れた）時のペナルティ（固定） */
export const SCORE_OUTFLOW_PENALTY = 3;

// ========================================
// 荷物・仕分け先の表示属性
// ========================================

/** カテゴリ別のテーマカラー（neo-brutalism × ポップ） */
export const PACKAGE_COLORS = {
  urgent: '#e03131',
  fragile: '#2d5be3',
  heavy: '#c08552',
} as const satisfies Record<PackageType, string>;

/** UI 全体で使う共通カラー（neo-brutalism スタイル） */
export const SORTER_UI_COLORS = {
  /** 強調・正解（緑） */
  success: '#57d071',
  /** 警告・失敗（赤）。PACKAGE_COLORS.urgent と意図的に同色 */
  danger: '#e03131',
  /** アクセント（紫）。タイトルやスコアラベルに使う */
  accent: '#6b4ee6',
  /** 注意喚起（黄）。ルール変更中バナー等 */
  warning: '#f1cf44',
  /** ヘッダー文字色（青）。次へボタン等 */
  link: '#2d5be3',
  /** プレイ画面の背景色（緑、bg-page-pattern とは意図的に別色） */
  pageBg: '#b8e687',
  /** 採点ルール「正解」バッジの薄背景（success の alpha 0.2） */
  successBgSubtle: 'rgba(87, 208, 113, 0.2)',
  /** 採点ルール「正解」バッジの濃文字色（success のダーク版） */
  successText: '#2a8a3d',
  /** 採点ルール「誤仕分け」バッジの薄背景（danger の alpha 0.2） */
  dangerBgSubtle: 'rgba(224, 49, 49, 0.2)',
  /** 採点ルール「誤仕分け」バッジの濃文字色（danger のダーク版） */
  dangerText: '#a52828',
} as const;

/** 荷物種別 → 日本語表示ラベル */
export const PACKAGE_LABELS = {
  urgent: '特急',
  fragile: '取扱注意',
  heavy: '重量物',
} as const satisfies Record<PackageType, string>;

/**
 * 荷物種別の配列（ランダム生成時に Object.keys の順序に依存しないよう明示）。
 */
export const PACKAGE_TYPES: readonly PackageType[] = [
  'urgent',
  'fragile',
  'heavy',
];

// ========================================
// 画像アセットのパス（real-you/frontend/public/images/ 配下）
// ========================================

/** 荷物（閉じた段ボール）画像 */
export const PACKAGE_IMAGE_PATHS = {
  urgent: '/images/sorter-game-package-urgent.png',
  fragile: '/images/sorter-game-package-fragile.png',
  heavy: '/images/sorter-game-package-heavy.png',
} as const satisfies Record<PackageType, string>;

/** 仕分け先（開いた段ボール）画像 */
export const BIN_IMAGE_PATHS = {
  urgent: '/images/sorter-game-bin-urgent.png',
  fragile: '/images/sorter-game-bin-fragile.png',
  heavy: '/images/sorter-game-bin-heavy.png',
} as const satisfies Record<PackageType, string>;

// ========================================
// ルール変更（残り 35s で発動、固定）
// ========================================

/**
 * ルール変更後の正解 bin マップ。
 * 仕様: 「特急は今後重量物の振り分け先へ」（固定、ランダム化しない）。
 *
 * 通常時の正解は「荷物の type と同じ type の bin」、
 * ルール変更後は urgent の荷物だけ heavy bin が正解になる。
 */
export const RULE_CHANGED_CORRECT_BIN = {
  urgent: 'heavy',
  fragile: 'fragile',
  heavy: 'heavy',
} as const satisfies Record<PackageType, PackageType>;

// ========================================
// 音声
// ========================================

/**
 * BGM / SE のパス。
 *
 * - `bgm` … 仕分けゲーム専用 BGM。**現状は未確定**（後追いで決定予定）のため、
 *           空文字列にしておくと SorterGameFlow 側で `new Audio()` を生成せず、
 *           コンソールに 404 ノイズが出ない。差し替え時はファイル名を入れ直すだけ。
 */
export const SORTER_AUDIO_PATHS = {
  bgm: '',
  generalSE: '/sounds/general-button-se.mp3',
} as const;
