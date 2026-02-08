import { describe, it, expect, vi } from 'vitest';
import { ArbitrageEngine } from '../arbitrage/arbitrage-engine.js';
import type {
  ArbitrageConfig,
  IYellowSessionManager,
  PriceDiscrepancy,
  SessionResult,
  ILogger,
} from '../arbitrage/types.js';

function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  };
}

function createMockSessionManager(
  result?: Partial<SessionResult>,
): IYellowSessionManager {
  return {
    executeArbitrage: vi.fn().mockResolvedValue({
      sessionId: 'test-session-1',
      orders: [
        { orderId: 'o1', executedAmountCpt: 100n * 10n ** 18n, executedPriceUsdc: 0.98, timestamp: Date.now() },
        { orderId: 'o2', executedAmountCpt: 100n * 10n ** 18n, executedPriceUsdc: 1.02, timestamp: Date.now() },
      ],
      netProfitUsdc: 4_000_000n,
      duration: 100,
      ...result,
    }),
  };
}

function createConfig(overrides?: Partial<ArbitrageConfig>): ArbitrageConfig {
  return {
    chainA: {} as ArbitrageConfig['chainA'],
    chainB: {} as ArbitrageConfig['chainB'],
    pollIntervalMs: 5000,
    thresholdBps: 50,
    maxTradeAmountUSDC: 100_000_000n, // 100 USDC
    minProfitUSDC: 1_000_000n, // 1 USDC
    logLevel: 'INFO',
    ...overrides,
  };
}

function createDiscrepancy(
  priceA: number,
  priceB: number,
): PriceDiscrepancy {
  const avg = (priceA + priceB) / 2;
  const spreadBps = Math.abs(priceA - priceB) / avg * 10000;
  return {
    snapshot: {
      chainA: { sqrtPriceX96: 0n, tick: 0, priceUsdcPerCpt: priceA, timestamp: Date.now() },
      chainB: { sqrtPriceX96: 0n, tick: 0, priceUsdcPerCpt: priceB, timestamp: Date.now() },
      spreadBps,
    },
    direction: priceA < priceB ? 'A_CHEAPER' : 'B_CHEAPER',
    timestamp: Date.now(),
  };
}

describe('ArbitrageEngine', () => {
  it('generates strategy and executes arbitrage', async () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(0.95, 1.05);
    const result = await engine.handleDiscrepancy(discrepancy);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.sessionId).toBe('test-session-1');
    expect(sessionManager.executeArbitrage).toHaveBeenCalledTimes(1);
  });

  it('determines correct trade direction: A cheaper → BUY_A_SELL_B', async () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(0.90, 1.10);
    await engine.handleDiscrepancy(discrepancy);

    const call = (sessionManager.executeArbitrage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.direction).toBe('BUY_A_SELL_B');
    expect(call.buyChain).toBe('A');
    expect(call.sellChain).toBe('B');
  });

  it('determines correct trade direction: B cheaper → BUY_B_SELL_A', async () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(1.10, 0.90);
    await engine.handleDiscrepancy(discrepancy);

    const call = (sessionManager.executeArbitrage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.direction).toBe('BUY_B_SELL_A');
    expect(call.buyChain).toBe('B');
    expect(call.sellChain).toBe('A');
  });

  it('skips when expected profit is below minimum', async () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    // Set very high min profit
    const config = createConfig({ minProfitUSDC: 1_000_000_000n }); // 1000 USDC
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(0.99, 1.01); // small spread
    const result = await engine.handleDiscrepancy(discrepancy);

    expect(result).toBeNull();
    expect(sessionManager.executeArbitrage).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('enforces cooldown between executions', async () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(0.90, 1.10);

    // First execution should succeed
    const result1 = await engine.handleDiscrepancy(discrepancy);
    expect(result1).not.toBeNull();

    // Second execution immediately should be skipped (cooldown)
    const result2 = await engine.handleDiscrepancy(discrepancy);
    expect(result2).toBeNull();
  });

  it('tracks active session count', () => {
    const logger = createMockLogger();
    const sessionManager = createMockSessionManager();
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    expect(engine.getActiveSessionCount()).toBe(0);
  });

  it('handles session execution failure gracefully', async () => {
    const logger = createMockLogger();
    const sessionManager: IYellowSessionManager = {
      executeArbitrage: vi.fn().mockRejectedValue(new Error('session failed')),
    };
    const config = createConfig();
    const engine = new ArbitrageEngine(config, sessionManager, logger);

    const discrepancy = createDiscrepancy(0.90, 1.10);
    const result = await engine.handleDiscrepancy(discrepancy);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.error).toBe('session failed');
    expect(logger.error).toHaveBeenCalled();
    // Active session count should be back to 0
    expect(engine.getActiveSessionCount()).toBe(0);
  });
});
