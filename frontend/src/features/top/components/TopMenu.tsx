'use client';

import { Volume2, VolumeX, HelpCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useAudioSettings } from '@/features/audio/hooks/useAudioSettings';
import HowToPlayModal from './HowToPlayModal';

interface TopMenuProps {
  /** メニューを閉じるコールバック */
  onClose: () => void;
}

/** ミュート解除時に復元する音量の退避先（localStorage キー） */
const MUTE_BACKUP_KEY = 'realyou_premute_volumes';
/** 退避値が無い場合に復元するデフォルト音量 */
const FALLBACK_VOLUME = 50;

/**
 * トップページのメニューモーダル。
 * 音量設定（BGM/SE）と遊び方の確認ができる。
 */
export default function TopMenu({ onClose }: TopMenuProps) {
  const { bgmVolume, seVolume, setBgmVolume, setSeVolume, isLoaded } =
    useAudioSettings();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // BGM・SE がどちらも 0 のときをミュート状態とみなす
  const muted = isLoaded && bgmVolume === 0 && seVolume === 0;

  /**
   * 即ミュート切り替え。
   * - ミュート時：現在の音量を localStorage に退避してから両方 0 にする
   * - 解除時：退避値（無ければ既定値）へ復元する
   * 退避先を localStorage にすることで、モーダルを閉じ直しても復元できる。
   */
  const toggleMute = () => {
    if (muted) {
      let restore = { bgm: FALLBACK_VOLUME, se: FALLBACK_VOLUME };
      try {
        const raw = localStorage.getItem(MUTE_BACKUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { bgm?: number; se?: number };
          restore = {
            bgm: typeof parsed.bgm === 'number' ? parsed.bgm : FALLBACK_VOLUME,
            se: typeof parsed.se === 'number' ? parsed.se : FALLBACK_VOLUME,
          };
        }
      } catch {
        // 読み込み失敗時は既定値で復元
      }
      setBgmVolume(restore.bgm > 0 ? restore.bgm : FALLBACK_VOLUME);
      setSeVolume(restore.se > 0 ? restore.se : FALLBACK_VOLUME);
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white transition hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>

          {/* タイトル */}
          <h2 className="mb-6 text-center text-2xl font-black tracking-wide">
            メニュー
          </h2>

          {/* 音量設定セクション */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Volume2 className="h-5 w-5" />
                音量設定
              </h3>

              {/* 即ミュートトグル */}
              <button
                onClick={toggleMute}
                disabled={!isLoaded}
                aria-pressed={muted}
                className={`flex items-center gap-1.5 rounded-full border-2 border-black px-3 py-1 text-sm font-black shadow-[2px_2px_0_0_#000] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  muted
                    ? 'bg-red-400 text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                {muted ? 'ミュート中' : 'ミュート'}
              </button>
            </div>

            {/* BGM音量 */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-bold text-gray-700">
                BGM
              </label>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(Number(e.target.value))}
                  disabled={!isLoaded}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-black"
                />
                <Volume2 className="h-4 w-4 flex-shrink-0 text-gray-600" />
              </div>
            </div>

            {/* SE音量 */}
            <div className="mb-2">
              <label className="mb-1 block text-sm font-bold text-gray-700">
                効果音
              </label>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={seVolume}
                  onChange={(e) => setSeVolume(Number(e.target.value))}
                  disabled={!isLoaded}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-black"
                />
                <Volume2 className="h-4 w-4 flex-shrink-0 text-gray-600" />
              </div>
            </div>
          </div>

          {/* 遊び方ボタン */}
          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-yellow-300 px-4 py-3 font-bold transition hover:bg-yellow-400"
          >
            <HelpCircle className="h-5 w-5" />
            遊び方
          </button>
        </div>
      </div>

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </>
  );
}
