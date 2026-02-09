'use client';

import SerialRuggerBoard from '@/components/SerialRuggerBoard';

export default function LeaderboardPage() {
  return (
    <div>
      <div className="mb-8 relative border-b border-cyber-red/20 pb-6">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">
          SERIAL RUGGER <span className="text-cyber-red">::</span> LEADERBOARD
        </h1>
        <p className="text-sm text-cyber-red/60 font-mono">
          {'>>'} THREAT_ACTORS RANKED BY RUG PULL HISTORY AND RISK SCORE
        </p>
      </div>

      <SerialRuggerBoard />
    </div>
  );
}
