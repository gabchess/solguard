'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Token, TokenStats } from '@/types';

type ThreatLevel = 'SERIAL_RUGGER' | 'SUSPICIOUS' | 'CLEAN';

function getThreatLevel(redCount: number): ThreatLevel {
  if (redCount >= 3) return 'SERIAL_RUGGER';
  if (redCount >= 1) return 'SUSPICIOUS';
  return 'CLEAN';
}

const threatConfig = {
  SERIAL_RUGGER: {
    label: 'Serial Rugger',
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-400',
    badgeBg: 'bg-red-500/20',
    badgeBorder: 'border-red-500/50',
    badgeText: 'text-red-300',
    icon: '🚨',
    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.15)]',
    description: 'This deployer has launched multiple tokens that scored as high-risk rug pulls.',
  },
  SUSPICIOUS: {
    label: 'Suspicious',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20',
    badgeBorder: 'border-yellow-500/50',
    badgeText: 'text-yellow-300',
    icon: '⚠️',
    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.1)]',
    description: 'This deployer has launched tokens that raised risk flags.',
  },
  CLEAN: {
    label: 'Clean',
    bg: 'bg-green-500/5',
    border: 'border-green-500/20',
    text: 'text-green-400',
    badgeBg: 'bg-green-500/20',
    badgeBorder: 'border-green-500/50',
    badgeText: 'text-green-300',
    icon: '✅',
    glow: '',
    description: 'No high-risk tokens found from this deployer.',
  },
};

function RiskBadge({ status, score }: { status: string; score: number }) {
  const colors: Record<string, string> = {
    RED: 'bg-red-500/20 text-red-400 border-red-500/30',
    YELLOW: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    GREEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[status] || colors.YELLOW}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'RED' ? 'bg-red-500 animate-pulse' : status === 'GREEN' ? 'bg-green-500' : 'bg-yellow-500'}`} />
      {score}/100
    </span>
  );
}

export default function DeployerProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    (async () => {
      try {
        const res = await fetch(`/api/deployer/${address}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to load deployer data');
          return;
        }
        const data = await res.json();
        setTokens(data.tokens || []);
        setStats(data.stats || null);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <div className="text-red-400 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-400 text-sm">{error}</div>
          <a href="/" className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const threat = getThreatLevel(stats?.red ?? 0);
  const config = threatConfig[threat];
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <a href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition mb-6">
        ← Back to Dashboard
      </a>

      {/* Profile Header */}
      <div className={`${config.bg} border ${config.border} rounded-2xl p-6 md:p-8 mb-6 ${config.glow}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Deployer Wallet</div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg md:text-xl text-white">{shortAddr}</span>
              <button
                onClick={copyAddress}
                className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-xs text-gray-600 mt-1 hidden md:block break-all">
              {address}
            </div>
          </div>

          {/* Threat Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${config.badgeBg} ${config.badgeBorder}`}>
            <span className="text-lg">{config.icon}</span>
            <span className={`text-sm font-bold ${config.badgeText}`}>{config.label}</span>
          </div>
        </div>

        {/* Threat description */}
        <p className={`text-sm ${threat === 'CLEAN' ? 'text-gray-400' : config.text} mb-6`}>
          {config.description}
        </p>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Tokens</div>
            </div>
            <div className={`bg-gray-950/50 border ${stats.red > 0 ? 'border-red-500/30' : 'border-gray-800/50'} rounded-xl p-3`}>
              <div className={`text-2xl font-bold ${stats.red > 0 ? 'text-red-400' : 'text-gray-600'}`}>{stats.red}</div>
              <div className="text-xs text-gray-500 mt-0.5">High Risk</div>
            </div>
            <div className="bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
              <div className={`text-2xl font-bold ${stats.yellow > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{stats.yellow}</div>
              <div className="text-xs text-gray-500 mt-0.5">Medium Risk</div>
            </div>
            <div className="bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
              <div className={`text-2xl font-bold ${stats.green > 0 ? 'text-green-400' : 'text-gray-600'}`}>{stats.green}</div>
              <div className="text-xs text-gray-500 mt-0.5">Low Risk</div>
            </div>
            <div className="bg-gray-950/50 border border-gray-800/50 rounded-xl p-3">
              <div className={`text-2xl font-bold ${
                stats.avgScore <= 30 ? 'text-red-400' : stats.avgScore <= 60 ? 'text-yellow-400' : 'text-green-400'
              }`}>{stats.avgScore}</div>
              <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Risk Distribution Bar */}
      {stats && stats.total > 0 && (
        <div className="mb-6">
          <div className="text-xs text-gray-500 mb-2">Risk Distribution</div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
            {stats.red > 0 && (
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${(stats.red / stats.total) * 100}%` }}
                title={`${stats.red} HIGH RISK`}
              />
            )}
            {stats.yellow > 0 && (
              <div
                className="bg-yellow-500 transition-all duration-500"
                style={{ width: `${(stats.yellow / stats.total) * 100}%` }}
                title={`${stats.yellow} MEDIUM`}
              />
            )}
            {stats.green > 0 && (
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${(stats.green / stats.total) * 100}%` }}
                title={`${stats.green} LOW RISK`}
              />
            )}
          </div>
        </div>
      )}

      {/* Token Timeline */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white mb-1">Token Launch History</h2>
        <p className="text-xs text-gray-500">{tokens.length} token{tokens.length !== 1 ? 's' : ''} deployed by this wallet</p>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-900/50 border border-gray-800 rounded-xl">
          No tokens found for this deployer in our database.
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => {
            let reasons: string[] = [];
            try { reasons = JSON.parse(token.risk_reasons || '[]'); } catch {}

            const borderColor = token.status === 'RED'
              ? 'border-red-500/30 hover:border-red-500/50'
              : token.status === 'YELLOW'
              ? 'border-yellow-500/20 hover:border-yellow-500/40'
              : 'border-green-500/20 hover:border-green-500/40';

            const bgHover = token.status === 'RED'
              ? 'hover:bg-red-500/5'
              : 'hover:bg-gray-800/30';

            return (
              <div
                key={token.mint}
                className={`bg-gray-900/50 border ${borderColor} rounded-xl p-4 transition ${bgHover}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <RiskBadge status={token.status} score={token.risk_score} />
                    <div>
                      <span className="font-medium text-white text-sm">{token.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500 ml-2">${token.symbol || '???'}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(token.created_at).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="font-mono">{token.mint.slice(0, 8)}...{token.mint.slice(-4)}</span>
                  <div className="flex gap-3">
                    <span>LP: {token.lp_locked ? '✅' : '❌'}</span>
                    <span>Mint Auth: {token.mint_authority_revoked ? '✅' : '⚠️'}</span>
                  </div>
                </div>

                {/* Risk flags for RED tokens */}
                {token.status === 'RED' && reasons.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-800/50">
                    <ul className="space-y-1">
                      {reasons.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-red-400/80 flex items-start gap-1.5">
                          <span className="mt-0.5">●</span>
                          <span>{r}</span>
                        </li>
                      ))}
                      {reasons.length > 3 && (
                        <li className="text-xs text-gray-600">+{reasons.length - 3} more flags</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Links */}
                <div className="flex gap-3 mt-2 pt-2 border-t border-gray-800/50">
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
                  <button
                    onClick={() => navigator.clipboard.writeText(token.mint)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    Copy Mint
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* External links */}
      <div className="mt-8 pt-6 border-t border-gray-800 flex flex-wrap gap-4">
        <a
          href={`https://solscan.io/account/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          View on Solscan →
        </a>
        <a
          href={`https://rugcheck.xyz/wallets/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          View on RugCheck →
        </a>
      </div>
    </div>
  );
}
