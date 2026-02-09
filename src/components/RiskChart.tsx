'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { TokenStats } from '@/types';

const COLORS = {
  RED: '#ef4444',
  YELLOW: '#eab308',
  GREEN: '#22c55e',
};

export default function RiskChart({ stats }: { stats: TokenStats }) {
  const data = [
    { name: 'High Risk', value: stats.red, color: COLORS.RED },
    { name: 'Medium Risk', value: stats.yellow, color: COLORS.YELLOW },
    { name: 'Low Risk', value: stats.green, color: COLORS.GREEN },
  ].filter(d => d.value > 0);

  // Nothing to show
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="85%"
            dataKey="value"
            strokeWidth={2}
            stroke="#0a0a0a"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-bold text-white">{stats.total}</div>
        <div className="text-xs text-gray-500">tokens</div>
      </div>
    </div>
  );
}
