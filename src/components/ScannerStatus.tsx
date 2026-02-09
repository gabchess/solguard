'use client';

import { useEffect, useState } from 'react';

type ScannerStatusData = {
  connected: boolean;
  tokensToday: number;
  lastScan: string | null;
};

export default function ScannerStatus() {
  const [status, setStatus] = useState<ScannerStatusData>({
    connected: false,
    tokensToday: 0,
    lastScan: null,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch scanner status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Update status every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Connection Status */}
      <div className="relative overflow-hidden bg-cyber-gray/80 border border-cyber-blue/30 p-4 group hover:border-cyber-blue/60 transition-colors">
        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-cyber-blue rounded-full animate-blink"></div>
        </div>
        <div className="text-[10px] text-cyber-blue uppercase tracking-widest mb-1">Network Uplink</div>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-sm ${status.connected ? 'bg-cyber-green shadow-[0_0_10px_#00ff88]' : 'bg-cyber-red shadow-[0_0_10px_#ff2d2d]'}`} />
          <span className={`text-xl font-bold tracking-tight ${status.connected ? 'text-white' : 'text-cyber-red'}`}>
            {status.connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Scanned Count */}
      <div className="relative overflow-hidden bg-cyber-gray/80 border border-cyber-blue/30 p-4 group hover:border-cyber-blue/60 transition-colors">
        <div className="text-[10px] text-cyber-blue uppercase tracking-widest mb-1">Targets Scanned (24h)</div>
        <div className="text-2xl font-bold text-white font-mono">
          {status.tokensToday.toString().padStart(6, '0')}
        </div>
        <div className="absolute bottom-0 right-0 h-10 w-20 bg-gradient-to-t from-cyber-blue/10 to-transparent"></div>
      </div>

      {/* Last Update */}
      <div className="relative overflow-hidden bg-cyber-gray/80 border border-cyber-blue/30 p-4 group hover:border-cyber-blue/60 transition-colors">
        <div className="text-[10px] text-cyber-blue uppercase tracking-widest mb-1">Last Heartbeat</div>
        <div className="text-lg font-mono text-gray-400">
          {status.lastScan ? new Date(status.lastScan).toLocaleTimeString() : '--:--:--'}
        </div>
      </div>
    </div>
  );
}
