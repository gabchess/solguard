'use client';

import { useEffect, useState } from 'react';
import type { Token, TokenStats } from '@/types';

function RiskBadge({ status, score }: { status: string; score: number }) {
  const colors = {
    RED: 'bg-red-500/20 text-red-400 border-red-500/30',
    YELLOW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    GREEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[status as keyof typeof colors] || colors.YELLOW}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'RED' ? 'bg-red-500 animate-pulse' : status === 'GREEN' ? 'bg-green-500' : 'bg-yellow-500'}`} />
      {score}/100
    </span>
  );
}

function StatsBar({ stats }: { stats: TokenStats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-2xl font-bold text-white">{stats.total}</div>
        <div className="text-xs text-gray-500 mt-1">Tokens Tracked</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-2xl font-bold text-red-400">{stats.red}</div>
        <div className="text-xs text-gray-500 mt-1">High Risk</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-2xl font-bold text-yellow-400">{stats.yellow}</div>
        <div className="text-xs text-gray-500 mt-1">Medium Risk</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-2xl font-bold text-green-400">{stats.green}</div>
        <div className="text-xs text-gray-500 mt-1">Low Risk</div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-2xl font-bold text-blue-400">{stats.avgScore}</div>
        <div className="text-xs text-gray-500 mt-1">Avg Score</div>
      </div>
    </div>
  );
}

function TokenRow({ token }: { token: Token }) {
  const [expanded, setExpanded] = useState(false);
  const reasons = JSON.parse(token.risk_reasons || '[]');
  const shortMint = `${token.mint.slice(0, 6)}...${token.mint.slice(-4)}`;
  const shortDeployer = `${token.deployer.slice(0, 6)}...${token.deployer.slice(-4)}`;

  return (
    <>
      <tr
        className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <RiskBadge status={token.status} score={token.risk_score} />
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-white">{token.name || 'Unknown'}</div>
          <div className="text-xs text-gray-500">${token.symbol || '???'}</div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortMint}</td>
        <td className="px-4 py-3 font-mono text-xs text-gray-400">{shortDeployer}</td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {token.lp_locked ? '✅' : '❌'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {token.mint_authority_revoked ? '✅' : '⚠️'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{token.source}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(token.created_at).toLocaleTimeString()}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-900/30">
          <td colSpan={8} className="px-6 py-4">
            <div className="text-sm font-medium text-gray-300 mb-2">Risk Factors:</div>
            <ul className="space-y-1">
              {reasons.length > 0 ? reasons.map((r: string, i: number) => (
                <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">●</span> {r}
                </li>
              )) : (
                <li className="text-xs text-gray-500">No specific risk factors detected</li>
              )}
            </ul>
            <div className="mt-3 flex gap-3">
              <a
                href={`https://rugcheck.xyz/tokens/${token.mint}`}
                target="_blank"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View on RugCheck →
              </a>
              <a
                href={`https://solscan.io/token/${token.mint}`}
                target="_blank"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View on Solscan →
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Dashboard() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      setTokens(data.tokens || []);
      setStats(data.stats || null);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Live Token Risk Monitor
        </h1>
        <p className="text-gray-400">
          Real-time rug pull detection for Solana. Tokens are scanned and scored automatically.
        </p>
        {lastUpdate && (
          <p className="text-xs text-gray-600 mt-2">Last updated: {lastUpdate} · Auto-refreshes every 30s</p>
        )}
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Token Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Mint</th>
                <th className="px-4 py-3 text-left">Deployer</th>
                <th className="px-4 py-3 text-left">LP</th>
                <th className="px-4 py-3 text-left">Mint Auth</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Loading tokens...
                  </td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No tokens tracked yet. Scanner will populate this automatically.
                  </td>
                </tr>
              ) : (
                tokens.map((token) => (
                  <TokenRow key={token.mint} token={token} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
