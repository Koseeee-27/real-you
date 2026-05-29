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
 */
export function useBgmOverride(key: BgmKey | null) {
  const setOverride = useSetAtom(bgmOverrideAtom);
  useEffect(() => {
    setOverride(key);
    return () => setOverride(null);
  }, [key, setOverride]);
}
