import { calculateRisk } from './risk-engine';
import { RugCheckReport, RugCheckSummary } from './rugcheck';

describe('calculateRisk', () => {
  it('should return GREEN when mintAuthority is null and score is above 60', () => {
    const report: RugCheckReport = {
      mint: 'TestMint111111111111111111111111111111111111',
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      creator: 'Creator1111111111111111111111111111111111111',
      creatorBalance: 1000,
      token: {
        mintAuthority: null,
        supply: 1_000_000_000,
        decimals: 9,
        isInitialized: true,
        freezeAuthority: null,
      },
      tokenMeta: {
        name: 'TestToken',
        symbol: 'TEST',
        uri: 'https://example.com/meta.json',
        mutable: false,
        updateAuthority: 'Creator1111111111111111111111111111111111111',
      },
      risks: [],
      score: 1000,
      score_normalised: 0,
      fileMeta: {
        description: 'A test token',
        name: 'TestToken',
        symbol: 'TEST',
        image: 'https://example.com/image.png',
      },
    };

    const summary: RugCheckSummary = {
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      tokenType: 'spl-token',
      risks: [],
      score: 1000,
      score_normalised: 0,
      lpLockedPct: 95,
    };

    const result = calculateRisk(report, summary, 0, 5, 2592000); // 30 days old

    expect(result.score).toBeGreaterThan(60);
    expect(result.status).toBe('GREEN');
  });
});
