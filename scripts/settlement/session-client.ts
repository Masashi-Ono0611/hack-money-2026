import type { SessionResult } from './types.js';
import { YellowClient } from './yellow-client.js';
import type { Hex } from 'viem';

// ---------------------------------------------------------------------------
// SessionClient – retrieves Yellow session results
//
// When YELLOW_PRIVATE_KEY is set: connects to ClearNode, fetches real
// ledger balances, and derives netProfit from on-ledger USDC balance.
//
// When YELLOW_PRIVATE_KEY is NOT set: returns mock data for local testing.
// ---------------------------------------------------------------------------

export interface SessionClientConfig {
  privateKey?: Hex;
  wsUrl?: string;
  asset?: string;
}

export class SessionClient {
  private readonly config: SessionClientConfig;

  constructor(config?: SessionClientConfig) {
    const rawKey = config?.privateKey ?? process.env.YELLOW_PRIVATE_KEY;
    const privateKey = rawKey
      ? (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex
      : undefined;

    this.config = {
      privateKey,
      wsUrl: config?.wsUrl ?? process.env.YELLOW_WS_URL,
      asset: config?.asset ?? process.env.YELLOW_ASSET ?? 'ytest.usd',
    };
  }

  async getResult(sessionId: string): Promise<SessionResult> {
    if (!this.config.privateKey) {
      return this.getMockResult(sessionId);
    }
    return this.getRealResult(sessionId);
  }

  // ---- real implementation ------------------------------------------------

  private async getRealResult(sessionId: string): Promise<SessionResult> {
    console.log(`[SessionClient] Connecting to ClearNode...`);

    const yellow = new YellowClient({
      privateKey: this.config.privateKey!,
      wsUrl: this.config.wsUrl,
    });

    try {
      await yellow.connect();

      console.log(`[SessionClient] Fetching balances for: ${yellow.getAddress()}`);
      const balancesResult = await yellow.getBalances();
      const balances = Array.isArray(balancesResult)
        ? balancesResult
        : (balancesResult as any)?.ledger_balances
          ?? (balancesResult as any)?.balances
          ?? [];

      const targetAsset = this.config.asset!;
      const assetBalance = balances.find(
        (b: any) => b.asset.toLowerCase() === targetAsset.toLowerCase(),
      );
      const rawAmount = assetBalance?.amount ?? '0';
      const netProfitUsdc = (Number(rawAmount) / 1e6).toString();

      console.log(`[SessionClient] ${targetAsset} balance on ledger: ${rawAmount} (${netProfitUsdc} USDC)`);

      console.log(`[SessionClient] Fetching channels...`);
      const channelsResult = await yellow.getChannels();
      const channels = Array.isArray(channelsResult)
        ? channelsResult
        : (channelsResult as any)?.channels ?? [];
      console.log(`[SessionClient] Found ${channels.length} channel(s)`);

      return {
        sessionId,
        chainA: 'base-sepolia',
        chainB: 'worldcoin-sepolia',
        netProfitUsdc,
        timestamp: Date.now(),
        status: 'COMPLETED',
      };
    } catch (err) {
      console.error(`[SessionClient] Error: ${err}`);
      return {
        sessionId,
        chainA: 'base-sepolia',
        chainB: 'worldcoin-sepolia',
        netProfitUsdc: '0',
        timestamp: Date.now(),
        status: 'FAILED',
      };
    } finally {
      yellow.disconnect();
    }
  }

  // ---- mock fallback ------------------------------------------------------

  private getMockResult(sessionId: string): SessionResult {
    console.log(
      `[SessionClient] YELLOW_PRIVATE_KEY not set – returning mock data`,
    );
    return {
      sessionId,
      chainA: 'base-sepolia',
      chainB: 'worldcoin-sepolia',
      netProfitUsdc: '3',
      timestamp: Date.now(),
      status: 'COMPLETED',
    };
  }
}
