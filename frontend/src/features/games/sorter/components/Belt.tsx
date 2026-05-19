'use client';

import { motion } from 'framer-motion';
import {
  BELT_FLOW_DURATION_SEC,
  BELT_HEIGHT_PX,
  BELT_LANE_HEIGHT_PX,
  BELT_TURN_WIDTH_PX,
  SPEED_UP_MULTIPLIER,
} from '../data/sorterConstants';

/**
 * 仕分けゲームのベルトコンベア背景。
 *
 * U 字型 2 lane 構造を CSS のみで描画する（画像未使用、軽量）:
 *   ┌──────────────[上 lane]──────────────┐
 *                                          │ 折り返し（縦シマシマ、横ベルトと同色同デザイン）
 *   └─────[下 lane]─────────────────────┘
 *
 * 投入口・流出口は画面端から始まる前提で省略。
 *
 * 流れるアニメーションは framer-motion で実装（CSS @keyframes 不使用、feature 内完結）。
 * `backgroundPositionX/Y` を keyframes として渡し、`repeat: Infinity` で無限ループ。
 *
 * 仕様「凍結中もコンベアと荷物は流れ続ける」に従い、凍結中もアニメは止めない。
 */

/** ベルトのシマシマパターン（横方向リピート、上 lane） */
const BELT_STRIPES_HORIZONTAL =
  'repeating-linear-gradient(90deg, #c08552 0, #c08552 32px, #8a5a32 32px, #8a5a32 64px)';

/** ベルトのシマシマパターン（横方向リピート、下 lane は色順を反転して U 字の連続感を出す） */
const BELT_STRIPES_HORIZONTAL_REVERSE =
  'repeating-linear-gradient(90deg, #8a5a32 0, #8a5a32 32px, #c08552 32px, #c08552 64px)';

/** ベルトのシマシマパターン（縦方向リピート、折り返し用、横ベルトと同色） */
const BELT_STRIPES_VERTICAL =
  'repeating-linear-gradient(180deg, #c08552 0, #c08552 32px, #8a5a32 32px, #8a5a32 64px)';

interface BeltProps {
  /** 速度 2 倍状態か。rule-changed-2 phase で true、ベルトのシマシマも高速化 */
  isSpeedUp?: boolean;
}

export default function Belt({ isSpeedUp = false }: BeltProps) {
  const beltFlowTransition = {
    duration: isSpeedUp
      ? BELT_FLOW_DURATION_SEC / SPEED_UP_MULTIPLIER
      : BELT_FLOW_DURATION_SEC,
    repeat: Infinity,
    ease: 'linear' as const,
  };

  return (
    <div
      className="relative w-full"
      style={{ height: `${BELT_HEIGHT_PX}px` }}
      aria-hidden
    >
      {/* 上 lane（左→右に流れる） */}
      <motion.div
        className="absolute top-0 left-0 overflow-hidden border-[5px] border-black"
        style={{
          right: `${BELT_TURN_WIDTH_PX}px`,
          height: `${BELT_LANE_HEIGHT_PX}px`,
          borderRight: 'none',
          borderTopLeftRadius: '14px',
          background: BELT_STRIPES_HORIZONTAL,
          backgroundSize: '64px 100%',
        }}
        animate={{ backgroundPositionX: ['0px', '64px'] }}
        transition={beltFlowTransition}
      />

      {/* 下 lane（右→左に流れる、開始位置を逆にする） */}
      <motion.div
        className="absolute bottom-0 left-0 overflow-hidden border-[5px] border-black"
        style={{
          right: `${BELT_TURN_WIDTH_PX}px`,
          height: `${BELT_LANE_HEIGHT_PX}px`,
          borderRight: 'none',
          borderBottomLeftRadius: '14px',
          background: BELT_STRIPES_HORIZONTAL_REVERSE,
          backgroundSize: '64px 100%',
        }}
        animate={{ backgroundPositionX: ['64px', '0px'] }}
        transition={beltFlowTransition}
      />

      {/* 上下 lane の境界線（U 字内側の閉鎖線） */}
      <div
        className="absolute left-0 border-b-[5px] border-black"
        style={{
          top: `${BELT_LANE_HEIGHT_PX}px`,
          right: `${BELT_TURN_WIDTH_PX}px`,
          height: 0,
        }}
      />
      <div
        className="absolute left-0 border-t-[5px] border-black"
        style={{
          bottom: `${BELT_LANE_HEIGHT_PX}px`,
          right: `${BELT_TURN_WIDTH_PX}px`,
          height: 0,
        }}
      />

      {/* === 折り返し部分（横ベルトと同じ茶色シマシマ、縦方向に流れる） === */}
      <motion.div
        className="absolute top-0 right-0 overflow-hidden border-[5px] border-black"
        style={{
          width: `${BELT_TURN_WIDTH_PX}px`,
          height: '100%',
          borderLeft: 'none',
          borderTopRightRadius: '14px',
          borderBottomRightRadius: '14px',
          background: BELT_STRIPES_VERTICAL,
          backgroundSize: '100% 64px',
        }}
        animate={{ backgroundPositionY: ['0px', '64px'] }}
        transition={beltFlowTransition}
      />
    </div>
  );
}
