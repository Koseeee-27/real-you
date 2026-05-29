'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAtomValue } from 'jotai';
import { bgmVolumeAtom } from '@/stores/audio';
import { BGM_MANIFEST, type BgmKey } from './audioManifest';

export type BgmContextValue = {
  /**
   * BGM 再生をリクエストする。返り値を呼ぶとリクエストを取り下げる。
   * 複数のリクエストがある場合は「最後に登録されたもの」を再生する（スタック）。
   * useEffect の cleanup でリクエストを取り下げる前提。
   */
  registerBgm: (key: BgmKey) => () => void;
};

// Web Audio API のグローバル `AudioContext` と衝突しないよう BgmContext と命名する。
export const BgmContext = createContext<BgmContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const bgmVolume = useAtomValue(bgmVolumeAtom);

  // BGM 再生リクエストのスタック。最後の要素が「いま鳴らすべき曲」。
  const stackRef = useRef<Array<{ id: number; key: BgmKey }>>([]);
  const idRef = useRef(0);
  // 現在再生中の Audio 要素と曲。
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentKeyRef = useRef<BgmKey | null>(null);
  // 自動再生制限が解除されたか（最初のユーザー操作後に true）。
  const unlockedRef = useRef(false);
  // 最新のユーザー設定音量。reconcile（イベント駆動）から参照するため ref に同期する。
  const bgmVolumeRef = useRef(bgmVolume);
  // reconcile のマイクロタスクが予約済みか（多重予約の合体用）。
  const reconcileScheduledRef = useRef(false);

  // スタックの最新要求に合わせて再生中の BGM を切り替える本体。refs のみ参照する。
  const runReconcile = useCallback(() => {
    const targetKey = stackRef.current.at(-1)?.key ?? null;
    if (targetKey === currentKeyRef.current) return;

    // 現在の曲を停止してから切り替える。
    audioRef.current?.pause();
    audioRef.current = null;
    currentKeyRef.current = targetKey;

    if (!targetKey) return;

    const def = BGM_MANIFEST[targetKey];
    const audio = new Audio(def.src);
    audio.loop = true;
    audio.volume = def.baseVolume * bgmVolumeRef.current;
    audioRef.current = audio;
    if (unlockedRef.current) {
      audio.play().catch(() => {
        // 自動再生制限がかかった場合はアンロック後に再生される。
      });
    }
  }, []);

  // reconcile をマイクロタスクへ遅延・合体させる。
  // ページ遷移時は「旧ページの unregister」と「新ページの register」が同一 tick 内で
  // 前後どちらの順でも起こりうる。同期実行すると一瞬スタックが空になった瞬間に
  // BGM を停止してしまい、同じ曲でも頭出しされる（継続再生が壊れる）。
  // 1 tick 分まとめてから最終スタックを 1 回だけ評価することでこれを防ぐ。
  const scheduleReconcile = useCallback(() => {
    if (reconcileScheduledRef.current) return;
    reconcileScheduledRef.current = true;
    queueMicrotask(() => {
      reconcileScheduledRef.current = false;
      runReconcile();
    });
  }, [runReconcile]);

  // Context value は安定参照にする（毎レンダー変わると useBgm の effect が
  // 再実行され BGM が途切れるため）。初回のみ生成する。
  // 依存（scheduleReconcile）は安定参照前提。
  const [api] = useState<BgmContextValue>(() => ({
    registerBgm: (key: BgmKey) => {
      const id = idRef.current++;
      stackRef.current.push({ id, key });
      scheduleReconcile();
      return () => {
        stackRef.current = stackRef.current.filter((r) => r.id !== id);
        scheduleReconcile();
      };
    },
  }));

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

  return <BgmContext.Provider value={api}>{children}</BgmContext.Provider>;
}
