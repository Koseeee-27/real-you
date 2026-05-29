import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // 第2の dev インスタンスを別ビルドディレクトリで動かすため env で distDir を切替可能に。
  // 未指定なら従来どおり .next（既存サーバーの挙動は不変）。
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
