'use client';

import { useEffect, useState } from 'react';

interface ScannerState {
  connected: boolean;
  tokensToday: number;
  lastScan: string | null;
}

export default function ScannerStatus() {
  const [status, setStatus] = useState<ScannerState | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/scanner/status');
        const data = await res.json();
        setStatus(data);
      } catch {
        setStatus({ connected: false, tokensToday: 0, lastScan: null });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const lastScanText = status.lastScan
    ? new Date(status.lastScan).toLocaleTimeString()
    : 'Waiting...';

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-900/80 border border-gray-800 rounded-xl mb-6">
      {/* Connection indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {status.connected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500" />
          )}
        </span>
        <span className={`text-sm font-medium ${status.connected ? 'text-green-400' : 'text-gray-500'}`}>
          {status.connected ? 'Monitoring pump.fun' : 'Scanner offline'}
        </span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-4 bg-gray-700" />

      {/* Tokens scanned today */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="font-mono font-bold text-white">{status.tokensToday}</span>
        <span>tokens scanned today</span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-4 bg-gray-700" />

      {/* Last scan */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Last scan: {lastScanText}</span>
      </div>
    </div>
  );
}
