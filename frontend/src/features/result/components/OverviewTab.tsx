'use client';

import type { ResultResponse } from '../types';
import RadarChart from './RadarChart';

type OverviewTabProps = {
  data: ResultResponse;
};

function getGapRateDisplay(data: ResultResponse): string {
  const { gaps } = data;
  const maxAbsGap = Math.max(
    Math.abs(gaps.caution),
    Math.abs(gaps.calmness),
    Math.abs(gaps.logic),
    Math.abs(gaps.cooperativeness),
    Math.abs(gaps.positivity)
  );
  const percent = Math.min(100, Math.round((maxAbsGap / 100) * 100));
  return `${percent}%`;
}

export default function OverviewTab({ data }: OverviewTabProps) {
  const gapRate = getGapRateDisplay(data);
  const { feedback } = data;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <RadarChart
          baselineScores={data.baseline_scores}
          measuredScores={data.scores}
        />
      </div>
      <div className="rounded-lg border border-gray-200 bg-amber-50 p-3 sm:p-4">
        <div className="mb-2 rounded bg-red-600 px-2 py-1 text-center text-xs font-medium text-white sm:text-sm">
          CHECK THIS OUT!
        </div>
        <h3 className="text-base font-bold text-gray-800 sm:text-lg">
          理性と本能のギャップ:{' '}
          <span className="text-xl sm:text-2xl">{gapRate}</span>
        </h3>
        <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
          {feedback.description}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          最も乖離が大きかった項目: {feedback.gap_point}
        </p>
      </div>
    </div>
  );
}
