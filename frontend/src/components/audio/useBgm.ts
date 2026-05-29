'use client';

import { use, useEffect } from 'react';
import { BgmContext } from './AudioProvider';
import type { BgmKey } from './audioManifest';

/**
 * ページ / コンポーネントが「鳴らしたい BGM」を宣言するフック。
 * - マウント中はその曲を再生し、アンマウントでリクエストを取り下げる。
 * - `key` を動的に変えると曲が切り替わる（ゲーム内の状態に応じた切替に使える）。
 * - `key` に null を渡すと何も要求しない（条件によって BGM を止めたい場合に使う）。
 *
 * 同じ曲を要求するページ間ではページ遷移をまたいで継続再生される。
 */
export function useBgm(key: BgmKey | null) {
  const ctx = use(BgmContext);
  if (!ctx) {
    throw new Error('useBgm は AudioProvider の内側で使用してください');
  }

  useEffect(() => {
    if (!key) return;
    return ctx.registerBgm(key);
  }, [key, ctx]);
}
