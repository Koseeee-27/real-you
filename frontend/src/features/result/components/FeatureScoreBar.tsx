'use client';

type FeatureScoreBarProps = {
  name: string;
  score: number;
  max?: number;
  className?: string;
};

export default function FeatureScoreBar({
  name,
  score,
  max = 100,
  className = '',
}: FeatureScoreBarProps) {
  const percent = Math.min(100, Math.max(0, (score / max) * 100));

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-sm text-gray-600">{score}</span>
      </div>
      <div className="mt-1 h-4 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
