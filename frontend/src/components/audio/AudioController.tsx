'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { bgmVolumeAtom, bgmOverrideAtom } from '@/stores/audio';
import { BGM_MANIFEST, resolveBgmKey } from './audioManifest';
import type { BgmKey } from './audioManifest';

/**
 * BGM を一元管理する単一プレイヤー。layout に常駐させる（描画はしない）。
 *
 * 宣言的アプローチ: 現在のルート（usePathname）を真実のソースとして再生曲を決める。
 * 各ページは BGM について何も書かず、ルート→曲の対応は audioManifest に集約する。
 * pathname は遷移で連続的に変わるため「曲なしの谷間」が生まれず、同じ曲を割り当てた
 * ルート間ではページ遷移をまたいで継続再生される。
 */
export function AudioController() {
  const pathname = usePathname();
  const bgmVolume = useAtomValue(bgmVolumeAtom);
  // ゲーム等がルート由来の曲を上書きする一時指定。あればこちらを優先する。
  const override = useAtomValue(bgmOverrideAtom);

  // 現在再生中の Audio 要素と曲。
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentKeyRef = useRef<BgmKey | null>(null);
  // 自動再生制限が解除されたか（最初のユーザー操作後に true）。
  const unlockedRef = useRef(false);
  // 最新のユーザー設定音量。曲切替時に参照するため ref に同期する。
  const bgmVolumeRef = useRef(bgmVolume);

  // ルート（または override）に応じて再生中の BGM を切り替える。
  useEffect(() => {
    // 上書き指定があればそれを優先し、なければルート由来の曲を使う。
    const targetKey = override ?? resolveBgmKey(pathname);
    // 同じ曲なら何もしない（＝ページ遷移をまたいで継続再生）。
    if (targetKey === currentKeyRef.current) return;

    // 別の曲（または null）に変わるときだけ、現在の曲を止めて切り替える。
    audioRef.current?.pause();
    audioRef.current = null;
    currentKeyRef.current = targetKey;

    if (!targetKey) return;

    const def = BGM_MANIFEST[targetKey];
    const audio = new Audio(def.src);
    audio.loop = true;
    audio.volume = def.baseVolume * bgmVolumeRef.current;
    audioRef.current = audio;
    // アンロック済みなら即再生。未アンロックの間に生成された Audio は、
    // 後続の unlock ハンドラ（下の useEffect）が audioRef を見て再生を拾う。
    if (unlockedRef.current) {
      audio.play().catch(() => {
        // 自動再生制限がかかった場合はアンロック後に再生される。
      });
    }
  }, [pathname, override]);

  // ユーザー設定音量の変化を再生中の BGM に反映し、最新値を ref に同期する。
  useEffect(() => {
    bgmVolumeRef.current = bgmVolume;
    const key = currentKeyRef.current;
    if (audioRef.current && key) {
      audioRef.current.volume = BGM_MANIFEST[key].baseVolume * bgmVolume;
    }
  }, [bgmVolume]);

  // 自動再生制限の解除（最初のユーザー操作で保留中の BGM を再生）。
  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      audioRef.current?.play().catch(() => {});
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // アンマウント時に再生中の BGM を停止する。
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return null;
}
