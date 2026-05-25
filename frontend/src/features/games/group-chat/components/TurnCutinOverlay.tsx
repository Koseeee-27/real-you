'use client';

interface TurnCutinOverlayProps {
  /** 1 始まりのターン番号 */
  turnNumber: number;
}

/** ターン開始前の「ターン N」全画面カットイン演出（アプリウィンドウ内に重ねる） */
export default function TurnCutinOverlay({ turnNumber }: TurnCutinOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
      <p className="animate-[fadeInUp_0.3s_ease-out] text-6xl font-black tracking-[0.05em] text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] sm:text-7xl">
        ターン {turnNumber}
      </p>
    </div>
  );
}
