'use client';

import { useAtom } from 'jotai';
import { Music, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { bgmVolumeAtom, seVolumeAtom } from '@/stores/audio';
import { useSe } from './useSe';

type SliderRowProps = {
  icon: ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** スライダー操作を確定したとき（プレビュー音などに使う） */
  onCommit?: () => void;
};

function SliderRow({ icon, label, value, onChange, onCommit }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-16 shrink-0 items-center gap-1.5 text-sm font-bold text-gray-800">
        {icon}
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        aria-label={`${label}の音量`}
        className="h-2 flex-1 cursor-pointer accent-rose-400"
      />
      <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-gray-500">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

/**
 * BGM / 効果音の音量を調整するスライダー UI。
 * `bgmVolumeAtom` / `seVolumeAtom`（localStorage 永続化）を読み書きし、
 * 変更は AudioController（BGM）と useSe（SE）に即時反映される。
 */
export function VolumeControl() {
  const [bgmVolume, setBgmVolume] = useAtom(bgmVolumeAtom);
  const [seVolume, setSeVolume] = useAtom(seVolumeAtom);
  const playSe = useSe();

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <SliderRow
        icon={<Music size={16} aria-hidden />}
        label="BGM"
        value={bgmVolume}
        onChange={setBgmVolume}
      />
      <SliderRow
        icon={<Volume2 size={16} aria-hidden />}
        label="効果音"
        value={seVolume}
        onChange={setSeVolume}
        // 効果音は鳴らさないと音量が分からないため、調整後にプレビュー再生する。
        onCommit={() => playSe('buttonClick')}
      />
    </div>
  );
}
