'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { bgmOverrideAtom } from '@/stores/audio';
import type { BgmKey } from './audioManifest';

/**
 * ゲームなど「1 つのルート内で状態に応じて曲が変わる画面」が、
 * 現在鳴らすべき BGM を宣言するためのフック。
 *
 * - `key` を渡すと AudioController がルート由来の曲より優先してその曲を再生する。
 * - `key` を変えると曲が切り替わる（同じ曲なら継続再生）。
 * - `null` を渡すとルート由来の曲に戻る（＝そのルートが未定義なら無音）。
 * - アンマウント時は自動で上書きを解除する。
 *
 * 注意: `bgmOverrideAtom` は単一の上書き枠で last-writer-wins。cleanup は常に
 * `setOverride(null)` で解除するため、このフックは「同時に 1 画面（1 コンポーネント）
 * だけ」が使う前提（各ゲームは 1 ルートに 1 つだけマウントされる）。複数が同時に
 * 呼ぶと互いの上書きを打ち消し合うため避けること。
 */
export function useBgmOverride(key: BgmKey | null) {
  const setOverride = useSetAtom(bgmOverrideAtom);
  useEffect(() => {
    setOverride(key);
    return () => setOverride(null);
  }, [key, setOverride]);
}
