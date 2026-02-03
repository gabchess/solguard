const axios = require('axios');

const BASE_URL = 'https://api.rugcheck.xyz';

async function test() {
  // Test with BONK token
  const mint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  
  console.log('Testing RugCheck API...\n');
  
  // Summary endpoint
  try {
    const { data: summary } = await axios.get(`${BASE_URL}/v1/tokens/${mint}/report/summary`);
    console.log('✅ Summary endpoint works');
    console.log(`   Score: ${summary.score} (normalized: ${summary.score_normalised})`);
    console.log(`   LP Locked: ${summary.lpLockedPct.toFixed(2)}%`);
    console.log(`   Risks: ${summary.risks.length}`);
    summary.risks.forEach(r => console.log(`     - [${r.level}] ${r.name}: ${r.description}`));
  } catch (e) {
    console.log('❌ Summary endpoint failed:', e.response?.status || e.message);
  }

  console.log('');

  // Full report endpoint
  try {
    const { data: report } = await axios.get(`${BASE_URL}/v1/tokens/${mint}/report`);
    console.log('✅ Full report endpoint works');
    console.log(`   Creator: ${report.creator}`);
    console.log(`   Mint Authority: ${report.token.mintAuthority || 'revoked'}`);
    console.log(`   Freeze Authority: ${report.token.freezeAuthority || 'none'}`);
    console.log(`   Mutable metadata: ${report.tokenMeta.mutable}`);
    console.log(`   Name: ${report.fileMeta.name} (${report.fileMeta.symbol})`);
  } catch (e) {
    console.log('❌ Full report endpoint failed:', e.response?.status || e.message);
  }

  console.log('\n✅ RugCheck API client test complete');
}

test().catch(console.error);
