'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { seVolumeAtom } from '@/stores/audio';
import { SE_MANIFEST } from './audioManifest';
import type { SeKey } from './audioManifest';

/**
 * SE（効果音）を鳴らすためのフック。`const playSe = useSe();` のように使い、
 * `playSe('buttonClick')` でワンショット再生する。
 *
 * - SE は鳴らすたびに使い捨ての Audio を生成するため、再生の瞬間に
 *   ユーザー設定音量（seVolumeAtom）を読んで `baseVolume × seVolume` を反映する。
 * - 返す playSe は安定参照（最新音量は ref 経由で参照する）。
 */
export function useSe() {
  const seVolume = useAtomValue(seVolumeAtom);
  const seVolumeRef = useRef(seVolume);
  useEffect(() => {
    seVolumeRef.current = seVolume;
  }, [seVolume]);

  return useCallback((key: SeKey) => {
    const def = SE_MANIFEST[key];
    const audio = new Audio(def.src);
    audio.volume = def.baseVolume * seVolumeRef.current;
    audio.play().catch(() => {
      // 自動再生制限等は無視（SE は鳴らなくても致命的でない）。
    });
  }, []);
}
