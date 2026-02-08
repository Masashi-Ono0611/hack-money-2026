import { describe, it, expect } from 'vitest';
import { MockYellowSession } from '../arbitrage/mock/mock-yellow-session.js';
import type { ArbitrageStrategy, TradeOrder } from '../arbitrage/types.js';

const MOCK_STRATEGY: ArbitrageStrategy = {
  direction: 'BUY_A_SELL_B',
  buyChain: 'A',
  sellChain: 'B',
  amountCpt: 100n * 10n ** 18n, // 100 CPT
  expectedProfitUsdc: 5_000_000n, // 5 USDC
  spreadBps: 100,
  timestamp: Date.now(),
};

describe('MockYellowSession', () => {
  it('creates a session with unique ID', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    expect(info.sessionId).toMatch(/^mock-session-/);
    expect(info.status).toBe('ACTIVE');
    expect(info.createdAt).toBeGreaterThan(0);
  });

  it('creates unique session IDs', async () => {
    const session = new MockYellowSession();
    const info1 = await session.createSession(MOCK_STRATEGY);
    const info2 = await session.createSession(MOCK_STRATEGY);

    expect(info1.sessionId).not.toBe(info2.sessionId);
  });

  it('places buy and sell orders', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    const buyOrder: TradeOrder = {
      type: 'BUY',
      token: 'CPT_A',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 0.98,
    };

    const buyResult = await session.placeOrder(info.sessionId, buyOrder);
    expect(buyResult.orderId).toMatch(/^mock-order-/);
    expect(buyResult.executedAmountCpt).toBe(buyOrder.amountCpt);
    expect(buyResult.executedPriceUsdc).toBeGreaterThan(0);
    expect(buyResult.timestamp).toBeGreaterThan(0);

    const sellOrder: TradeOrder = {
      type: 'SELL',
      token: 'CPT_B',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 1.02,
    };

    const sellResult = await session.placeOrder(info.sessionId, sellOrder);
    expect(sellResult.orderId).not.toBe(buyResult.orderId);
  });

  it('closes session and returns result with P&L', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    await session.placeOrder(info.sessionId, {
      type: 'BUY',
      token: 'CPT_A',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 0.98,
    });

    await session.placeOrder(info.sessionId, {
      type: 'SELL',
      token: 'CPT_B',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 1.02,
    });

    const result = await session.closeSession(info.sessionId);
    expect(result.sessionId).toBe(info.sessionId);
    expect(result.orders).toHaveLength(2);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    // Net profit should be positive (sell > buy)
    expect(result.netProfitUsdc).toBeGreaterThan(0n);
  });

  it('throws on placeOrder with invalid session ID', async () => {
    const session = new MockYellowSession();
    await expect(
      session.placeOrder('nonexistent', {
        type: 'BUY',
        token: 'CPT_A',
        amountCpt: 100n * 10n ** 18n,
        priceUsdc: 1.0,
      }),
    ).rejects.toThrow('Session not found');
  });

  it('throws on placeOrder with zero amount', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    await expect(
      session.placeOrder(info.sessionId, {
        type: 'BUY',
        token: 'CPT_A',
        amountCpt: 0n,
        priceUsdc: 1.0,
      }),
    ).rejects.toThrow('amountCpt must be positive');
  });

  it('throws on placeOrder with zero price', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    await expect(
      session.placeOrder(info.sessionId, {
        type: 'BUY',
        token: 'CPT_A',
        amountCpt: 100n * 10n ** 18n,
        priceUsdc: 0,
      }),
    ).rejects.toThrow('priceUsdc must be positive');
  });

  it('throws on closeSession with invalid session ID', async () => {
    const session = new MockYellowSession();
    await expect(session.closeSession('nonexistent')).rejects.toThrow(
      'Session not found',
    );
  });

  it('throws on placeOrder after session is closed', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);
    await session.closeSession(info.sessionId);

    await expect(
      session.placeOrder(info.sessionId, {
        type: 'BUY',
        token: 'CPT_A',
        amountCpt: 100n * 10n ** 18n,
        priceUsdc: 1.0,
      }),
    ).rejects.toThrow('Session not found');
  });

  it('simulates slippage on orders', async () => {
    const session = new MockYellowSession();
    const info = await session.createSession(MOCK_STRATEGY);

    const buyResult = await session.placeOrder(info.sessionId, {
      type: 'BUY',
      token: 'CPT_A',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 1.0,
    });

    // BUY slippage: price should be slightly higher (1.001x)
    expect(buyResult.executedPriceUsdc).toBeCloseTo(1.001, 3);

    const sellResult = await session.placeOrder(info.sessionId, {
      type: 'SELL',
      token: 'CPT_B',
      amountCpt: 100n * 10n ** 18n,
      priceUsdc: 1.0,
    });

    // SELL slippage: price should be slightly lower (0.999x)
    expect(sellResult.executedPriceUsdc).toBeCloseTo(0.999, 3);
  });
});
