import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { BgmKey } from '@/components/audio/audioManifest';

/**
 * BGM / SE のユーザー設定音量（0〜1）。
 * 曲ごとの基準音量（audioManifest）に乗算して最終音量を決める。
 * 既定値 1.0 は「基準音量をそのまま使う」= 共通基盤導入前と同じ音量。
 * localStorage に永続化し、再訪時も設定を維持する。
 */
export const bgmVolumeAtom = atomWithStorage('realyou:bgmVolume', 1);
export const seVolumeAtom = atomWithStorage('realyou:seVolume', 1);

/**
 * ルート（pathname）由来の曲を上書きする一時的な BGM 指定。
 * ゲームのように 1 つのルート内で状態に応じて曲が変わる画面が、現在鳴らすべき曲を宣言する。
 * null のときはルート由来の曲（resolveBgmKey）が使われる。永続化しない。
 */
export const bgmOverrideAtom = atom<BgmKey | null>(null);
