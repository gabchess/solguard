'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Token, TokenStats } from '@/types';
import { getDocLink } from '@/lib/doc-links';
import ScannerStatus from '@/components/ScannerStatus';
import RiskChart from '@/components/RiskChart';
import MatrixLoader from '@/components/MatrixLoader';

// --- Risk Badge Component ---
function RiskBadge({ status, score }: { status: string; score: number }) {
  const colors = {
    RED: 'bg-cyber-red/10 text-cyber-red border-cyber-red/50 shadow-[0_0_10px_rgba(255,45,45,0.2)]',
    YELLOW: 'bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/50 shadow-[0_0_10px_rgba(255,184,0,0.2)]',
    GREEN: 'bg-cyber-green/10 text-cyber-green border-cyber-green/50 shadow-[0_0_10px_rgba(0,255,136,0.2)]',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded border ${colors[status as keyof typeof colors] || colors.YELLOW} font-mono text-xs tracking-wide`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'RED' ? 'bg-cyber-red animate-pulse' : status === 'GREEN' ? 'bg-cyber-green' : 'bg-cyber-yellow'}`} />
      RISK: {score}/100
    </span>
  );
}

// --- Risk Bar (visual gauge for breakdown) ---
function RiskBar({ label, value, color }: { label: string; value: number; color: string }) {
  const barColor = value >= 70 ? 'bg-cyber-green shadow-[0_0_5px_#00ff88]' : value >= 40 ? 'bg-cyber-yellow shadow-[0_0_5px_#ffb800]' : 'bg-cyber-red shadow-[0_0_5px_#ff2d2d]';
  return (
    <div className="flex items-center gap-3 font-mono">
      <div className={`text-[10px] w-32 text-right uppercase tracking-wider text-gray-500`}>{label}</div>
      <div className="flex-1 bg-cyber-black border border-cyber-gray/50 h-2 relative overflow-hidden">
        {/* Grid lines background */}
        <div className="absolute inset-0 flex justify-between px-px opacity-20">
          {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-cyber-blue" />)}
        </div>
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[10px] text-cyber-blue w-8">{value}</div>
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
      setError('Network uplink failure. Retrying...');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-blue to-cyber-green rounded-sm opacity-30 group-hover:opacity-70 transition duration-500 blur"></div>
        <div className="relative flex bg-cyber-black">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ENTER_MINT_ADDRESS_TO_SCAN..."
              className="w-full bg-cyber-black text-cyber-blue placeholder-gray-700 px-6 py-4 text-sm font-mono outline-none border border-cyber-blue/30 focus:border-cyber-blue/80 transition-colors"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] text-cyber-green animate-pulse">SCANNING</span>
                <div className="w-4 h-4 border-2 border-cyber-green border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-8 bg-cyber-blue/10 border-l border-t border-b border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue hover:text-cyber-black font-mono text-sm tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase font-bold"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-cyber-red/10 border border-cyber-red/50 text-xs font-mono text-cyber-red flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-6 border border-cyber-blue/30 bg-cyber-gray/90 animate-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyber-blue to-transparent" />

          <div className="p-4 flex items-center justify-between border-b border-cyber-blue/20 bg-cyber-black/50">
            <div className="flex items-center gap-4">
              <RiskBadge status={result.status} score={result.risk_score} />
              <div>
                <span className="font-bold text-white tracking-wide">{result.name || 'UNKNOWN_ASSET'}</span>
                <span className="text-gray-500 text-xs ml-2 font-mono">${result.symbol || '???'}</span>
              </div>
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-gray-500 hover:text-cyber-blue transition px-2"
            >
              [CLOSE]
            </button>
          </div>
          <div className="p-1">
            <TokenDetail token={result} />
          </div>
        </div>
      )}
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
    { key: 'ALL', label: 'ALL_SIGNALS', color: 'text-cyber-blue border-cyber-blue' },
    { key: 'RED', label: 'CRITICAL', color: 'text-cyber-red border-cyber-red' },
    { key: 'YELLOW', label: 'WARNING', color: 'text-cyber-yellow border-cyber-yellow' },
    { key: 'GREEN', label: 'SECURE', color: 'text-cyber-green border-cyber-green' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-cyber-gray/50 pb-4">
      <div className="flex flex-wrap gap-2">
        {pills.map(p => (
          <button
            key={p.key}
            onClick={() => setFilter(p.key)}
            className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${filter === p.key
                ? `${p.color} bg-white/5 shadow-[0_0_10px_currentColor]`
                : 'text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
              }`}
          >
            {p.label} <span className="opacity-50 ml-1">[{count[p.key]}]</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-600 uppercase">SORT_BY:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-cyber-black border border-cyber-blue/30 text-cyber-blue text-xs uppercase px-2 py-1 outline-none focus:border-cyber-blue"
        >
          <option value="newest">TIMESTAMP (DESC)</option>
          <option value="oldest">TIMESTAMP (ASC)</option>
          <option value="score-asc">RISK_SCORE (ASC)</option>
          <option value="score-desc">RISK_SCORE (DESC)</option>
        </select>
      </div>
    </div>
  );
}

// --- Token Detail Panel (expanded view) ---
function TokenDetail({ token }: { token: Token }) {
  let reasons: string[] = [];
  let breakdown: Record<string, number> = {};
  try {
    reasons = JSON.parse(token.risk_reasons || '[]');
    breakdown = JSON.parse(token.risk_breakdown || '{}');
  } catch {
    // Fallback if JSON is malformed
  }

  const isPumpFun = token.source === 'pump.fun';
  const killSwitchReasons = reasons.filter(r => r.startsWith('[KILL SWITCH]'));
  const normalReasons = reasons.filter(r => !r.startsWith('[KILL SWITCH]'));

  const bars = [
    { label: `Deployer (${isPumpFun ? '45' : '40'}%)`, value: breakdown.deployer ?? 50, color: 'text-gray-300' },
    { label: `Liquidity (${isPumpFun ? '30' : '25'}%)`, value: breakdown.liquidity ?? 50, color: 'text-gray-300' },
    { label: `Authority (${isPumpFun ? '0' : '15'}%)`, value: breakdown.authority ?? 50, color: 'text-gray-300' },
    { label: `Concentration (${isPumpFun ? '15' : '10'}%)`, value: breakdown.concentration ?? 50, color: 'text-gray-300' },
    { label: 'Token Age (10%)', value: breakdown.age ?? 50, color: 'text-gray-300' },
  ];

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-black/20">
      <div className="space-y-6">
        {/* Kill Switch Flags */}
        {killSwitchReasons.length > 0 && (
          <div className="border border-cyber-red/50 bg-cyber-red/5 p-4 relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-10"></div>
            <div className="text-xs font-bold text-cyber-red mb-2 uppercase tracking-widest blink">⚠️ KILL SWITCH ACTIVATED</div>
            {killSwitchReasons.map((r, i) => (
              <div key={i} className="text-xs text-red-300 font-mono border-l-2 border-cyber-red pl-2 mb-1">
                {r.replace('[KILL SWITCH] ', '')}
              </div>
            ))}
          </div>
        )}

        {/* Risk Breakdown Bars */}
        <div>
          <div className="text-xs font-bold text-cyber-blue mb-4 uppercase tracking-widest border-b border-cyber-blue/20 pb-1">
            Risk Vector Analysis
          </div>
          <div className="space-y-3">
            {bars.map(b => (
              <RiskBar key={b.label} label={b.label} value={b.value} color={b.color} />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Risk Reasons with Doc Links */}
        {normalReasons.length > 0 && (
          <div>
            <div className="text-xs font-bold text-cyber-blue mb-4 uppercase tracking-widest border-b border-cyber-blue/20 pb-1">
              Detected Anomalies
            </div>
            <ul className="space-y-3">
              {normalReasons.map((r: string, i: number) => {
                const docLink = getDocLink(r);
                return (
                  <li key={i} className="text-xs text-gray-400 font-mono">
                    <div className="flex items-start gap-3">
                      <span className="text-cyber-red mt-0.5">›</span>
                      <div className="flex-1">
                        <span className="text-gray-300">{r}</span>
                        {docLink && (
                          <div className="mt-1 pl-2 border-l border-gray-700">
                            <span className="text-[10px] text-gray-500 block italic mb-1">{docLink.snippet}</span>
                            <a href={docLink.url} target="_blank" rel="noreferrer" className="text-[10px] text-cyber-blue hover:text-white underline decoration-cyber-blue/50">
                              [READ_DOCS]
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800">
          {token.deployer && token.deployer !== 'unknown' && (
            <a
              href={`/deployer/${token.deployer}`}
              className="px-3 py-1 bg-cyber-yellow/10 border border-cyber-yellow/50 text-cyber-yellow text-[10px] hover:bg-cyber-yellow/20 transition uppercase tracking-wider"
            >
              View Deployer Profile
            </a>
          )}
          <a href={`https://rugcheck.xyz/tokens/${token.mint}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-[10px] hover:border-gray-500 transition uppercase tracking-wider">
            RugCheck
          </a>
          <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-[10px] hover:border-gray-500 transition uppercase tracking-wider">
            Solscan
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(token.mint)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 text-[10px] hover:border-gray-500 transition uppercase tracking-wider"
          >
            Copy Mint
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Token Card (mobile layout) ---
function TokenCard({ token, expanded, onToggle, isNew }: { token: Token; expanded: boolean; onToggle: () => void; isNew?: boolean }) {
  return (
    <div className={`glass-panel overflow-hidden transition-all relative ${isNew ? 'ring-1 ring-cyber-green/50 bg-cyber-green/5' : ''
      }`}>
      {isNew && <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyber-green text-cyber-black text-[10px] font-bold">NEW_SIGNAL</div>}
      <div
        className="p-4 cursor-pointer hover:bg-white/5 transition"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyber-black rounded flex items-center justify-center border border-cyber-gray text-xs font-mono text-gray-500">
              {token.symbol?.slice(0, 2) || '??'}
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-wide">{token.name || 'Unknown'}</div>
              <div className="text-[10px] text-cyber-blue font-mono">${token.symbol || '???'}</div>
            </div>
          </div>
          <RiskBadge status={token.status} score={token.risk_score} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-mono mb-2">
          <div>
            <span className="text-gray-600 block">MINT:</span>
            <span className="text-gray-400">{token.mint.slice(0, 4)}...{token.mint.slice(-4)}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-600 block">TIME:</span>
            <span className="text-gray-400">{new Date(token.created_at).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] border ${token.lp_locked ? 'border-cyber-green text-cyber-green' : 'border-cyber-red text-cyber-red'}`}>
            {token.lp_locked ? 'LP:LOCKED' : 'LP:UNLOCKED'}
          </span>
          <span className={`px-1.5 py-0.5 text-[10px] border ${token.mint_authority_revoked ? 'border-cyber-green text-cyber-green' : 'border-cyber-yellow text-cyber-yellow'}`}>
            {token.mint_authority_revoked ? 'MINT:REVOKED' : 'MINT:ACTIVE'}
          </span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-cyber-gray/50">
          <TokenDetail token={token} />
        </div>
      )}
    </div>
  );
}

// --- Token Row (desktop table) ---
function TokenRow({ token, expanded, onToggle, isNew }: { token: Token; expanded: boolean; onToggle: () => void; isNew?: boolean }) {
  const shortMint = `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`;
  const shortDeployer = token.deployer ? `${token.deployer.slice(0, 4)}...${token.deployer.slice(-4)}` : 'UNKNOWN';

  return (
    <>
      <tr
        className={`border-b border-cyber-gray/30 hover:bg-cyber-blue/5 cursor-pointer transition-colors font-mono text-xs ${isNew ? 'bg-cyber-green/5' : ''
          }`}
        onClick={onToggle}
      >
        <td className="px-4 py-4 relative group">
          {isNew && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-green animate-pulse" />}
          <RiskBadge status={token.status} score={token.risk_score} />
        </td>
        <td className="px-4 py-4">
          <div className="font-bold text-white tracking-wide">{token.name || 'Unknown'}</div>
        </td>
        <td className="px-4 py-4 text-cyber-blue/80">${token.symbol || '???'}</td>
        <td className="px-4 py-4 text-gray-500 opacity-70 group-hover:opacity-100">{shortMint}</td>
        <td className="px-4 py-4">
          {token.deployer && token.deployer !== 'unknown' ? (
            <a
              href={`/deployer/${token.deployer}`}
              onClick={(e) => e.stopPropagation()}
              className="text-cyber-blue hover:text-white transition underline decoration-cyber-blue/30"
            >
              {shortDeployer}
            </a>
          ) : (
            <span className="text-gray-600">{shortDeployer}</span>
          )}
        </td>
        <td className="px-4 py-4 text-center">
          <span className={token.lp_locked ? 'text-cyber-green' : 'text-cyber-red'}>
            {token.lp_locked ? 'YES' : 'NO'}
          </span>
        </td>
        <td className="px-4 py-4 text-center">
          <span className={token.mint_authority_revoked ? 'text-cyber-green' : 'text-cyber-yellow'}>
            {token.mint_authority_revoked ? 'REVOKED' : 'ACTIVE'}
          </span>
        </td>
        <td className="px-4 py-4 text-gray-500">
          {new Date(token.created_at).toLocaleTimeString()}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-cyber-black/50">
          <td colSpan={8} className="p-0 border-b border-cyber-gray/50 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-blue" />
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
  const [newMints, setNewMints] = useState<Set<string>>(new Set());
  const knownMintsRef = useRef<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const res = await fetch('/api/tokens');
      const data = await res.json();
      const incoming: Token[] = data.tokens || [];

      // Detect newly arrived tokens (not in previous fetch)
      if (knownMintsRef.current.size > 0) {
        const fresh = incoming
          .filter(t => !knownMintsRef.current.has(t.mint))
          .map(t => t.mint);
        if (fresh.length > 0) {
          setNewMints(new Set(fresh));
          // Clear highlight after animation duration
          setTimeout(() => setNewMints(new Set()), 2500);
        }
      }

      // Update known mints
      knownMintsRef.current = new Set(incoming.map(t => t.mint));

      setTokens(incoming);
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
    const interval = setInterval(fetchData, 15000); // Poll every 15s for live feel
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
      {/* Network Header with Matrix Effect */}
      <div className="mb-8 relative border-b border-cyber-blue/20 pb-6">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase glitch" data-text="System Monitor">
          SYSTEM_MONITOR <span className="text-cyber-blue">::</span> LIVE_FEED
        </h1>
        <p className="text-sm text-cyber-blue/60 font-mono">
          {'>>'} UPLINK_ESTABLISHED: MONITORING PUMPFUN_NETWORK PROTOCOLS...
        </p>
        {lastUpdate && (
          <div className="text-[10px] text-gray-500 mt-2 font-mono uppercase">
            SYNC_TIMESTAMP: <span className="text-white">{lastUpdate}</span> <span className="mx-2 text-cyber-blue/30">|</span> REFRESH_RATE: 15000ms
          </div>
        )}
      </div>

      {/* Scanner Status */}
      <ScannerStatus />

      {/* Search */}
      <SearchBar />

      {/* Stats + Chart */}
      {stats && (
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Donut Chart with Glass Effect */}
          <div className="glass-panel p-6 w-full md:w-64 h-64 shrink-0 flex items-center justify-center relative rounded-sm">
            <div className="absolute inset-0 border border-cyber-blue/10 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-cyber-blue" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-cyber-blue" />
            <RiskChart stats={stats} />
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div className="bg-cyber-red/5 border border-cyber-red/30 p-5 relative overflow-hidden group hover:bg-cyber-red/10 transition-colors">
              <div className="text-[10px] text-cyber-red uppercase tracking-widest mb-2 font-bold">Critical Threats</div>
              <div className="text-4xl font-mono text-white tracking-tighter">{stats.red}</div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-cyber-red/20 blur-xl rounded-full" />
            </div>

            <div className="bg-cyber-yellow/5 border border-cyber-yellow/30 p-5 relative overflow-hidden group hover:bg-cyber-yellow/10 transition-colors">
              <div className="text-[10px] text-cyber-yellow uppercase tracking-widest mb-2 font-bold">Warnings</div>
              <div className="text-4xl font-mono text-white tracking-tighter">{stats.yellow}</div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-cyber-yellow/20 blur-xl rounded-full" />
            </div>

            <div className="bg-cyber-green/5 border border-cyber-green/30 p-5 relative overflow-hidden group hover:bg-cyber-green/10 transition-colors">
              <div className="text-[10px] text-cyber-green uppercase tracking-widest mb-2 font-bold">Secure Assets</div>
              <div className="text-4xl font-mono text-white tracking-tighter">{stats.green}</div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-cyber-green/20 blur-xl rounded-full" />
            </div>

            <div className="bg-cyber-blue/5 border border-cyber-blue/30 p-5 relative overflow-hidden group hover:bg-cyber-blue/10 transition-colors">
              <div className="text-[10px] text-cyber-blue uppercase tracking-widest mb-2 font-bold">Network Score</div>
              <div className="text-4xl font-mono text-white tracking-tighter">{stats.avgScore}</div>
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-cyber-blue/20 blur-xl rounded-full" />
            </div>
          </div>
        </div>
      )}

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
        <div className="py-8">
          <MatrixLoader />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTokens.length === 0 && (
        <div className="text-center py-16 text-gray-500 border border-dashed border-gray-800 font-mono text-xs uppercase tracking-widest bg-black/20">
          {tokens.length === 0
            ? '>> SYSTEM_IDLE: WAITING FOR INCOMING DATA STREAMS...'
            : `>> QUERY_RESULT: 0 RECORDS FOUND FOR FILTER [${filter}]`}
        </div>
      )}

      {/* Mobile: Card Layout */}
      {!loading && filteredTokens.length > 0 && (
        <div className="md:hidden space-y-4">
          {filteredTokens.map(token => (
            <TokenCard
              key={token.mint}
              token={token}
              expanded={expandedMint === token.mint}
              onToggle={() => setExpandedMint(expandedMint === token.mint ? null : token.mint)}
              isNew={newMints.has(token.mint)}
            />
          ))}
        </div>
      )}

      {/* Desktop: Table Layout */}
      {!loading && filteredTokens.length > 0 && (
        <div className="hidden md:block border border-cyber-gray/50 bg-cyber-gray/20">
          {/* Table Header */}
          <div className="grid grid-cols-[100px_1fr_100px_150px_120px_80px_100px_120px] gap-0 border-b border-cyber-gray bg-cyber-black text-[10px] text-cyber-blue uppercase tracking-widest font-bold py-3">
            <div className="px-4">Status</div>
            <div className="px-4">Asset Name</div>
            <div className="px-4">Symbol</div>
            <div className="px-4">Address</div>
            <div className="px-4">Deployer</div>
            <div className="px-4 text-center">LP Lock</div>
            <div className="px-4 text-center">Authority</div>
            <div className="px-4">Detected</div>
          </div>
          <div className="w-full">
            <table className="w-full">
              <tbody className="divide-y divide-cyber-gray/30">
                {filteredTokens.map(token => (
                  <TokenRow
                    key={token.mint}
                    token={token}
                    expanded={expandedMint === token.mint}
                    onToggle={() => setExpandedMint(expandedMint === token.mint ? null : token.mint)}
                    isNew={newMints.has(token.mint)}
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
