'use client';

import type { OptionIntentId, TurnDefinition } from '../data/turns';

interface ChoicePadProps {
  turn: TurnDefinition;
  remainingTimeMs: number;
  /** 選択時に意図 ID（1-4）を渡す */
  onSelect: (selectedOptionId: OptionIntentId) => void;
}

/** 下部のタイマーバー（赤/緑）+ 2×2 選択肢グリッド。 */
export default function ChoicePad({
  turn,
  remainingTimeMs,
  onSelect,
}: ChoicePadProps) {
  const ratio = Math.max(0, Math.min(1, remainingTimeMs / turn.timerMs));

  return (
    <div className="shrink-0 border-t-[6px] border-black bg-[#f1cf44] pb-6">
      {/* タイマーゲージ */}
      <div className="h-2.5 w-full bg-black">
        <div
          className={`h-full transition-[width] duration-100 ${
            turn.timerColor === 'green' ? 'bg-[#57d071]' : 'bg-[#e03131]'
          }`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {/* 選択肢（表示順は散らした固定順。意図 ID は選択肢に紐づく） */}
      <div className="grid grid-cols-2 gap-3 px-7 pt-5">
        {turn.choices.map((choice) => (
          <button
            key={choice.selectedOptionId}
            type="button"
            onClick={() => onSelect(choice.selectedOptionId)}
            className="min-h-[56px] rounded-2xl border-[3px] border-black bg-white px-5 py-4 text-left text-[15px] font-bold leading-snug text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#000]"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
