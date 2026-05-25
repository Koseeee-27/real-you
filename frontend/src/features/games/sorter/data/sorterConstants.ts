/**
 * 荷物仕分けゲーム（sorter_game / game_type=4）の定数定義。
 *
 * 進行モデル（meta: #121 改修後）:
 *   - 終了条件は「目標スコア TARGET_SCORE 到達で成功 / 上限 TIME_CAP_MS で未達なら失敗」。
 *     固定時間チェーンではなく、スコア到達 / 時間切れの 2 系統で進行・終了する。
 *   - 割り込みイベント（ルール変更 / 機械停止 / 速度上昇）は「スコア閾値」を主トリガー、
 *     「経過時間」を保険として、**早い方で 1 回だけ発火（ラッチ）・順序固定**。
 *     アンカー（スコア / 時間）はいずれも `*_SCORE` / `*_TIME_MS` 定数で一元管理する。
 *   - 採点は固定値 +SCORE_CORRECT / -SCORE_WRONG_PENALTY、流出は ±0（失点なし）、下限 0。
 *
 * 数値はすべて playtest 前提のたたき台（仕様書も「FE 実装段階で微調整可」と明記）。
 * freeze のサブシーケンス（予告 → 停止 → 復旧）の各秒数はループとは独立した短いタイマーで進める。
 */

import type { PackageType } from '@/features/games/types';

// ========================================
// 勝敗条件
// ========================================

/** 目標スコア。到達で成功（クリア）。 */
export const TARGET_SCORE = 100;

/** 上限時間（ms）。到達時に TARGET_SCORE 未達なら失敗。 */
export const TIME_CAP_MS = 60_000;

/**
 * 上限時間（秒）。
 * オンボーディングなど UI のコピー表示で参照する。TIME_CAP_MS から派生。
 */
export const TIME_CAP_SEC = TIME_CAP_MS / 1000;

// ========================================
// ゲーム全体のタイミング
// ========================================

/** 荷物のスポーン間隔（ms） */
export const SPAWN_INTERVAL_MS = 2_000;

/** 経過時間タイマーの更新間隔（ms）。HUD の上限タイマー表示とイベントの時間フォールバック判定に使う */
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
// カウントダウン
// ========================================

/** カウントダウン（3 → 2 → 1 → START）の総時間（ms） */
export const COUNTDOWN_DURATION_MS = 3_500;

// ========================================
// 割り込みイベントのアンカー（スコア主トリガー + 時間フォールバック）
// ========================================
// 「スコア閾値」を主トリガー、「経過時間」を保険とし、**早い方で 1 回だけ発火（ラッチ）・順序固定**。
// アンカーは TARGET_SCORE（100）未満かつ順序を保つよう並べる:
//   rule-change(40) < freeze(70) < speed-up(85) < TARGET_SCORE(100)
//   rule-change(25s) < freeze(40s) < speed-up(50s) < TIME_CAP_MS(60s)
// これにより成功 / 失敗の前に必ずルール変更・機械停止を体験し、
// ruleChangeAdaptMs / panicClickCount の計測値が得られる（性格診断の信頼性確保）。
// 数値はすべて playtest 前提のたたき台。

/** ルール変更の発火スコア閾値 */
export const RULE_CHANGE_SCORE = 40;
/** ルール変更の時間フォールバック（ms） */
export const RULE_CHANGE_TIME_MS = 25_000;

/** 機械停止（freeze）の発火スコア閾値 */
export const FREEZE_SCORE = 70;
/** 機械停止の時間フォールバック（ms） */
export const FREEZE_TIME_MS = 40_000;

/** 速度上昇の発火スコア閾値 */
export const SPEED_UP_SCORE = 85;
/** 速度上昇の時間フォールバック（ms） */
export const SPEED_UP_TIME_MS = 50_000;

// ========================================
// ルール変更通知 / 機械停止（freeze）のサブシーケンス
// ========================================
// これらは「発火」後に独立した短いタイマーで進める演出シーケンス。ループ本体（スコア / 時間）
// とは別系統。秒数はすべて playtest 前提のたたき台。

/** ルール変更通知バナーの表示時間（ms）。表示後に自動で消える（プレイは阻害しない） */
export const RULE_CHANGE_NOTICE_DURATION_MS = 3_000;

/** 機械停止: 予告（赤バナー shake、まだ操作可）の時間（ms） */
export const FROZEN_WARNING_DURATION_MS = 2_000;
/** 機械停止: 停止（クリック無効化 + panicClick 計測、ベルト・荷物は流れ続ける）の時間（ms） */
export const FROZEN_DURATION_MS = 5_000;
/** 機械停止: 復旧（✓ 復旧バナー表示）の時間（ms） */
export const RECOVERY_DURATION_MS = 2_000;

/** 速度上昇予告バナーの表示時間（ms） */
export const SPEED_UP_BANNER_DURATION_MS = 3_000;

// ========================================
// 荷物のアニメーション duration（U 字経路 1 周）
// ========================================

/** 荷物が U 字経路を 1 周する時間（ms、通常速度）*/
export const PACKAGE_FLOW_DURATION_MS = 20_000;

/**
 * 速度上昇時の倍率。
 * 速度上昇イベント発火後、ゲーム終了まで適用する。アンカー（SPEED_UP_SCORE=85 / 50s）が
 * freeze より後なので、機械停止の操作不能と速度上昇の高難度が重ならない順序を保つ。
 */
export const SPEED_UP_MULTIPLIER = 2;

/** 速度 2 倍時の荷物が U 字経路を 1 周する時間（ms）*/
export const PACKAGE_FLOW_DURATION_SPEED_UP_MS =
  PACKAGE_FLOW_DURATION_MS / SPEED_UP_MULTIPLIER;

// ========================================
// ベルトコンベア表示
// ========================================

/**
 * ベルトコンベア全体の高さ（px）。
 * 中央ギャップ（上下 lane の隙間）= BELT_HEIGHT_PX − BELT_LANE_HEIGHT_PX × 2。
 * lane の高さを変える場合は、中央ギャップが破綻しないようこの値も合わせて調整する。
 */
export const BELT_HEIGHT_PX = 420;
/**
 * 上下それぞれの lane の高さ（px）。
 * 荷物の当たり判定（PackageItem.tsx の PACKAGE_HIT_SIZE_PX
 * = PACKAGE_IMAGE_SIZE_PX + PACKAGE_HIT_PADDING_PX × 2）が
 * この高さに収まる必要がある（PACKAGE_HIT_SIZE_PX ≤ BELT_LANE_HEIGHT_PX）。
 * 荷物サイズを変える場合はこの制約を満たすこと。
 */
export const BELT_LANE_HEIGHT_PX = 150;
/** U 字の折り返し部分の幅（px） */
export const BELT_TURN_WIDTH_PX = 80;

/** ベルトのシマシマパターン 1 周分（秒、通常速度）。荷物アニメと別系統 */
export const BELT_FLOW_DURATION_SEC = 1.2;

// ========================================
// スコア計算（勝敗判定 + プレイ画面の表示用、5 軸スコアには使わない）
// ========================================
// 仕様書（game-design.md）に合わせて固定値 +10 / -5、流出は ±0（失点なし）。
// このスコアが勝敗の判定値（TARGET_SCORE 到達で成功 / TIME_CAP_MS で未達なら失敗）。
// 5 軸スコアは backend 側で `events` / `wrongPatterns` / `averageHesitationMs` 等から
// 別途算出するため、表示用の挙動を変えても問題ない。

/** 正解時の加点（固定） */
export const SCORE_CORRECT = 10;

/** 誤仕分け時のペナルティ（固定） */
export const SCORE_WRONG_PENALTY = 5;

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
// ルール変更（RULE_CHANGE_SCORE / RULE_CHANGE_TIME_MS の早い方で発火、固定）
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
