'use client';

import type { OptionIntentId, TurnDefinition } from '../data/turns';

interface ChoicePadProps {
  turn: TurnDefinition;
  remainingTimeMs: number;
  /** 選択時に意図 ID（1-4）を渡す */
  onSelect: (selectedOptionId: OptionIntentId) => void;
  /** 選択肢にホバーしたとき（意図 ID を渡す）。迷い計測用 */
  onHover: (selectedOptionId: OptionIntentId) => void;
}

/** 下部のタイマーバー（黄色固定）+ 2×2 選択肢グリッド。 */
export default function ChoicePad({
  turn,
  remainingTimeMs,
  onSelect,
  onHover,
}: ChoicePadProps) {
  const ratio = Math.max(0, Math.min(1, remainingTimeMs / turn.timerMs));

  return (
    <div className="shrink-0 border-t-[6px] border-black bg-[#f1cf44] pb-6">
      {/* タイマーゲージ: 全ターン共通の黄色。残り時間を視覚化するのみで、
          赤色などで「答えないと失敗」のプレッシャーを与えない設計。 */}
      <div className="h-2.5 w-full bg-black">
        <div
          className="h-full bg-[#f1cf44] transition-[width] duration-100"
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
            onPointerEnter={() => onHover(choice.selectedOptionId)}
            className="min-h-[56px] rounded-2xl border-[3px] border-black bg-white px-5 py-4 text-left text-[15px] font-bold leading-snug text-black shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#000] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/40 focus-visible:ring-offset-2"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}
