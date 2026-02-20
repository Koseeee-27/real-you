'use client';

import type { GameDetail } from '../types';
import FeatureScoreBar from './FeatureScoreBar';
import MetricsBarChart from './MetricsBarChart';

type GameDetailTabProps = {
  detail: GameDetail;
  comment: string;
  tabColor?: string;
};

export default function GameDetailTab({
  detail,
  comment,
  tabColor = '#3b82f6',
}: GameDetailTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-sm font-bold text-gray-700">
            計測された特徴
          </h3>
          <div className="space-y-2">
            {detail.feature_scores.map((fs) => (
              <FeatureScoreBar
                key={fs.axis}
                name={fs.name}
                score={fs.score}
                className="rounded border border-gray-100 bg-white p-2"
              />
            ))}
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-bold text-gray-700">解析コメント</h3>
          <p className="rounded border border-gray-100 bg-white p-3 text-sm text-gray-700">
            {comment}
          </p>
        </section>
      </div>
      <section>
        <h3 className="mb-2 text-sm font-bold text-gray-700">
          行動ログ詳細データ
        </h3>
        <div className="rounded border border-gray-100 bg-white p-2 sm:p-3">
          <MetricsBarChart
            metrics={detail.metrics}
            userBarColor={tabColor}
            averageBarColor="#9ca3af"
          />
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span style={{ color: tabColor }}>■ あなた</span>
            <span className="text-gray-400">■ 平均</span>
          </div>
        </div>
      </section>
    </div>
  );
}
