/**
 * RealYellowSession – IYellowSession implementation using Yellow ClearNode
 *
 * Connects to ClearNode sandbox via YellowClient, creates App Sessions,
 * places orders (simulated via session state updates), and closes sessions.
 *
 * Requires YELLOW_PRIVATE_KEY in environment.
 */

import type {
  ArbitrageStrategy,
  IYellowSession,
  SessionInfo,
  SessionResult,
  TradeOrder,
  TradeResult,
} from './types.js';
import { YellowClient } from '../settlement/yellow-client.js';
import type { Hex, Address } from 'viem';

// ---------------------------------------------------------------------------
// Internal session tracking
// ---------------------------------------------------------------------------

interface ActiveSession {
  info: SessionInfo;
  strategy: ArbitrageStrategy;
  orders: TradeResult[];
  startTime: number;
  appSessionId: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CLEARNODE_COUNTERPARTY = '0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC' as Address;

// ---------------------------------------------------------------------------
// RealYellowSession
// ---------------------------------------------------------------------------

export class RealYellowSession implements IYellowSession {
  private yellow: YellowClient | null = null;
  private sessions = new Map<string, ActiveSession>();
  private orderCounter = 0;
  private readonly privateKey: Hex;
  private readonly wsUrl?: string;

  constructor(config?: { privateKey?: Hex; wsUrl?: string }) {
    const rawKey = config?.privateKey ?? process.env.YELLOW_PRIVATE_KEY;
    if (!rawKey) {
      throw new Error('RealYellowSession requires YELLOW_PRIVATE_KEY');
    }
    this.privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex;
    this.wsUrl = config?.wsUrl ?? process.env.YELLOW_WS_URL;
  }

  private async ensureConnected(): Promise<YellowClient> {
    if (this.yellow?.isReady()) {
      return this.yellow;
    }

    this.yellow = new YellowClient({
      privateKey: this.privateKey,
      wsUrl: this.wsUrl,
    });

    await this.yellow.connect();
    return this.yellow;
  }

  async createSession(strategy: ArbitrageStrategy): Promise<SessionInfo> {
    const yellow = await this.ensureConnected();

    const amount = '100';
    const asset = 'ytest.usd';

    let appSessionId: string;
    try {
      appSessionId = await yellow.createSession(
        CLEARNODE_COUNTERPARTY,
        amount,
        asset,
      );
    } catch (err) {
      // If App Session creation fails on ClearNode, fall back to local tracking
      // This can happen if no funded channel exists yet
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[RealYellowSession] App Session creation failed: ${errMsg}`);
      console.warn('[RealYellowSession] Falling back to off-chain session tracking');
      appSessionId = `real-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const sessionId = `yellow-${appSessionId}`;
    const info: SessionInfo = {
      sessionId,
      createdAt: Date.now(),
      status: 'ACTIVE',
    };

    this.sessions.set(sessionId, {
      info,
      strategy,
      orders: [],
      startTime: Date.now(),
      appSessionId,
    });

    return info;
  }

  async placeOrder(sessionId: string, order: TradeOrder): Promise<TradeResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session.info.status !== 'ACTIVE') {
      throw new Error(`Session is not active: ${sessionId} (status: ${session.info.status})`);
    }
    if (order.amountCpt <= 0n) {
      throw new Error('Order amountCpt must be positive');
    }
    if (order.priceUsdc <= 0) {
      throw new Error('Order priceUsdc must be positive');
    }

    this.orderCounter++;

    // In a real Yellow session, orders are state channel updates.
    // For now we track them locally — the actual settlement happens
    // when the session is closed and profit is moved to the vault.
    const slippageFactor = order.type === 'BUY' ? 1.001 : 0.999;
    const executedPrice = order.priceUsdc * slippageFactor;

    const result: TradeResult = {
      orderId: `yellow-order-${this.orderCounter}`,
      executedAmountCpt: order.amountCpt,
      executedPriceUsdc: executedPrice,
      timestamp: Date.now(),
    };

    session.orders.push(result);
    return result;
  }

  async closeSession(sessionId: string): Promise<SessionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.info.status = 'CLOSED';
    const duration = Date.now() - session.startTime;

    // Try to close the App Session on ClearNode
    if (this.yellow?.isReady() && !session.appSessionId.startsWith('real-session-')) {
      try {
        const yellow = this.yellow;
        const walletAddress = yellow.getAddress();
        await yellow.closeSession(session.appSessionId, [
          { participant: walletAddress, asset: 'ytest.usd', amount: '0' },
          { participant: CLEARNODE_COUNTERPARTY, asset: 'ytest.usd', amount: '0' },
        ]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[RealYellowSession] Failed to close App Session: ${errMsg}`);
      }
    }

    // Calculate net P&L from orders
    let netProfitUsdc = 0n;
    for (const order of session.orders) {
      const usdcValue = (order.executedAmountCpt * BigInt(Math.round(order.executedPriceUsdc * 1e6))) / 10n ** 18n;
      const orderIndex = session.orders.indexOf(order);
      if (orderIndex % 2 === 0) {
        netProfitUsdc -= usdcValue;
      } else {
        netProfitUsdc += usdcValue;
      }
    }

    const result: SessionResult = {
      sessionId,
      orders: session.orders,
      netProfitUsdc,
      duration,
    };

    this.sessions.delete(sessionId);
    return result;
  }

  async disconnect(): Promise<void> {
    if (this.yellow) {
      this.yellow.disconnect();
      this.yellow = null;
    }
  }
}
