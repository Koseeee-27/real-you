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
export const TARGET_SCORE = 150;

/** 上限時間（ms）。到達時に TARGET_SCORE 未達なら失敗。 */
export const TIME_CAP_MS = 75_000;

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
//
// 真実の単一ソースは下の EVENT_ANCHOR_RATIOS（各イベントの「目標スコア比」「上限時間比」）。
// 実値（点 / ms）はそこから TARGET_SCORE / TIME_CAP_MS を掛けて round で算出する。
// これにより TARGET_SCORE / TIME_CAP_MS を変えても全アンカーが自動追従する（DRY）。
//
// 割合は TARGET_SCORE / TIME_CAP_MS 未満かつ順序を保つよう昇順に並べる:
//   rule-change(40% / 33%) < freeze(70% / 53%) < speed-up(85% / 67%) < 100%
//   → 150 / 75s で算出すると 60 点 / 25s, 105 点 / 40s, 128 点 / 50s（目安）
// これにより成功 / 失敗の前に必ずルール変更・機械停止を体験し、
// ruleChangeAdaptMs / panicClickCount の計測値が得られる（性格診断の信頼性確保）。
// 割合はすべて playtest 前提のたたき台。

/** 割り込みイベントの識別子。EVENT_ANCHOR_RATIOS の並び順 = 発火順序（rule-change → freeze → speed-up）。 */
export type SorterEventKey = 'rule-change' | 'freeze' | 'speed-up';

/**
 * 割り込みイベントのアンカー割合（真実の単一ソース）。
 *
 * 各イベントの発火閾値を「目標スコア（TARGET_SCORE）に対する比」「上限時間（TIME_CAP_MS）に対する比」
 * で定義する。実値（点 / ms）はこの比から算出する（EVENT_ANCHORS）。
 * 配列の並び順がそのまま発火順序（ラッチ・順序固定）になるため、scoreRatio / timeRatio とも
 * 昇順かつ 1.0 未満で並べること。
 */
const EVENT_ANCHOR_RATIOS: ReadonlyArray<{
  key: SorterEventKey;
  /** 目標スコア（TARGET_SCORE）に対する発火閾値の比（0–1） */
  scoreRatio: number;
  /** 上限時間（TIME_CAP_MS）に対する時間フォールバックの比（0–1） */
  timeRatio: number;
}> = [
  { key: 'rule-change', scoreRatio: 0.4, timeRatio: 1 / 3 },
  { key: 'freeze', scoreRatio: 0.7, timeRatio: 0.53 },
  { key: 'speed-up', scoreRatio: 0.85, timeRatio: 2 / 3 },
];

/**
 * アンカー割合から算出した実値（スコア閾値 / 時間フォールバック ms）。真実の単一ソースは
 * EVENT_ANCHOR_RATIOS で、TARGET_SCORE / TIME_CAP_MS を変えればここも自動追従する。
 * useSorterGame の発火ロジック（maybeFireEvents）が配列順にラッチ・順序固定で参照する。
 */
export const EVENT_ANCHORS: ReadonlyArray<{
  key: SorterEventKey;
  scoreAnchor: number;
  timeAnchor: number;
}> = EVENT_ANCHOR_RATIOS.map(({ key, scoreRatio, timeRatio }) => ({
  key,
  scoreAnchor: Math.round(TARGET_SCORE * scoreRatio),
  timeAnchor: Math.round(TIME_CAP_MS * timeRatio),
}));

// ========================================
// ルール変更通知 / 機械停止（freeze）のサブシーケンス
// ========================================
// これらは「発火」後に独立した短いタイマーで進める演出シーケンス。ループ本体（スコア / 時間）
// とは別系統。秒数はすべて playtest 前提のたたき台。
//
// 【不変条件】freeze は「スコア 70% / 時間 53%」の早い方で発火するが、最遅でも時間フォールバック
// （freeze の timeAnchor = TIME_CAP_MS × 0.53）で発火する。その後にサブシーケンス
// （予告 FROZEN_WARNING_DURATION_MS + 停止 FROZEN_DURATION_MS + 復旧 RECOVERY_DURATION_MS）が
// 走るため、以下を満たすこと:
//   TIME_CAP_MS × 0.53 + (FROZEN_WARNING + FROZEN + RECOVERY) < TIME_CAP_MS
//   現状: 75s × 0.53 ≒ 40s + (2 + 5 + 2)s = 49s < 75s で OK。
// freeze を遅らせる / TIME_CAP_MS を縮める / サブシーケンスを延ばす調整時はこの不変条件を要確認
// （満たさないと機械停止の途中で時間切れ失敗し、復旧演出やパニッククリック計測が中断される）。

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
