import 'server-only';
import axios from 'axios';

const BASE_URL = 'https://api.helius.xyz';
const API_KEY = process.env.HELIUS_API_KEY || '';

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
