import type {
  ArbitrageStrategy,
  IYellowSession,
  SessionInfo,
  SessionResult,
  TradeOrder,
  TradeResult,
} from '../types.js';

interface SessionState {
  info: SessionInfo;
  strategy: ArbitrageStrategy;
  orders: TradeResult[];
  startTime: number;
}

export class MockYellowSession implements IYellowSession {
  private sessions = new Map<string, SessionState>();
  private orderCounter = 0;

  async createSession(strategy: ArbitrageStrategy): Promise<SessionInfo> {
    const sessionId = `mock-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    // Simulate slippage: 0.1% for mock
    const slippageFactor = order.type === 'BUY' ? 1.001 : 0.999;
    const executedPrice = order.priceUsdc * slippageFactor;

    const result: TradeResult = {
      orderId: `mock-order-${this.orderCounter}`,
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

    // Calculate net P&L from orders
    // BUY orders are costs (negative), SELL orders are revenue (positive)
    let netProfitUsdc = 0n;
    for (const order of session.orders) {
      // Convert: amountCpt (18 decimals) * priceUsdc / 1e18 → USDC (6 decimals)
      const usdcValue = (order.executedAmountCpt * BigInt(Math.round(order.executedPriceUsdc * 1e6))) / 10n ** 18n;

      // Determine if this was a buy or sell based on order index
      // Even index = first order (buy), Odd index = second order (sell)
      const orderIndex = session.orders.indexOf(order);
      if (orderIndex % 2 === 0) {
        // Buy: cost
        netProfitUsdc -= usdcValue;
      } else {
        // Sell: revenue
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

}
