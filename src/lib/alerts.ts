import 'server-only';
import crypto from 'crypto';
import axios from 'axios';
import { insertAlert, getDb } from './db';

// X API v2 credentials
const API_KEY = process.env.X_API_KEY || '';
const API_SECRET = process.env.X_API_SECRET || '';
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN || '';
const ACCESS_SECRET = process.env.X_ACCESS_SECRET || '';

const X_API_URL = 'https://api.x.com/2/tweets';

// Minimum risk score to post an alert (lower = more dangerous)
const ALERT_THRESHOLD = 25; // Only RED tokens under 25/100

export interface AlertPayload {
  mint: string;
  name: string;
  symbol: string;
  score: number;
  status: 'RED' | 'YELLOW' | 'GREEN';
  reasons: string[];
  deployer: string;
}

/**
 * Generate OAuth 1.0a signature for X API.
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

/**
 * Post a tweet via X API v2.
 */
async function postTweet(text: string): Promise<string | null> {
  if (!API_KEY || !ACCESS_TOKEN) {
    console.log('[ALERTS] X API credentials not configured — skipping tweet');
    console.log(`[ALERTS] Would have posted: ${text}`);
    return null;
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    'POST',
    X_API_URL,
    oauthParams,
    API_SECRET,
    ACCESS_SECRET,
  );

  oauthParams.oauth_signature = signature;

  const authHeader =
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');

  try {
    const { data } = await axios.post(
      X_API_URL,
      { text },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    const tweetId = data.data?.id;
    console.log(`[ALERTS] Tweet posted: ${tweetId}`);
    return tweetId;
  } catch (err: unknown) {
    const error = err as { response?: { status: number; data: unknown } };
    console.error('[ALERTS] Failed to post tweet:', error.response?.status, error.response?.data);
    return null;
  }
}

/**
 * Compose an alert tweet for a dangerous token.
 */
function composeAlertTweet(alert: AlertPayload): string {
  const emoji = alert.score < 15 ? '🚨' : '⚠️';
  const shortMint = `${alert.mint.slice(0, 6)}...${alert.mint.slice(-4)}`;
  const topReasons = alert.reasons.slice(0, 3);

  const lines = [
    `${emoji} SCAM ALERT: $${alert.symbol} (${shortMint})`,
    ``,
    `Risk Score: ${alert.score}/100 [${alert.status}]`,
    ``,
    ...topReasons.map((r) => `- ${r}`),
    ``,
    `Check before you buy. Stay safe.`,
  ];

  const tweet = lines.join('\n');
  // Truncate to 280 chars if needed
  return tweet.length > 280 ? tweet.substring(0, 277) + '...' : tweet;
}

/**
 * Check if a token should trigger an alert and post it.
 * Only alerts for RED tokens below the threshold.
 */
export async function maybeAlert(payload: AlertPayload): Promise<boolean> {
  if (payload.status !== 'RED' || payload.score > ALERT_THRESHOLD) {
    return false;
  }

  // Prevent duplicate alerts for the same token
  const db = getDb();
  const existingAlert = db.prepare('SELECT 1 FROM alerts WHERE token_mint = ?').get(payload.mint);
  if (existingAlert) {
    console.log(`[ALERTS] Alert already posted for ${payload.mint} — skipping`);
    return false;
  }

  console.log(`[ALERTS] Token ${payload.symbol} qualifies for alert (score: ${payload.score})`);

  const tweet = composeAlertTweet(payload);
  const tweetId = await postTweet(tweet);

  // Save alert to database
  insertAlert(
    payload.mint,
    'scam_alert',
    tweetId || '',
    tweet,
  );

  return true;
}

/**
 * Post a manual alert for testing.
 */
export async function testAlert(): Promise<void> {
  const testPayload: AlertPayload = {
    mint: 'TestMiNtAdDrEsS11111111111111111111111111',
    name: 'TestRugToken',
    symbol: 'TESTRUG',
    score: 8,
    status: 'RED',
    reasons: [
      'Deployer rugged 12 tokens previously',
      'LP not locked',
      'Mint authority active',
      'Top holder owns 95%',
    ],
    deployer: 'TestDeployerAddress',
  };

  const tweet = composeAlertTweet(testPayload);
  console.log('[ALERTS] Test alert compose:');
  console.log(tweet);
  console.log(`[ALERTS] Length: ${tweet.length}/280`);
}
