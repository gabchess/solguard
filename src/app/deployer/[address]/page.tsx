'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Token, TokenStats } from '@/types';
import MatrixLoader from '@/components/MatrixLoader';

type ThreatLevel = 'SERIAL_RUGGER' | 'SUSPICIOUS' | 'CLEAN';

function getThreatLevel(redCount: number): ThreatLevel {
  if (redCount >= 3) return 'SERIAL_RUGGER';
  if (redCount >= 1) return 'SUSPICIOUS';
  return 'CLEAN';
}

const threatConfig = {
  SERIAL_RUGGER: {
    label: 'SERIAL_RUGGER',
    bg: 'bg-cyber-red/10',
    border: 'border-cyber-red/50',
    text: 'text-cyber-red',
    badgeBg: 'bg-cyber-red/20',
    badgeBorder: 'border-cyber-red',
    badgeText: 'text-white',
    icon: '☠️',
    glow: 'shadow-[0_0_20px_rgba(255,45,45,0.3)]',
    description: 'TARGET_IDENTIFIED: REPEATOFFENDER. MULTIPLE HIGH-RISK DEPLOYMENTS DETECTED.',
  },
  SUSPICIOUS: {
    label: 'SUSPICIOUS',
    bg: 'bg-cyber-yellow/10',
    border: 'border-cyber-yellow/50',
    text: 'text-cyber-yellow',
    badgeBg: 'bg-cyber-yellow/20',
    badgeBorder: 'border-cyber-yellow',
    badgeText: 'text-white',
    icon: '⚠️',
    glow: 'shadow-[0_0_20px_rgba(255,184,0,0.3)]',
    description: 'CAUTION: ANOMALOUS ACTIVITY DETECTED IN DEPLOYMENT HISTORY.',
  },
  CLEAN: {
    label: 'CLEAN',
    bg: 'bg-cyber-green/10',
    border: 'border-cyber-green/50',
    text: 'text-cyber-green',
    badgeBg: 'bg-cyber-green/20',
    badgeBorder: 'border-cyber-green',
    badgeText: 'text-white',
    icon: '✅',
    glow: 'shadow-[0_0_20px_rgba(0,255,136,0.2)]',
    description: 'NO SEARCHABLE THREAT VECTORS FOUND IN CURRENT DATABASE.',
  },
};

function RiskBadge({ status, score }: { status: string; score: number }) {
  const colors: Record<string, string> = {
    RED: 'text-cyber-red border-cyber-red shadow-[0_0_5px_rgba(255,45,45,0.4)]',
    YELLOW: 'text-cyber-yellow border-cyber-yellow shadow-[0_0_5px_rgba(255,184,0,0.4)]',
    GREEN: 'text-cyber-green border-cyber-green shadow-[0_0_5px_rgba(0,255,136,0.4)]',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded border ${colors[status] || colors.YELLOW} text-[10px] font-mono tracking-wider bg-black/40`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'RED' ? 'bg-cyber-red animate-pulse' : status === 'GREEN' ? 'bg-cyber-green' : 'bg-cyber-yellow'}`} />
      RISK:{score}
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
        // Sort by date desc
        const sortedTokens = (data.tokens || []).sort((a: Token, b: Token) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTokens(sortedTokens);
        setStats(data.stats || null);
      } catch {
        setError('UPLINK_FAILED: NETWORK_ERROR');
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
      <div className="py-24">
        <MatrixLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-cyber-red/10 border border-cyber-red/50 rounded-sm p-6 text-center shadow-[0_0_20px_rgba(255,45,45,0.1)]">
          <div className="text-cyber-red text-xl font-bold mb-2 uppercase tracking-widest glitch">SYSTEM ERROR</div>
          <div className="text-gray-400 text-sm font-mono mb-4">{">>"} {error}</div>
          <a href="/" className="inline-block px-4 py-2 bg-cyber-red/20 text-cyber-red border border-cyber-red hover:bg-cyber-red hover:text-black transition uppercase text-xs font-bold tracking-widest">
            Return to Base
          </a>
        </div>
      </div>
    );
  }

  const threat = getThreatLevel(stats?.red ?? 0);
  const config = threatConfig[threat];
  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <a href="/" className="inline-flex items-center gap-2 text-xs text-cyber-blue hover:text-white transition mb-8 font-mono tracking-widest uppercase">
        <span>{'<<'}</span> RETURN_TO_DASHBOARD
      </a>

      {/* Profile Header */}
      <div className={`relative overflow-hidden ${config.bg} border-2 ${config.border} p-8 mb-8 ${config.glow}`}>
        <div className="absolute top-0 right-0 p-4 opacity-50">
          <div className="text-[100px] leading-none opacity-10 grayscale">{config.icon}</div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold">Target Identity</div>
            <div className="flex items-center gap-4 mb-2">
              <span className="font-mono text-2xl md:text-3xl text-white tracking-tight">{shortAddr}</span>
              <button
                onClick={copyAddress}
                className="text-[10px] px-2 py-1 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue hover:text-black uppercase tracking-wider transition"
              >
                {copied ? 'COPIED' : 'COPY_ADDR'}
              </button>
            </div>
            <div className="font-mono text-[10px] text-gray-500 break-all max-w-md">
              ID: {address}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className={`inline-flex items-center gap-3 px-4 py-2 border-2 ${config.badgeBg} ${config.badgeBorder} mb-2 shadow-lg`}>
              <span className="text-xl animate-pulse">{config.icon}</span>
              <span className={`text-lg font-black tracking-widest uppercase ${config.badgeText} glitch`}>{config.label}</span>
            </div>
            <p className={`text-[10px] uppercase font-mono tracking-normal text-right max-w-xs ${threat === 'CLEAN' ? 'text-cyber-green' : config.text}`}>
              {config.description}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/5">
            <div className="bg-black/40 border border-white/10 p-3 text-center group hover:border-white/30 transition">
              <div className="text-2xl font-mono text-white group-hover:text-cyber-blue">{stats.total}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Deployments</div>
            </div>
            <div className="bg-black/40 border border-cyber-red/20 p-3 text-center group hover:border-cyber-red/50 transition">
              <div className={`text-2xl font-mono ${stats.red > 0 ? 'text-cyber-red' : 'text-gray-600'}`}>{stats.red}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Critical</div>
            </div>
            <div className="bg-black/40 border border-cyber-yellow/20 p-3 text-center group hover:border-cyber-yellow/50 transition">
              <div className={`text-2xl font-mono ${stats.yellow > 0 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{stats.yellow}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Warnings</div>
            </div>
            <div className="bg-black/40 border border-cyber-green/20 p-3 text-center group hover:border-cyber-green/50 transition">
              <div className={`text-2xl font-mono ${stats.green > 0 ? 'text-cyber-green' : 'text-gray-600'}`}>{stats.green}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Clean</div>
            </div>
            <div className="bg-black/40 border border-cyber-blue/20 p-3 text-center group hover:border-cyber-blue/50 transition">
              <div className={`text-2xl font-mono ${stats.avgScore <= 30 ? 'text-cyber-red' : stats.avgScore <= 60 ? 'text-cyber-yellow' : 'text-cyber-green'
                }`}>{stats.avgScore}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Trust Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Token Timeline */}
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">
          <span className="text-cyber-blue">H</span>istory_Log
        </h2>
        <span className="text-xs font-mono text-gray-500">[{tokens.length} RECORDS FOUND]</span>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-16 text-gray-500 border border-dashed border-gray-800 font-mono bg-black/20">
          {">>"} NULL_RESULT: NO DEPLOYMENT HISTORY FOUND.
        </div>
      ) : (
        <div className="relative pl-8 border-l border-cyber-gray/30 space-y-8">
          {tokens.map((token, index) => {
            let reasons: string[] = [];
            try { reasons = JSON.parse(token.risk_reasons || '[]'); } catch { }

            const isRed = token.status === 'RED';
            const statusColor = isRed ? 'bg-cyber-red' : token.status === 'YELLOW' ? 'bg-cyber-yellow' : 'bg-cyber-green';

            return (
              <div key={token.mint} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[37px] top-6 w-4 h-4 rounded-full ${statusColor} border-4 border-cyber-black shadow-[0_0_10px_currentColor] z-10`} />

                {/* Connector Line (if not last) */}
                {index !== tokens.length - 1 && (
                  <div className="absolute -left-[30px] top-8 bottom-[-40px] w-px bg-cyber-gray/30" />
                )}

                <div className={`glass-panel p-5 relative group transition-all duration-300 ${isRed ? 'border-cyber-red/30 hover:border-cyber-red/60' : 'hover:border-cyber-blue/40'}`}>
                  {isRed && <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-red/10 blur-xl rounded-full -z-10" />}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-black border border-white/10 flex items-center justify-center font-mono text-xs text-gray-500">
                        {token.symbol?.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white tracking-wide text-lg">{token.name || 'UNKNOWN'}</span>
                          <span className="text-xs text-cyber-blue font-mono">${token.symbol || '???'}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          {new Date(token.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <RiskBadge status={token.status} score={token.risk_score} />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono text-gray-500 border-t border-white/5 pt-4 mb-4">
                    <div>
                      <span className="block text-gray-700 mb-1">MINT_ADDR</span>
                      <span className="text-gray-400">{token.mint.slice(0, 8)}...</span>
                    </div>
                    <div>
                      <span className="block text-gray-700 mb-1">LIQUIDITY</span>
                      <span className={token.lp_locked ? 'text-cyber-green' : 'text-cyber-red'}>{token.lp_locked ? 'LOCKED' : 'UNLOCKED'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-700 mb-1">AUTHORITY</span>
                      <span className={token.mint_authority_revoked ? 'text-cyber-green' : 'text-cyber-yellow'}>{token.mint_authority_revoked ? 'REVOKED' : 'active'}</span>
                    </div>
                  </div>

                  {/* Risk flags for RED tokens */}
                  {isRed && reasons.length > 0 && (
                    <div className="bg-cyber-red/5 border-l-2 border-cyber-red pl-3 py-2 my-4">
                      <div className="text-[10px] text-cyber-red font-bold uppercase tracking-widest mb-1">Detected Threats</div>
                      <ul className="space-y-1">
                        {reasons.slice(0, 3).map((r, i) => (
                          <li key={i} className="text-xs text-red-300/80 font-mono">
                            » {r}
                          </li>
                        ))}
                        {reasons.length > 3 && (
                          <li className="text-[10px] text-red-500 italic uppercase">
                            + {reasons.length - 3} additional vectors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex gap-4 pt-2">
                    <a
                      href={`https://rugcheck.xyz/tokens/${token.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyber-blue hover:text-white transition uppercase tracking-widest"
                    >
                      [RugCheck]
                    </a>
                    <a
                      href={`https://solscan.io/token/${token.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyber-blue hover:text-white transition uppercase tracking-widest"
                    >
                      [Solscan]
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
