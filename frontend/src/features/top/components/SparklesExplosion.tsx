'use client';

import { motion } from 'framer-motion';

const SPARKLE_COUNT = 20;
const SPARKLE_COLORS = ['#e9eb7c', '#ee7ee6', '#6eb8ca', '#e17a78', '#91ec77'];

/**
 * スタートボタン押下時に中心から弾けるまる爆発エフェクト。
 * マウント時に 1 回だけ再生する（表示制御は親の条件レンダリングで行う）。
 */
export default function SparklesExplosion() {
  const sparkles = Array.from({ length: SPARKLE_COUNT }, (_, index) => {
    const angle = (360 / SPARKLE_COUNT) * index;
    const rad = (angle * Math.PI) / 180;
    const distance = 60 + index * 3;
    // 元の transform: rotate(angle) translateY(distance) と同じ到達点を直交座標で算出
    return {
      id: index,
      size: 6 + (index % 5) * 2,
      color: SPARKLE_COLORS[index % SPARKLE_COLORS.length],
      dx: -distance * Math.sin(rad),
      dy: distance * Math.cos(rad),
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{ width: s.size, height: s.size, backgroundColor: s.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: [0, s.dx, s.dx],
            y: [0, s.dy, s.dy],
            scale: [0, 1.2, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, ease: 'easeOut', times: [0, 0.5, 1] }}
          // 中心合わせ（-50%）と framer の x/y/scale を合成する
          transformTemplate={({ x, y, scale }) =>
            `translate(-50%, -50%) translateX(${x}) translateY(${y}) scale(${scale})`
          }
        />
      ))}
    </div>
  );
}
