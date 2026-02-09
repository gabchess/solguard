import { calculateRisk } from './risk-engine';
import { RugCheckReport, RugCheckSummary } from './rugcheck';

// --- Shared test fixtures ---

function makeReport(overrides?: Partial<RugCheckReport>): RugCheckReport {
  return {
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
    ...overrides,
  };
}

function makeSummary(overrides?: Partial<RugCheckSummary>): RugCheckSummary {
  return {
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    tokenType: 'spl-token',
    risks: [],
    score: 1000,
    score_normalised: 0,
    lpLockedPct: 95,
    ...overrides,
  };
}

describe('calculateRisk', () => {
  it('should return GREEN when mintAuthority is null and score is above 60', () => {
    const result = calculateRisk(makeReport(), makeSummary(), 0, 5, 2592000); // 30 days old

    expect(result.score).toBeGreaterThan(60);
    expect(result.status).toBe('GREEN');
    expect(result.killSwitchFlags).toEqual([]);
  });

  // --- pump.fun weight redistribution ---

  it('should score lower for pump.fun tokens by excluding authority weight', () => {
    const report = makeReport();
    const summary = makeSummary();

    const defaultResult = calculateRisk(report, summary, 0, 5, 2592000, 'unknown');
    const pumpResult = calculateRisk(report, summary, 0, 5, 2592000, 'pump.fun');

    // Authority is 100 for this token (all revoked, immutable).
    // With default weights authority adds 100*0.15=15 points.
    // With pump.fun weights authority adds 0 points.
    // So pump.fun score should be lower.
    expect(pumpResult.score).toBeLessThan(defaultResult.score);
  });

  it('should preserve default weights for non-pump.fun tokens', () => {
    const result = calculateRisk(makeReport(), makeSummary(), 0, 5, 2592000, 'unknown');

    // deployer=85 (60+5*5), liquidity=95, authority=100, concentration=70, age=80
    // 85*0.40 + 95*0.25 + 100*0.15 + 70*0.10 + 80*0.10 = 34+23.75+15+7+8 = 88
    expect(result.score).toBeGreaterThan(80);
    expect(result.status).toBe('GREEN');
  });

  // --- Kill switch: DEPLOYER_SERIAL_RUGGER ---

  it('should force RED when deployer has 2+ previous rugs', () => {
    const result = calculateRisk(makeReport(), makeSummary(), 2, 5, 2592000, 'pump.fun');

    expect(result.status).toBe('RED');
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.killSwitchFlags).toContain('DEPLOYER_SERIAL_RUGGER');
  });

  // --- Kill switch: LP_UNLOCKED ---

  it('should force RED when LP is less than 5% locked', () => {
    const summary = makeSummary({ lpLockedPct: 2 });
    const result = calculateRisk(makeReport(), summary, 0, 5, 2592000, 'pump.fun');

    expect(result.status).toBe('RED');
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.killSwitchFlags).toContain('LP_UNLOCKED');
  });

  // --- Kill switch: CONCENTRATION_EXTREME ---

  it('should force RED when 3+ concentration risks are detected', () => {
    const report = makeReport({
      risks: [
        { name: 'Top holder owns 50%', value: '50', description: 'Single holder owns majority', score: 100, level: 'danger' },
        { name: 'Supply concentration', value: '80', description: 'Supply is heavily concentrated', score: 100, level: 'danger' },
        { name: 'Single wallet dominance', value: '45', description: 'One wallet dominates', score: 100, level: 'danger' },
      ],
    });
    const result = calculateRisk(report, makeSummary(), 0, 5, 2592000, 'pump.fun');

    expect(result.status).toBe('RED');
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.killSwitchFlags).toContain('CONCENTRATION_EXTREME');
  });
});
