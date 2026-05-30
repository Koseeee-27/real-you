'use client';

import { useAtom } from 'jotai';
import { bgmVolumeAtom, seVolumeAtom } from '@/stores/audio';

/** ミュート解除時に復元する音量の退避先（localStorage キー） */
const MUTE_BACKUP_KEY = 'realyou:premuteVolumes';
/** 退避値が無い場合に復元するデフォルト音量（0〜1） */
const FALLBACK_VOLUME = 1;

/**
 * BGM / SE の即ミュート切り替え。
 * ミュート時は現在値を localStorage に退避し、解除時に復元する。
 */
export function useVolumeMute() {
  const [bgmVolume, setBgmVolume] = useAtom(bgmVolumeAtom);
  const [seVolume, setSeVolume] = useAtom(seVolumeAtom);
  const muted = bgmVolume === 0 && seVolume === 0;

  const toggleMute = () => {
    if (muted) {
      let bgm = FALLBACK_VOLUME;
      let se = FALLBACK_VOLUME;
      try {
        const raw = localStorage.getItem(MUTE_BACKUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { bgm?: number; se?: number };
          if (typeof parsed.bgm === 'number') bgm = parsed.bgm;
          if (typeof parsed.se === 'number') se = parsed.se;
        }
      } catch {
        // 読み込み失敗時は既定値で復元
      }
      setBgmVolume(bgm > 0 ? bgm : FALLBACK_VOLUME);
      setSeVolume(se > 0 ? se : FALLBACK_VOLUME);
    } else {
      try {
        localStorage.setItem(
          MUTE_BACKUP_KEY,
          JSON.stringify({ bgm: bgmVolume, se: seVolume })
        );
      } catch {
        // 退避失敗しても 0 にはする
      }
      setBgmVolume(0);
      setSeVolume(0);
    }
  };

  return { muted, toggleMute };
}
