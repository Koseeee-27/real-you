'use client';

import Image from 'next/image';
import { motion, useAnimate } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import {
  BELT_HEIGHT_PX,
  BELT_LANE_HEIGHT_PX,
  PACKAGE_IMAGE_PATHS,
  PACKAGE_LABELS,
  SORTER_UI_COLORS,
} from '../data/sorterConstants';
import type { ActivePackage } from '../hooks/useSorterGame';

interface PackageItemProps {
  pkg: ActivePackage;
  /** ベルトコンテナの実測幅（px）。U 字経路の折り返し位置算出に使用 */
  beltWidth: number;
  isSelected: boolean;
  onClick: (id: number) => void;
  onOutflow: (id: number) => void;
}

/** 荷物 1 個分のサイズ（px） */
const PACKAGE_SIZE_PX = 84;

/** 上 lane / 下 lane の中央 Y 座標（荷物中心ではなく左上基準） */
const TOP_LANE_Y = BELT_LANE_HEIGHT_PX / 2 - PACKAGE_SIZE_PX / 2;
const BOTTOM_LANE_Y =
  BELT_HEIGHT_PX - BELT_LANE_HEIGHT_PX / 2 - PACKAGE_SIZE_PX / 2;

/**
 * 画面に流れている荷物 1 個。
 *
 * 画像内に「特急 / 取扱注意 / 重量物」のラベル + 識別シンボルが焼き込まれている前提で、
 * CSS による枠・テキスト重ねは持たない（画像主体のシンプル構成）。
 *
 * framer-motion の `useAnimate` で U 字経路をアニメーション制御:
 *   - 0%   : 左端外、上 lane
 *   - 45%  : 折り返し位置、上 lane
 *   - 55%  : 折り返し位置、下 lane
 *   - 100% : 左端外、下 lane → 流出
 *
 * 速度切替の設計:
 *   - 起動時の `duration` は **spawn 時の flowDurationMs** を直接使う
 *   - 進行中アニメの中途切替は `controls.speed` で行う。起動時 duration を基準に
 *     `speed = spawnFlowDurationMs / pkg.flowDurationMs` で補正する
 *   - 通常時 spawn の荷物が rule-changed-2 突入で 2 倍速化される場合: speed = 20000/10000 = 2
 *   - rule-changed-2 中に新規 spawn される荷物: 起動時 duration = 10000、speed = 1
 *
 * 流出は animate 完了時に通知。仕分け確定で unmount された場合は呼ばれないので
 * 二重カウントは原則起きないが、保険として `firedRef` で 1 回限定。
 *
 * 選択中は緑のグロー演出を内側の motion.div（scale + filter）で表現。
 * 親 motion.button の transform（位置アニメ）と衝突しないよう、演出は内側 div に閉じる。
 */
export default function PackageItem({
  pkg,
  beltWidth,
  isSelected,
  onClick,
  onOutflow,
}: PackageItemProps) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const firedRef = useRef(false);

  /**
   * spawn 時点の flowDurationMs を ref で固定保持。
   * アニメ起動 duration の基準として使い、中途切替時の speed 計算で
   * `spawnFlowDurationMs / pkg.flowDurationMs` を返すための base になる。
   */
  const spawnFlowDurationMsRef = useRef(pkg.flowDurationMs);

  /**
   * `onOutflow` を ref に逃がす。アニメ完了は 1 度だけ起動する effect の中で
   * Promise like に hook するため、依存配列に `onOutflow` を含めずに済ませたい。
   * 親の関数 identity 変化に再起動を引っ張られないようにする目的。
   */
  const onOutflowRef = useRef(onOutflow);
  useEffect(() => {
    onOutflowRef.current = onOutflow;
  }, [onOutflow]);

  // animation の起動（beltWidth が確定したら 1 回だけ）
  useEffect(() => {
    if (!scope.current || beltWidth === 0) return;

    const turnX = Math.max(0, beltWidth - 130);
    const controls = animate(
      scope.current,
      {
        x: [-PACKAGE_SIZE_PX - 20, turnX, turnX, -PACKAGE_SIZE_PX - 20],
        y: [TOP_LANE_Y, TOP_LANE_Y, BOTTOM_LANE_Y, BOTTOM_LANE_Y],
      },
      {
        duration: spawnFlowDurationMsRef.current / 1000,
        times: [0, 0.45, 0.55, 1],
        ease: 'linear',
      }
    );
    controlsRef.current = controls;

    // アニメ完了 = 流出。Promise like で onComplete を扱う。
    controls.then(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      onOutflowRef.current(pkg.id);
    });

    return () => {
      controls.stop();
    };
  }, [beltWidth, pkg.id, scope, animate]);

  // pkg.flowDurationMs の変更を進行中アニメに反映（速度 2 倍切替）
  useEffect(() => {
    if (!controlsRef.current) return;
    // 起動時 duration を base に倍率を計算。
    // 例: spawn=20000, flow=10000 → speed=2.0（通常時 spawn の荷物が後で 2 倍速化）
    //     spawn=10000, flow=10000 → speed=1.0（rule-changed-2 中の spawn、変化なし）
    controlsRef.current.speed =
      spawnFlowDurationMsRef.current / pkg.flowDurationMs;
  }, [pkg.flowDurationMs]);

  return (
    <button
      ref={scope}
      type="button"
      onClick={() => onClick(pkg.id)}
      className="absolute cursor-pointer border-none bg-transparent p-0 select-none"
      style={{
        width: `${PACKAGE_SIZE_PX}px`,
        height: `${PACKAGE_SIZE_PX}px`,
        top: 0,
        left: 0,
        zIndex: isSelected ? 20 : 10,
      }}
      aria-label={`荷物（${PACKAGE_LABELS[pkg.type]}）${isSelected ? '・選択中' : ''}`}
    >
      {/*
        選択演出用の内側 wrapper（motion.div）。
        親 button は useAnimate で位置アニメ（x/y）を担当するので、
        scale/glow のパルスはここで独立して制御する（transform の衝突回避）。
      */}
      <motion.div
        className="relative h-full w-full"
        animate={
          isSelected
            ? {
                scale: [1, 1.15],
                filter: [
                  'drop-shadow(0 0 8px rgba(87,208,113,1))',
                  'drop-shadow(0 0 20px rgba(87,208,113,1))',
                ],
              }
            : { scale: 1, filter: 'none' }
        }
        transition={
          isSelected
            ? {
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }
            : { duration: 0.2 }
        }
      >
        <Image
          src={PACKAGE_IMAGE_PATHS[pkg.type]}
          alt=""
          fill
          sizes={`${PACKAGE_SIZE_PX}px`}
          className="object-contain"
          priority={false}
        />
        {/* 選択中インジケーター: 緑のチェックマークバッジを右上に重ねる */}
        {isSelected && (
          <span
            aria-hidden
            className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-black text-sm font-black text-white shadow-[2px_2px_0_0_#000]"
            style={{ backgroundColor: SORTER_UI_COLORS.success }}
          >
            ✓
          </span>
        )}
      </motion.div>
    </button>
  );
}
