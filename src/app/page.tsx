'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Token, TokenStats } from '@/types';

// --- Risk Badge Component ---
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

// --- Risk Bar (visual gauge for breakdown) ---
function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  const barColor = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className={`text-xs w-28 text-right ${color}`}>{label}</div>
      <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 w-8">{value}</div>
    </div>
  );
}

// --- Search Bar ---
function SearchBar() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const mint = query.trim();
    if (!mint) return;

    setSearching(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Scan failed');
        return;
      }

      setResult(data.token);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Paste a Solana token mint address to scan..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded-xl transition"
        >
          Scan
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-in">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RiskBadge status={result.status} score={result.risk_score} />
              <div>
                <span className="font-medium text-white">{result.name || 'Unknown'}</span>
                <span className="text-gray-500 text-sm ml-2">${result.symbol || '???'}</span>
              </div>
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-gray-500 hover:text-gray-300 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="border-t border-gray-800">
            <TokenDetail token={result} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Stats Bar ---
function StatsBar({ stats }: { stats: TokenStats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
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

// --- Filter Bar ---
type FilterStatus = 'ALL' | 'RED' | 'YELLOW' | 'GREEN';
type SortKey = 'newest' | 'oldest' | 'score-asc' | 'score-desc';

function FilterBar({
  filter, setFilter, sort, setSort, count
}: {
  filter: FilterStatus;
  setFilter: (f: FilterStatus) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  count: Record<FilterStatus, number>;
}) {
  const pills: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'ALL', label: 'All', color: 'text-white border-gray-600' },
    { key: 'RED', label: 'High Risk', color: 'text-red-400 border-red-500/50' },
    { key: 'YELLOW', label: 'Medium', color: 'text-yellow-400 border-yellow-500/50' },
    { key: 'GREEN', label: 'Safe', color: 'text-green-400 border-green-500/50' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap gap-2">
        {pills.map(p => (
          <button
            key={p.key}
            onClick={() => setFilter(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === p.key
                ? `${p.color} bg-white/10`
                : 'text-gray-500 border-gray-800 hover:border-gray-600'
            }`}
          >
            {p.label} ({count[p.key]})
          </button>
        ))}
      </div>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortKey)}
        className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 outline-none"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="score-asc">Lowest Score</option>
        <option value="score-desc">Highest Score</option>
      </select>
    </div>
  );
}

// --- Token Detail Panel (expanded view) ---
function TokenDetail({ token }: { token: Token }) {
  const reasons = JSON.parse(token.risk_reasons || '[]');
  const breakdown = JSON.parse(token.risk_breakdown || '{}');

  const bars = [
    { label: 'Deployer (40%)', value: breakdown.deployer ?? 50, color: 'text-gray-300' },
    { label: 'Liquidity (25%)', value: breakdown.liquidity ?? 50, color: 'text-gray-300' },
    { label: 'Authority (15%)', value: breakdown.authority ?? 50, color: 'text-gray-300' },
    { label: 'Concentration (10%)', value: breakdown.concentration ?? 50, color: 'text-gray-300' },
    { label: 'Token Age (10%)', value: breakdown.age ?? 50, color: 'text-gray-300' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Risk Breakdown Bars */}
      <div>
        <div className="text-sm font-medium text-gray-300 mb-3">Risk Breakdown</div>
        <div className="space-y-2 max-w-md">
          {bars.map(b => (
            <RiskBar key={b.label} label={b.label} value={b.value} color={b.color} />
          ))}
        </div>
      </div>

      {/* Risk Reasons */}
      {reasons.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-300 mb-2">Flags</div>
          <ul className="space-y-1">
            {reasons.map((r: string, i: number) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">●</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3 pt-1">
        <a
          href={`https://rugcheck.xyz/tokens/${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition"
        >
          RugCheck →
        </a>
        <a
          href={`https://solscan.io/token/${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition"
        >
          Solscan →
        </a>
        <a
          href={`https://dexscreener.com/solana/${token.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 transition"
        >
          DexScreener →
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(token.mint)}
          className="text-xs text-gray-500 hover:text-gray-300 transition"
        >
          Copy Mint
        </button>
      </div>
    </div>
  );
}

// --- Token Card (mobile layout) ---
function TokenCard({ token, expanded, onToggle }: { token: Token; expanded: boolean; onToggle: () => void }) {
  const isNew = Date.now() - new Date(token.created_at).getTime() < 60000;

  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden transition-all ${
      isNew ? 'ring-1 ring-blue-500/50 animate-pulse-once' : ''
    }`}>
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-sm">{token.name || 'Unknown'}</span>
            <span className="text-xs text-gray-500">${token.symbol || '???'}</span>
          </div>
          <RiskBadge status={token.status} score={token.risk_score} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono">{token.mint.slice(0, 8)}...{token.mint.slice(-4)}</span>
          <div className="flex gap-3">
            <span>LP: {token.lp_locked ? '✅' : '❌'}</span>
            <span>Mint: {token.mint_authority_revoked ? '✅' : '⚠️'}</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {new Date(token.created_at).toLocaleString()}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-800">
          <TokenDetail token={token} />
        </div>
      )}
    </div>
  );
}

// --- Token Row (desktop table) ---
function TokenRow({ token, expanded, onToggle }: { token: Token; expanded: boolean; onToggle: () => void }) {
  const isNew = Date.now() - new Date(token.created_at).getTime() < 60000;
  const shortMint = `${token.mint.slice(0, 6)}...${token.mint.slice(-4)}`;
  const shortDeployer = `${token.deployer.slice(0, 6)}...${token.deployer.slice(-4)}`;

  return (
    <>
      <tr
        className={`border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition ${
          isNew ? 'bg-blue-500/5' : ''
        }`}
        onClick={onToggle}
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
        <td className="px-4 py-3 text-xs text-gray-400">{token.lp_locked ? '✅' : '❌'}</td>
        <td className="px-4 py-3 text-xs text-gray-400">{token.mint_authority_revoked ? '✅' : '⚠️'}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{token.source}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(token.created_at).toLocaleTimeString()}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-900/30">
          <td colSpan={8}>
            <TokenDetail token={token} />
          </td>
        </tr>
      )}
    </>
  );
}

// --- Main Dashboard ---
export default function Dashboard() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [expandedMint, setExpandedMint] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [sort, setSort] = useState<SortKey>('newest');

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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    let result = [...tokens];

    // Filter
    if (filter !== 'ALL') {
      result = result.filter(t => t.status === filter);
    }

    // Sort
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'score-asc':
        result.sort((a, b) => a.risk_score - b.risk_score);
        break;
      case 'score-desc':
        result.sort((a, b) => b.risk_score - a.risk_score);
        break;
    }

    return result;
  }, [tokens, filter, sort]);

  // Count per status for filter pills
  const filterCounts = useMemo(() => ({
    ALL: tokens.length,
    RED: tokens.filter(t => t.status === 'RED').length,
    YELLOW: tokens.filter(t => t.status === 'YELLOW').length,
    GREEN: tokens.filter(t => t.status === 'GREEN').length,
  }), [tokens]);

  return (
    <div>
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Live Token Risk Monitor
        </h1>
        <p className="text-sm text-gray-400">
          Real-time rug pull detection for Solana. Tokens are scanned and scored automatically.
        </p>
        {lastUpdate && (
          <p className="text-xs text-gray-600 mt-2">Last updated: {lastUpdate} · Auto-refreshes every 30s</p>
        )}
      </div>

      {/* Search */}
      <SearchBar />

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        sort={sort}
        setSort={setSort}
        count={filterCounts}
      />

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-gray-500">Loading tokens...</div>
      )}

      {/* Empty state */}
      {!loading && filteredTokens.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-gray-900/50 border border-gray-800 rounded-xl">
          {tokens.length === 0
            ? 'No tokens tracked yet. Scanner will populate this automatically.'
            : `No ${filter.toLowerCase()} risk tokens found.`}
        </div>
      )}

      {/* Mobile: Card Layout */}
      {!loading && filteredTokens.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredTokens.map(token => (
            <TokenCard
              key={token.mint}
              token={token}
              expanded={expandedMint === token.mint}
              onToggle={() => setExpandedMint(expandedMint === token.mint ? null : token.mint)}
            />
          ))}
        </div>
      )}

      {/* Desktop: Table Layout */}
      {!loading && filteredTokens.length > 0 && (
        <div className="hidden md:block bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
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
                {filteredTokens.map(token => (
                  <TokenRow
                    key={token.mint}
                    token={token}
                    expanded={expandedMint === token.mint}
                    onToggle={() => setExpandedMint(expandedMint === token.mint ? null : token.mint)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
