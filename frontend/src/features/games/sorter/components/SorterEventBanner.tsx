'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import {
  BIN_IMAGE_PATHS,
  PACKAGE_IMAGE_PATHS,
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
 *  - ルール変更通知カード（showRuleChangeNotice、中央特大 + 暗転）
 *  - 凍結予告カード（freezeStage = warning、中央特大 + シェイク演出）
 *  - 復旧カード（freezeStage = recovery、中央特大）
 *  - 速度上昇予告カード（showSpeedUpBanner、中央特大）
 *
 * 割り込みイベントカード（ルール変更 / 凍結予告 / 復旧 / 速度上昇）は、全画面 flex 中央寄せの
 * 器に内側カードを入れる構造で統一する。中央寄せを transform に頼らない（flex）ことで、
 * framer-motion の scale / x アニメ（transform を生成し CSS の translate を上書きする）と
 * 競合せず、確実に画面中央へ大きく表示できる。
 *
 * 配置の前提:
 *   `SorterGameFlow` の **盤面ラッパー（ベルトコンテナ + BinTray を包む relative）** 直下に
 *   `absolute inset-0` で配置する。これにより危機感オーバーレイが上段のベルトだけでなく
 *   下段の bin エリアまで覆い、「盤面全体がやばい」演出になる（HUD は覆わずタイマー可読性を優先）。
 *
 * 重なり順（このコンポーネント内）:
 *   危機感オーバーレイ（z-0）＜ 中央イベントカード群（z-20〜30）。
 *   コンポーネント全体は盤面ラッパー内で BinTray（z-10）より前面に来るよう
 *   ルートを z-20 にし、オーバーレイが bin をうっすら赤暗く染めつつ
 *   「⚠ 機械が停止します」カードは必ず前面でクッキリ読めるようにする。
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
    // クリックを透過させる（pointer-events-none）。
    // z-40: ドラッグ中に前面化する belt レイヤー（SorterGameFlow で z-30）よりさらに前に置く。
    // これより低いと、荷物をドラッグ中に中央イベントカードが出たとき、持ち上がった belt(z-30) の
    // 下にカードが潜ってしまう。pointer-events-none のため、この層を上げても D&D / ドロップ判定
    // （elementFromPoint は pointer-events:none を無視）には影響しない。
    // この層は装飾用 danger-overlay と読ませたいカードの混在コンテナなので層自体は
    // aria-hidden にせず、装飾の danger-overlay 側に個別に aria-hidden を付与する。
    <div className="pointer-events-none absolute inset-0 z-40">
      {/*
        危機感オーバーレイ（凍結予告 → 停止）。
        盤面（ベルト + bin）全体に赤フラッシュ + 暗転ビネットを重ねて「やばい感」を出す。
        操作を邪魔しないよう pointer-events-none / aria-hidden。
        中央イベントカード群より背面（z-0）に置き、カードは前面で読めるようにする。
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

      {/*
        中央イベントカード群（危機感オーバーレイより前面で読ませる）。
        各カードは全画面 flex 中央寄せで重なるが、割り込みイベントは EVENT_ANCHORS の順
        （ルール変更 → 停止 → 速度上昇）でラッチ発火するため通常は同時表示しない。
        ただしルール変更通知（〜RULE_CHANGE_NOTICE_DURATION_MS 表示）の最中に次イベントが
        発火すると一瞬重なり得る。その場合は z（停止予告 z-30 > 他カード z-20）と DOM 順で
        前後し、いずれも pointer-events-none・短時間のため実害はない。z だけに頼らず本前提を明記。
      */}
      <AnimatePresence>
        {/*
          ルール変更通知: 画面中央に特大カードを出し、背景をうっすら暗転させて注目を集める。
          小さな上部バナーでは見落とされやすかったため、荷物画像 → 仕分け先画像で
          「どの荷物がどこへ変わったか」を一目で伝える。表示は短時間（RULE_CHANGE_NOTICE_DURATION_MS）
          で、以降は HUD バッジ「ルール変更中」が継続表示する。ゲームは止めない（pointer-events-none）。
        */}
        {showRuleChangeNotice && (
          <motion.div
            key="rule-change-dim"
            aria-hidden
            className="absolute inset-0 z-10 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.24] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, times: [0, 0.4, 1] }}
          />
        )}
        {showRuleChangeNotice && (
          <motion.div
            key="rule-change-notice"
            // 全画面 flex 中央寄せの器。中央寄せを transform に頼らない（flex）ことで、
            // framer-motion の scale アニメ（transform を生成）と競合せず確実に中央表示できる。
            className="absolute inset-0 z-20 flex items-center justify-center px-4"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div className="rounded-3xl border-[6px] border-black bg-white px-8 py-6 text-center shadow-[8px_8px_0_0_#000] sm:px-12 sm:py-8">
              <p
                className="text-4xl font-black tracking-widest sm:text-5xl lg:text-6xl"
                style={{ color: SORTER_UI_COLORS.danger }}
              >
                ⚠ ルール変更！
              </p>
              {/* 荷物（変更前の種別）→ 仕分け先（変更後の入れ先）を画像で図示。
                  RULE_CHANGE_PAIRS から派生し、マッピング変更時も表示が自動追従する。 */}
              <div className="mt-4 flex flex-col items-center gap-3 sm:mt-5">
                {RULE_CHANGE_PAIRS.map(({ from, to }) => (
                  <div
                    key={from}
                    className="flex items-center justify-center gap-3 sm:gap-4"
                  >
                    <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                      <Image
                        src={PACKAGE_IMAGE_PATHS[from]}
                        alt={`${PACKAGE_LABELS[from]}の荷物`}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    </div>
                    <span
                      aria-hidden
                      className="text-4xl font-black sm:text-5xl"
                    >
                      →
                    </span>
                    <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                      <Image
                        src={BIN_IMAGE_PATHS[to]}
                        alt={`${PACKAGE_LABELS[to]}の仕分け先`}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-lg font-bold text-black sm:text-xl lg:text-2xl">
                {RULE_CHANGE_NOTICE_TEXT}
              </p>
            </div>
          </motion.div>
        )}
        {freezeStage === 'warning' && (
          <motion.div
            key="frozen-warning"
            // 全画面 flex 中央寄せの器（ルール変更カードと同構造）。x シェイク + scale 脈動を
            // この器に掛け、中央のカードを揺らす。中央寄せは flex なので transform 競合しない。
            className="absolute inset-0 z-30 flex items-center justify-center px-4"
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
          >
            <div
              className="relative rounded-3xl border-[6px] border-black px-10 py-6 text-center shadow-[8px_8px_0_0_#000] sm:px-14 sm:py-8"
              style={{ backgroundColor: SORTER_UI_COLORS.danger }}
            >
              {/* 赤点滅: 同色のオーバーレイを脈動させてベタ塗りに点滅感を足す */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[18px]"
                style={{ backgroundColor: '#fff' }}
                animate={{ opacity: [0, 0.35, 0] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <p className="relative text-3xl font-black tracking-widest text-white sm:text-4xl lg:text-5xl">
                ⚠ 機械が停止します
              </p>
            </div>
          </motion.div>
        )}
        {freezeStage === 'recovery' && (
          <motion.div
            key="recovery"
            className="absolute inset-0 z-20 flex items-center justify-center px-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div
              className="rounded-3xl border-[6px] border-black px-10 py-6 text-center shadow-[8px_8px_0_0_#000] sm:px-14 sm:py-8"
              style={{ backgroundColor: SORTER_UI_COLORS.success }}
            >
              <p className="text-3xl font-black tracking-widest text-white sm:text-4xl lg:text-5xl">
                ✓ 復旧
              </p>
            </div>
          </motion.div>
        )}
        {showSpeedUpBanner && (
          <motion.div
            key="speed-up-banner"
            className="absolute inset-0 z-20 flex items-center justify-center px-4"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div
              className="rounded-3xl border-[6px] border-black px-10 py-6 text-center shadow-[8px_8px_0_0_#000] sm:px-14 sm:py-8"
              style={{ backgroundColor: SORTER_UI_COLORS.warning }}
            >
              <p className="text-3xl font-black tracking-widest text-black sm:text-4xl lg:text-5xl">
                ⚡ スピード 2 倍突入！
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
