'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  PACKAGE_LABELS,
  RULE_CHANGE_PAIRS,
  SORTER_UI_COLORS,
  TARGET_SCORE,
  TIME_CAP_MS,
} from '../data/sorterConstants';

/**
 * ルール変更バッジに表示する文言（矢印形式・複数行は ` / ` 結合）。
 * `RULE_CHANGE_PAIRS` から `PACKAGE_LABELS` 経由で派生し、マッピング変更時に
 * 文言を取り残さない。例: 「特急 → 重量物」。
 */
const RULE_CHANGE_LABEL = RULE_CHANGE_PAIRS.map(
  ({ from, to }) => `${PACKAGE_LABELS[from]} → ${PACKAGE_LABELS[to]}`
).join(' / ');

interface SorterHUDProps {
  /** 現在の表示スコア（= 目標スコア進捗の現在値） */
  displayScore: number;
  /** 経過時間（ms）。上限 TIME_CAP_MS に対するタイマー表示に使う */
  elapsedTimeMs: number;
  /** 機械停止中か（最優先で「機械停止中」バッジを表示） */
  isFrozen: boolean;
  /** ルール変更中か（凍結中以外で表示） */
  isRuleChanged: boolean;
  /** 速度上昇中か（凍結中以外で表示） */
  isSpeedUp: boolean;
}

/**
 * 残り時間がこの秒数以下になったら警告色（danger）に切り替える閾値（秒）。
 * 「上限に近づく = 失敗が近い」ことを色で直感的に伝えるための HUD 固有の見せ方の値。
 */
const TIMER_WARNING_THRESHOLD_SEC = 10;

/**
 * 状態バッジ 1 つ分の表示設定。
 * 配列で持つことで「機械停止中だけ単独」「ルール変更 + スピード 2 倍は両立」を
 * if 分岐ではなく宣言的に表現でき、JSX 側を 1 つの map に集約できる（DRY）。
 */
type BadgeConfig = {
  /** AnimatePresence の key（出入りアニメの識別子） */
  key: string;
  /** バッジ本文（装飾アイコンも文字列に含めて対称化する） */
  label: string;
  /**
   * 背景色。SORTER_UI_COLORS のいずれかの値に絞り、定数外の文字列を渡せないようにする。
   * 色の追加時は SORTER_UI_COLORS に追記すれば自動的に許容される。
   */
  bgColor: (typeof SORTER_UI_COLORS)[keyof typeof SORTER_UI_COLORS];
  /** 文字色（背景とのコントラストで指定） */
  textColor: 'black' | 'white';
  /**
   * 継続パルスの最大スケール。1 を超えるほど呼吸が大きく見える。
   * 緊急度が高いほど 1 に近い値で控えめ（停止 < ルール変更 < スピード 2 倍 の順で速さ・幅を上げる）。
   */
  pulseScale: number;
  /** パルス 1 周分の秒数。小さいほど速い呼吸 = 緊急感が強い */
  pulseDuration: number;
  /**
   * バッジテキストのサイズ class。省略時は標準の `text-sm sm:text-base`。
   * 2 バッジ同時表示（ルール変更 + スピード 2 倍）時に中央のタイマー pill と
   * 衝突しないよう、緊急度が低めのバッジには控えめなサイズを個別に与える。
   */
  textSizeClassName?: string;
};

/** バッジのデフォルトのテキストサイズ class。`textSizeClassName` が指定されていない時に使う。 */
const DEFAULT_BADGE_TEXT_SIZE = 'text-sm sm:text-base';

/**
 * 現在の状態フラグから「いま表示すべきバッジ」の配列を組み立てる。
 *
 * - `isFrozen` は最優先で他バッジを抑制する（停止中は他の演出を出さない）
 * - 凍結中でなければ `isRuleChanged` / `isSpeedUp` は両立しうる（両方を並べる）
 *
 * 並び順は「ルール変更 → スピード 2 倍」の順で安定させ、出現順に左から並ぶ。
 */
function buildActiveBadges(flags: {
  isFrozen: boolean;
  isRuleChanged: boolean;
  isSpeedUp: boolean;
}): BadgeConfig[] {
  if (flags.isFrozen) {
    return [
      {
        key: 'frozen',
        // 「機械停止」は固定演出のためアイコンのみハードコード。
        label: '✗ 機械停止中 ✗',
        bgColor: SORTER_UI_COLORS.warning,
        textColor: 'black',
        pulseScale: 1.04,
        pulseDuration: 0.7,
      },
    ];
  }

  const badges: BadgeConfig[] = [];
  if (flags.isRuleChanged) {
    badges.push({
      key: 'rule-change',
      // ルール変更の文言は `RULE_CHANGE_PAIRS` → `PACKAGE_LABELS` から派生（DRY）。
      // `RULE_CHANGED_CORRECT_BIN` を書き換えれば自動で追従する。
      label: `⚠ ルール変更中: ${RULE_CHANGE_LABEL} ⚠`,
      bgColor: SORTER_UI_COLORS.warning,
      textColor: 'black',
      pulseScale: 1.03,
      pulseDuration: 0.9,
    });
  }
  if (flags.isSpeedUp) {
    badges.push({
      key: 'speed-up',
      label: '⚡ スピード 2 倍 ⚡',
      bgColor: SORTER_UI_COLORS.accent,
      textColor: 'white',
      pulseScale: 1.05,
      pulseDuration: 0.5,
      // ルール変更中バッジと並んだ時に中央タイマー pill と衝突しないよう、
      // 控えめなサイズで詰める（速度上昇は緊急度が低めなので情報量よりレイアウト優先）。
      textSizeClassName: 'text-xs sm:text-sm',
    });
  }
  return badges;
}

/**
 * ゲーム画面上部の HUD（Heads-Up Display）。
 *
 * 構造（固定高さ + 絶対配置レイヤー）:
 *   - ルート: `relative h-[88px]` の固定枠。フロー上は常に同じ高さを占有する
 *   - バッジ群: 左 absolute。AnimatePresence で出入り + 継続パルスで強調
 *   - タイマー: 中央 absolute（pill 形、大きな数字のみ）。主役の位置で目立たせる
 *   - SCORE パネル: 右 absolute、独立枠
 *
 * **不変条件**: バッジ数の変化（0 → 1 → 2）が HUD のフロー高さに影響しないこと。
 *   バッジ群と SCORE / タイマーは全て absolute レイヤーに浮かせており、ルートの高さは
 *   常に 88px 固定。これにより呼び出し側（SorterGameFlow）でベルトの開始位置を pt で
 *   固定でき、「バッジ複数表示時にベルトが押し下げられる」事象を構造的に防ぐ。
 *
 * 勝敗の主軸は「目標スコア到達」だが、現在スコアを数値で大きく出すほうが playtest で
 * 分かりやすかったため、SCORE を主役にして目標値を小さく併記する。
 * 上限時間は中央の pill 形タイマーで残り秒数を大きく表示。残り時間の進捗バーは持たず、
 * 残り秒数の数値 + 残り 10 秒以下の色変化 + pulse + 発光で「迫っている」を伝える。
 */
export default function SorterHUD({
  displayScore,
  elapsedTimeMs,
  isFrozen,
  isRuleChanged,
  isSpeedUp,
}: SorterHUDProps) {
  // 残り秒（経過が上限を超えても 0 で止める）。
  const remainingSec = Math.max(
    0,
    Math.ceil((TIME_CAP_MS - elapsedTimeMs) / 1000)
  );
  // 残りわずか → 警告色に切替。
  const isTimerWarning = remainingSec <= TIMER_WARNING_THRESHOLD_SEC;
  const timerColor = isTimerWarning
    ? SORTER_UI_COLORS.danger
    : SORTER_UI_COLORS.accent;

  const activeBadges = buildActiveBadges({
    isFrozen,
    isRuleChanged,
    isSpeedUp,
  });

  return (
    <div className="relative mx-auto h-[88px] w-full max-w-7xl">
      {/*
        === バッジエリア（左 absolute、horizontal 固定で 1 行） ===
        バッジ群は AnimatePresence で出入り。出現時は上からスライドイン + スケールイン、
        表示中は continuous パルスで「いま何かが起きている」ことを伝える。
        flex-nowrap で 2 つ並んでも 1 行を維持し、中央のタイマーと右の SCORE と被らないよう
        左寄せのみ（最大幅は内容依存）。gap は最小限（PC で 4px）にして、ルール変更中バッジと
        スピード 2 倍バッジを詰めて配置し、中央タイマー pill との衝突を可能な限り回避する。
        AnimatePresence の mode は省略（デフォルト 'sync'）。バッジは flex-nowrap 内に並ぶだけで
        layout アニメは不要なので、'popLayout' を指定すると getBoundingClientRect の
        計算オーバーヘッドが乗るだけになる。出入りの fade/slide は各 motion.span の
        initial/animate/exit で完結する。
      */}
      <div className="absolute inset-y-0 left-0 flex flex-nowrap items-center gap-0.5 sm:gap-1">
        <AnimatePresence>
          {activeBadges.map((badge) => (
            <motion.span
              key={badge.key}
              initial={{ opacity: 0, y: -12, scale: 0.85 }}
              animate={{
                opacity: 1,
                y: 0,
                // scale は出現と同時に [1, pulseScale, 1] の継続パルスを開始する。
                // opacity / y の出現アニメ（0.25s）と並行して scale も pulse 前半を走るため、
                // 「ふわっと出ながら微かに息づく」見え方になる（出現と pulse の同時進行は意図通り）。
                scale: [1, badge.pulseScale, 1],
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                // exit に独自の transition を必ず指定する。指定しないと親の transition
                // （scale.repeat: Infinity）を継承して exit アニメが完了せず、要素が
                // DOM 上に opacity 0 のゾンビ要素として残り続け、後続バッジとの間に
                // 不要な隙間が生まれる（実際にこの不具合が観測されたため対処）。
                transition: { duration: 0.2 },
              }}
              transition={{
                opacity: { duration: 0.25 },
                y: { duration: 0.25 },
                scale: {
                  duration: badge.pulseDuration,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut',
                },
              }}
              className={`inline-flex items-center justify-center rounded-xl border-[5px] border-black px-2.5 py-1 font-black tracking-wider whitespace-nowrap shadow-[5px_5px_0_0_#000] sm:px-3 sm:py-1.5 ${badge.textSizeClassName ?? DEFAULT_BADGE_TEXT_SIZE}`}
              style={{
                backgroundColor: badge.bgColor,
                color: badge.textColor === 'white' ? '#ffffff' : '#000000',
              }}
            >
              {badge.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/*
        === 中央: タイマー pill ===
        参考画像（Wii Party）の細長い pill 形を踏襲。
        - rounded-full + 黒枠 + 白背景 + ベタ影で neo-brutalism の主役感を出す
        - 中央に残り秒数を大きく（text-5xl sm:text-6xl）
        - 進捗バーは持たず、残り秒数の数値 + 色 + pulse で「迫っている」を伝える
        - 残り TIMER_WARNING_THRESHOLD_SEC 秒以下:
            数字を danger 色 / scale [1, 1.12, 1] で 0.5s 速 pulse / danger 色の drop-shadow 発光
      */}
      <motion.div
        className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center"
        animate={isTimerWarning ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={
          isTimerWarning
            ? {
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
              }
            : { duration: 0.3 }
        }
        style={{
          // drop-shadow は 'none' との切替で interpolate トラップに陥るため、非警告時も
          // 同形式の透明 drop-shadow を入れて framer-motion の filter 補間を安定させる。
          filter: isTimerWarning
            ? 'drop-shadow(0 0 8px rgba(224, 49, 49, 0.7))'
            : 'drop-shadow(0 0 0px rgba(224, 49, 49, 0))',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full border-[5px] border-black bg-white px-6 py-1 shadow-[5px_5px_0_0_#000] sm:px-8 sm:py-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.round(TIME_CAP_MS / 1000)}
          aria-valuenow={remainingSec}
          aria-label={`残り時間 ${remainingSec} 秒`}
        >
          <span
            className="text-5xl leading-tight font-black tabular-nums sm:text-6xl"
            style={{ color: timerColor }}
            aria-hidden
          >
            {remainingSec}
          </span>
        </div>
      </motion.div>

      {/*
        === 右: SCORE パネル（独立枠、絶対配置で右寄せ） ===
        neo-brutalism の黒枠 + 影パネル。数値主役で進捗を直感化する（現在値大 + 目標値小）。
      */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <div className="flex items-center rounded-2xl border-[4px] border-black bg-white px-5 shadow-[4px_4px_0_0_#000] sm:px-6">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-black tracking-wider text-black/45"
              aria-hidden
            >
              SCORE
            </span>
            <span
              className="text-5xl leading-none font-black tabular-nums sm:text-6xl"
              style={{ color: SORTER_UI_COLORS.accent }}
              aria-label={`現在スコア ${displayScore} 点。目標 ${TARGET_SCORE} 点`}
            >
              {displayScore}
            </span>
            <span className="text-base font-black text-black/40 tabular-nums sm:text-lg">
              / {TARGET_SCORE}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
