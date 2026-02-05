/**
 * Solana Documentation Links
 * Maps risk keywords to official Solana docs
 * Docs support .md suffix for LLM-ready format
 */

export interface DocLink {
  url: string;
  title: string;
  snippet: string;
}

const SOLANA_DOCS_BASE = 'https://solana.com/docs';

// Keyword to doc mapping
const DOC_MAPPINGS: Record<string, DocLink> = {
  'mint authority': {
    url: `${SOLANA_DOCS_BASE}/core/tokens#mint-authority`,
    title: 'Mint Authority',
    snippet: 'The mint authority can create new tokens at any time, potentially diluting your holdings to zero.',
  },
  'freeze authority': {
    url: `${SOLANA_DOCS_BASE}/core/tokens#freeze-authority`,
    title: 'Freeze Authority', 
    snippet: 'The freeze authority can freeze your token account, preventing you from transferring or selling.',
  },
  'metadata': {
    url: `${SOLANA_DOCS_BASE}/core/tokens#token-metadata`,
    title: 'Token Metadata',
    snippet: 'Mutable metadata means the token name, symbol, or image can be changed after launch.',
  },
  'lp locked': {
    url: 'https://docs.raydium.io/raydium/pool-creation/creating-a-clmm-pool',
    title: 'Liquidity Pool Locking',
    snippet: 'Locked liquidity prevents the deployer from removing funds and crashing the price (rug pull).',
  },
  'lp not locked': {
    url: 'https://docs.raydium.io/raydium/pool-creation/creating-a-clmm-pool',
    title: 'Unlocked Liquidity Risk',
    snippet: 'Without locked LP, the deployer can withdraw liquidity at any time, crashing the token price.',
  },
  'deployer': {
    url: `${SOLANA_DOCS_BASE}/core/accounts`,
    title: 'Token Deployer',
    snippet: 'A deployer with previous rug pulls is statistically likely to rug again. Check their history.',
  },
  'token age': {
    url: `${SOLANA_DOCS_BASE}/core/tokens`,
    title: 'Token Age',
    snippet: 'Very new tokens (<24h) are highest risk. Most rugs happen within the first few hours.',
  },
  'holder': {
    url: `${SOLANA_DOCS_BASE}/core/tokens#token-accounts`,
    title: 'Holder Concentration',
    snippet: 'If a single wallet holds most of the supply, they can dump and crash the price.',
  },
};

/**
 * Find a documentation link for a risk reason
 */
export function getDocLink(reason: string): DocLink | null {
  const lowerReason = reason.toLowerCase();
  
  for (const [keyword, docLink] of Object.entries(DOC_MAPPINGS)) {
    if (lowerReason.includes(keyword)) {
      return docLink;
    }
  }
  
  return null;
}

/**
 * Get all doc links for an array of reasons
 */
export function getDocLinksForReasons(reasons: string[]): Map<string, DocLink> {
  const links = new Map<string, DocLink>();
  
  for (const reason of reasons) {
    const docLink = getDocLink(reason);
    if (docLink && !links.has(docLink.url)) {
      links.set(reason, docLink);
    }
  }
  
  return links;
}

/**
 * Get the LLM-ready markdown URL for a doc
 */
export function getMarkdownUrl(url: string): string {
  // Convert solana.com URLs to .md format
  if (url.includes('solana.com/docs')) {
    const hashIndex = url.indexOf('#');
    if (hashIndex > -1) {
      return url.slice(0, hashIndex) + '.md' + url.slice(hashIndex);
    }
    return url + '.md';
  }
  return url;
}
