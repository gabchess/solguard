export default function Roadmap() {
  const shipped = [
    { name: 'Live Token Dashboard', desc: 'Real-time feed of Solana tokens with risk scores', status: 'shipped' },
    { name: 'Risk Scoring Engine', desc: 'Weighted analysis: deployer history, LP, authorities, concentration, token age', status: 'shipped' },
    { name: 'RugCheck Integration', desc: 'Pull risk data from RugCheck API for every token', status: 'shipped' },
    { name: 'Color-Coded Risk Badges', desc: 'RED / YELLOW / GREEN instant visual risk assessment', status: 'shipped' },
    { name: 'WOW1: Scan Any Token', desc: 'Paste any Solana token mint address and get an instant risk breakdown', status: 'shipped' },
    { name: 'WOW2: Risk Distribution Chart', desc: 'Donut chart showing RED/YELLOW/GREEN distribution across all tracked tokens', status: 'shipped' },
    { name: 'WOW3: Serial Rugger Profiles', desc: 'Deployer wallet investigation pages with history, badges, and full token timeline', status: 'shipped' },
    { name: 'WOW5: Live Auto-Scan Mode', desc: 'Real-time pump.fun WebSocket scanner with live dashboard status and green-flash alerts', status: 'shipped' },
    { name: 'Autonomous X Alerts', desc: 'Post critical risk warnings to X/Twitter automatically when RED tokens are detected', status: 'shipped' },
    { name: 'Solana Docs Integration', desc: 'Learn More links to official Solana docs explaining each risk flag', status: 'shipped' },
  ];

  const building = [
    { name: 'Wallet Fund-Flow Graph', desc: 'Visualize where deployer funds came from and where rug proceeds went', status: 'building' },
    { name: 'Telegram/Discord Alerts', desc: 'Push RED alerts to Telegram and Discord for instant notifications', status: 'building' },
  ];

  const planned = [
    { name: 'Honeypot Detection', desc: 'Integrate existing honeypot simulators — detect tokens you can buy but not sell', status: 'planned' },
    { name: 'DeFi Protocol Monitoring', desc: 'Detect anomalous behavior in Solana DeFi protocols — potential hacks/exploits', status: 'planned' },
    { name: 'Deep Wallet Graph', desc: 'N-hop fund flow tracing with cluster detection across wallets', status: 'planned' },
    { name: 'Community Scoring', desc: 'Let users flag suspicious tokens — wisdom of the crowd with abuse safeguards', status: 'planned' },
    { name: 'Slow Drain Detection', desc: 'Catch ruggers who remove LP gradually instead of all at once', status: 'planned' },
    { name: 'Cross-Chain Tracking', desc: 'Track deployer wallets across Ethereum, BSC, Base — catch serial ruggers', status: 'planned' },
    { name: 'Code Similarity Engine', desc: 'Detect tokens deployed with near-identical code — link deployer rings', status: 'planned' },
    { name: 'SolGuard API', desc: 'Public API for wallets, DEXs, and tools to integrate risk scores', status: 'planned' },
    { name: 'Telegram/Discord Bot', desc: 'Real-time alerts in your group chats', status: 'planned' },
    { name: 'Portfolio Risk Scanner', desc: 'Connect wallet → see risk scores for all your holdings', status: 'planned' },
  ];

  const statusColors = {
    shipped: 'bg-green-500/20 text-green-400 border-green-500/30',
    building: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    planned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const statusLabels = {
    shipped: '✅ Shipped',
    building: '🔨 Building',
    planned: '📋 Planned',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Roadmap</h1>
        <p className="text-gray-400">
          SolGuard is being built in the open. Here&apos;s what&apos;s shipped, what&apos;s next, and where we&apos;re headed.
        </p>
      </div>

      {/* Shipped */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
          <span>✅</span> Shipped
        </h2>
        <div className="grid gap-3">
          {shipped.map((item) => (
            <div key={item.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-sm text-gray-400 mt-1">{item.desc}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColors[item.status as keyof typeof statusColors]}`}>
                {statusLabels[item.status as keyof typeof statusLabels]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Building */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
          <span>🔨</span> Building Now
        </h2>
        <div className="grid gap-3">
          {building.map((item) => (
            <div key={item.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-sm text-gray-400 mt-1">{item.desc}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColors[item.status as keyof typeof statusColors]}`}>
                {statusLabels[item.status as keyof typeof statusLabels]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Planned */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <span>📋</span> Planned
        </h2>
        <div className="grid gap-3">
          {planned.map((item) => (
            <div key={item.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex items-start justify-between">
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-sm text-gray-400 mt-1">{item.desc}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColors[item.status as keyof typeof statusColors]}`}>
                {statusLabels[item.status as keyof typeof statusLabels]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* The Vision */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mt-8">
        <h2 className="text-lg font-semibold text-white mb-3">The Vision</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          zachxbt investigates <strong className="text-white">after</strong> scams happen.
          samczsun responds <strong className="text-white">during</strong> exploits.
          SolGuard warns <strong className="text-red-400">before</strong> users get rugged.
        </p>
        <p className="text-gray-400 text-sm leading-relaxed mt-3">
          98.6% of pump.fun tokens are rug pulls. Existing tools make you check manually.
          SolGuard monitors autonomously, scores risk in real-time, and alerts when it matters.
          One day, no one should lose money to an obvious scam.
        </p>
      </div>
    </div>
  );
}
