'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Metric } from '../types';

type MetricsBarChartProps = {
  metrics: Metric[];
  userBarColor?: string;
  averageBarColor?: string;
  className?: string;
};

export default function MetricsBarChart({
  metrics,
  userBarColor = '#ef4444',
  averageBarColor = '#9ca3af',
  className = '',
}: MetricsBarChartProps) {
  const allValues = metrics.flatMap((m) => [m.user, m.average]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1);

  const data = metrics.map((m) => ({
    label: m.label,
    user: m.user,
    average: m.average,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(180, metrics.length * 36)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
        >
          <XAxis type="number" domain={[minVal, maxVal]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
                  <p className="font-medium text-gray-800">{d.label}</p>
                  <p className="text-sm">あなた: {d.user}</p>
                  <p className="text-sm">平均: {d.average}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="user" name="あなた" barSize={14} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={`user-${i}`} fill={userBarColor} />
            ))}
          </Bar>
          <Bar dataKey="average" name="平均" barSize={14} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={`avg-${i}`} fill={averageBarColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
