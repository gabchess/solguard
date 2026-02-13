import 'server-only';
import axios from 'axios';

const BASE_URL = 'https://api.helius.xyz';
const API_KEY = process.env.HELIUS_API_KEY || '';

// --- Wallet API v1 (NEW) ---

export interface WalletBalance {
  mint: string;
  amount: number;
  decimals: number;
  name?: string;
  symbol?: string;
  logoURI?: string;
  usdValue?: number;
}

export interface WalletTransfer {
  signature: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  mint?: string;
  type: string;
}

export interface WalletFunding {
  fundingSource: string;
  fundingSourceType: string; // 'exchange' | 'protocol' | 'unknown' etc
  amount: number;
  timestamp: number;
  signature: string;
}

/**
 * Get all token balances for a wallet in ONE call (Wallet API v1).
 * Replaces multiple getAssetsByOwner calls.
 */
export async function getWalletBalances(address: string): Promise<WalletBalance[]> {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/v1/wallet/${address}/balances`,
      {
        params: { 'api-key': API_KEY },
        timeout: 15000,
      },
    );
    return data?.tokens ?? [];
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    console.error(`Helius wallet balances error for ${address}:`, error.response?.status || err);
    return [];
  }
}

/**
 * Get complete transfer history for a wallet (Wallet API v1).
 * Includes counterparty info for each transfer.
 */
export async function getWalletTransfers(address: string, limit = 100): Promise<WalletTransfer[]> {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/v1/wallet/${address}/transfers`,
      {
        params: { 'api-key': API_KEY, limit },
        timeout: 15000,
      },
    );
    return data?.transfers ?? [];
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    console.error(`Helius wallet transfers error for ${address}:`, error.response?.status || err);
    return [];
  }
}

/**
 * Get the original funding source for a wallet (Wallet API v1).
 * Critical for rug detection: identifies if wallet was funded by
 * an exchange, another rugger wallet, mixer, etc.
 */
export async function getWalletFunding(address: string): Promise<WalletFunding | null> {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/v1/wallet/${address}/funding`,
      {
        params: { 'api-key': API_KEY },
        timeout: 15000,
      },
    );
    return data ?? null;
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    console.error(`Helius wallet funding error for ${address}:`, error.response?.status || err);
    return null;
  }
}

// --- Enhanced Transactions API types ---

export type HeliusTransactionType =
  | 'TOKEN_MINT'
  | 'TOKEN_TRANSFER'
  | 'SWAP'
  | 'BURN'
  | 'CREATE'
  | 'CLOSE_ACCOUNT'
  | 'COMPRESSED_NFT_MINT'
  | 'UNKNOWN';

export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusTransaction {
  signature: string;
  type: HeliusTransactionType;
  source: string;
  timestamp: number;
  description: string;
  fee: number;
  feePayer: string;
  tokenTransfers: HeliusTokenTransfer[];
  nativeTransfers: HeliusNativeTransfer[];
}

// --- DAS (Digital Asset Standard) types ---

export interface HeliusAssetContent {
  json_uri: string;
  metadata: {
    name: string;
    symbol: string;
  };
}

export interface HeliusTokenInfo {
  balance: number;
  supply: number;
  decimals: number;
  mint_authority: string | null;
  freeze_authority: string | null;
}

export interface HeliusAsset {
  id: string;
  interface: string;
  content: HeliusAssetContent;
  token_info: HeliusTokenInfo;
  ownership: {
    owner: string;
  };
}

export interface HeliusGetAssetsResponse {
  total: number;
  limit: number;
  page: number;
  items: HeliusAsset[];
}

// Token-related transaction types we care about for deployer analysis
const TOKEN_TX_TYPES: HeliusTransactionType[] = [
  'TOKEN_MINT',
  'TOKEN_TRANSFER',
  'SWAP',
  'BURN',
  'CREATE',
];

/**
 * Get a deployer's transaction history filtered for token-related txs.
 * Uses the Helius Enhanced Transactions API.
 */
export async function getDeployerHistory(address: string): Promise<HeliusTransaction[]> {
  try {
    const { data } = await axios.get<HeliusTransaction[]>(
      `${BASE_URL}/v0/addresses/${address}/transactions`,
      {
        params: {
          'api-key': API_KEY,
          type: 'TOKEN_MINT',
        },
        timeout: 15000,
      },
    );

    if (!Array.isArray(data)) return [];

    return data.filter((tx) => TOKEN_TX_TYPES.includes(tx.type));
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    console.error(
      `Helius deployer history error for ${address}:`,
      error.response?.status || err,
    );
    return [];
  }
}

/**
 * Get token holdings for a wallet using the DAS getAssetsByOwner method.
 */
export async function getWalletAssets(address: string): Promise<HeliusAsset[]> {
  try {
    const { data } = await axios.post<{ result: HeliusGetAssetsResponse }>(
      `${BASE_URL}/v0/rpc?api-key=${API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'solguard',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          page: 1,
          limit: 100,
          displayOptions: {
            showFungible: true,
          },
        },
      },
      { timeout: 15000 },
    );

    return data.result?.items ?? [];
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    console.error(
      `Helius wallet assets error for ${address}:`,
      error.response?.status || err,
    );
    return [];
  }
}
