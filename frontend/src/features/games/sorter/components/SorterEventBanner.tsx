'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  PACKAGE_LABELS,
  RULE_CHANGE_PAIRS,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import type { FreezeStage } from '../hooks/useSorterGame';

/**
 * ルール変更通知バナーのサブ文言（フル文・複数行は ` / ` 結合）。
 * `RULE_CHANGE_PAIRS` から `PACKAGE_LABELS` 経由で派生し、マッピング変更時に
 * 文言を取り残さない。例: 「『特急』は今後『重量物』の振り分け先へ」。
 */
const RULE_CHANGE_NOTICE_TEXT = RULE_CHANGE_PAIRS.map(
  ({ from, to }) =>
    `「${PACKAGE_LABELS[from]}」は今後「${PACKAGE_LABELS[to]}」の振り分け先へ`
).join(' / ');

interface SorterEventBannerProps {
  /** 機械停止のサブシーケンス段階。warning / frozen で危機感オーバーレイ、recovery で復旧バナー */
  freezeStage: FreezeStage;
  /** ルール変更通知バナーの表示フラグ */
  showRuleChangeNotice: boolean;
  /** 速度上昇の予告バナー表示フラグ */
  showSpeedUpBanner: boolean;
}

/**
 * 盤面（ベルト + 仕分け先）全体に重ねる割り込みイベント表示群。
 *
 *  - 危機感オーバーレイ（freezeStage = warning / frozen の赤フラッシュ + 暗転ビネット）
 *  - ルール変更通知バナー（showRuleChangeNotice）
 *  - 凍結予告バナー（freezeStage = warning、シェイク演出）
 *  - 復旧バナー（freezeStage = recovery）
 *  - 速度上昇予告バナー（showSpeedUpBanner）
 *
 * 配置の前提:
 *   `SorterGameFlow` の **盤面ラッパー（ベルトコンテナ + BinTray を包む relative）** 直下に
 *   `absolute inset-0` で配置する。これにより危機感オーバーレイが上段のベルトだけでなく
 *   下段の bin エリアまで覆い、「盤面全体がやばい」演出になる（HUD は覆わずタイマー可読性を優先）。
 *
 * 重なり順（このコンポーネント内）:
 *   危機感オーバーレイ（z-0）＜ 上部イベントバナー群（z-20〜30）。
 *   コンポーネント全体は盤面ラッパー内で BinTray（z-10）より前面に来るよう
 *   ルートを z-20 にし、オーバーレイが bin をうっすら赤暗く染めつつ
 *   「⚠ 機械が停止します」バナーは必ず前面でクッキリ読めるようにする。
 *
 * MISS バッジは流出口（ベルト左下）基準で位置が異なるため `SorterMissBadge` に分離し、
 * ベルトコンテナ内に配置する。
 */
export default function SorterEventBanner({
  freezeStage,
  showRuleChangeNotice,
  showSpeedUpBanner,
}: SorterEventBannerProps) {
  // 凍結予告（warning）と停止中（frozen）で盤面に重ねる危機感オーバーレイ。
  // 予告中は弱め・点滅速め、停止中は強め・点滅ゆっくりにして段階感を出す。
  const isDangerOverlay = freezeStage === 'warning' || freezeStage === 'frozen';
  const dangerFlashPeak = freezeStage === 'frozen' ? 0.26 : 0.15;
  const dangerFlashDuration = freezeStage === 'frozen' ? 0.9 : 0.55;

  return (
    // 盤面ラッパー全体を覆う割り込みイベント層。予告（warning）フェーズは操作可能なため
    // クリックを透過させる（pointer-events-none）。BinTray(z-10) より前面に置く。
    // この層は装飾用 danger-overlay と読ませたいバナーの混在コンテナなので層自体は
    // aria-hidden にせず、装飾の danger-overlay 側に個別に aria-hidden を付与する。
    <div className="pointer-events-none absolute inset-0 z-20">
      {/*
        危機感オーバーレイ（凍結予告 → 停止）。
        盤面（ベルト + bin）全体に赤フラッシュ + 暗転ビネットを重ねて「やばい感」を出す。
        操作を邪魔しないよう pointer-events-none / aria-hidden。
        上部イベントバナー群より背面（z-0）に置き、バナーは前面で読めるようにする。
      */}
      <AnimatePresence>
        {isDangerOverlay && (
          <motion.div
            key="danger-overlay"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* 四隅を暗く落とすビネット（中央は素通し） */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)',
              }}
            />
            {/* 赤フラッシュ（脈動）。danger 色をベースに点滅させて警報感を出す */}
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: SORTER_UI_COLORS.danger }}
              animate={{ opacity: [0, dangerFlashPeak, 0] }}
              transition={{
                duration: dangerFlashDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* イベントバナー（危機感オーバーレイより前面で読ませる） */}
      <AnimatePresence>
        {showRuleChangeNotice && (
          <motion.div
            key="rule-change-notice"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.danger }}
          >
            <p className="text-lg font-black tracking-widest text-white sm:text-xl">
              ルール変更！
            </p>
            <p className="text-xs font-bold text-white sm:text-sm">
              {RULE_CHANGE_NOTICE_TEXT}
            </p>
          </motion.div>
        )}
        {freezeStage === 'warning' && (
          <motion.div
            key="frozen-warning"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              // 振幅を大きくして「やばい感」を強調 + 軽い拡大の脈動を重ねる
              x: [0, -8, 8, -8, 8, 0],
              scale: [1, 1.06, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.15 },
              x: { duration: 0.35, repeat: Infinity, ease: 'linear' },
              scale: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute top-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[6px_6px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.danger }}
          >
            {/* 赤点滅: 同色のオーバーレイを脈動させてベタ塗りに点滅感を足す */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[10px]"
              style={{ backgroundColor: '#fff' }}
              animate={{ opacity: [0, 0.35, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <p className="relative text-base font-black tracking-widest text-white sm:text-lg">
              ⚠ 機械が停止します
            </p>
          </motion.div>
        )}
        {freezeStage === 'recovery' && (
          <motion.div
            key="recovery"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.success }}
          >
            <p className="text-base font-black tracking-widest text-white sm:text-lg">
              ✓ 復旧
            </p>
          </motion.div>
        )}
        {showSpeedUpBanner && (
          <motion.div
            key="speed-up-banner"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl border-[5px] border-black px-6 py-3 text-center shadow-[5px_5px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.warning }}
          >
            <p className="text-base font-black tracking-widest text-black sm:text-lg">
              ⚡ スピード 2 倍突入！
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
