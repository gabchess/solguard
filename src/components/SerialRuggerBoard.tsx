'use client';

import { useEffect, useState } from 'react';

type Rugger = {
  deployer: string;
  total_tokens: number;
  red_count: number;
  yellow_count: number;
  avg_score: number;
  worst_score: number;
  latest_token_time: string;
};

export default function SerialRuggerBoard() {
  const [ruggers, setRuggers] = useState<Rugger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRuggers = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setRuggers(data.ruggers || []);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRuggers();
    const interval = setInterval(fetchRuggers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-cyber-gray/80 border border-cyber-red/30 p-6 mb-8">
        <div className="text-cyber-red font-mono text-sm animate-pulse">Loading threat intelligence...</div>
      </div>
    );
  }

  if (ruggers.length === 0) {
    return null; // Don't show section if no serial ruggers detected
  }

  const getThreatLevel = (redCount: number, avgScore: number) => {
    if (redCount >= 3) return { label: 'CRITICAL', color: 'text-cyber-red', bg: 'bg-cyber-red/20 border-cyber-red/50' };
    if (redCount >= 2 || avgScore < 25) return { label: 'HIGH', color: 'text-cyber-red', bg: 'bg-cyber-red/10 border-cyber-red/30' };
    if (avgScore < 40) return { label: 'ELEVATED', color: 'text-cyber-yellow', bg: 'bg-cyber-yellow/10 border-cyber-yellow/30' };
    return { label: 'MODERATE', color: 'text-cyber-yellow', bg: 'bg-cyber-yellow/10 border-cyber-yellow/30' };
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          Serial Rugger <span className="text-cyber-red">Leaderboard</span>
        </h2>
        <span className="text-[10px] border border-cyber-red/50 text-cyber-red px-1.5 py-0.5 font-medium bg-cyber-red/10">
          THREAT_INTEL
        </span>
      </div>

      <div className="grid gap-3">
        {ruggers.map((rugger, i) => {
          const threat = getThreatLevel(rugger.red_count, rugger.avg_score);
          return (
            <a
              key={rugger.deployer}
              href={`/deployer/${rugger.deployer}`}
              className={`block border ${threat.bg} p-4 hover:bg-cyber-gray/90 transition-all group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-black text-gray-600 w-8">
                    #{i + 1}
                  </div>
                  <div>
                    <div className="font-mono text-sm text-white group-hover:text-cyber-blue transition-colors">
                      {rugger.deployer.slice(0, 4)}...{rugger.deployer.slice(-4)}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 flex gap-3">
                      <span>{rugger.total_tokens} tokens deployed</span>
                      <span className="text-cyber-red">{rugger.red_count} RED</span>
                      <span className="text-cyber-yellow">{rugger.yellow_count} YELLOW</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase">Avg Score</div>
                    <div className={`text-lg font-bold font-mono ${rugger.avg_score <= 30 ? 'text-cyber-red' : 'text-cyber-yellow'}`}>
                      {rugger.avg_score}/100
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold px-2 py-1 border ${threat.bg} ${threat.color} uppercase tracking-wider`}>
                    {threat.label}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
