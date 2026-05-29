import { atomWithStorage } from 'jotai/utils';

/**
 * BGM / SE のユーザー設定音量（0〜1）。
 * 曲ごとの基準音量（audioManifest）に乗算して最終音量を決める。
 * 既定値 1.0 は「基準音量をそのまま使う」= 共通基盤導入前と同じ音量。
 * localStorage に永続化し、再訪時も設定を維持する。
 */
export const bgmVolumeAtom = atomWithStorage('realyou:bgmVolume', 1);
export const seVolumeAtom = atomWithStorage('realyou:seVolume', 1);
