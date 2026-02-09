'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TokenStats } from '@/types';

export default function RiskChart({ stats }: { stats: TokenStats }) {
  const data = [
    { name: 'Red', value: stats.red, color: '#ff2d2d' },     // Cyber Red
    { name: 'Yellow', value: stats.yellow, color: '#ffb800' }, // Cyber Yellow
    { name: 'Green', value: stats.green, color: '#00ff88' },   // Cyber Green
  ];

  return (
    <div className="w-full h-full min-h-[160px] flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 5px ${entry.color}80)` }} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0a0a0f',
              borderColor: '#12121a',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)'
            }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs text-gray-500 uppercase">Total</span>
        <span className="text-lg font-bold text-white font-mono">{stats.total}</span>
      </div>
    </div>
  );
}
