import { describe, it, expect, vi } from 'vitest';
import {
  calculateEmaUtilization,
  runUpdateCycle,
  type UpdateCycleDeps,
} from '../arbitrage/oracle-updater.js';
import { loadOracleConfig, type ChainOracleConfig } from '../arbitrage/config.js';
import type { ILogger } from '../arbitrage/types.js';

function createLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  };
}

function createChain(overrides?: Partial<ChainOracleConfig>): ChainOracleConfig {
  return {
    chainId: 84532,
    chainName: 'base-sepolia',
    oracleAddress: '0x1111111111111111111111111111111111111111',
    primaryRpc: 'https://primary',
    fallbackRpc: 'https://fallback',
    emaWindow: 3,
    botUpdateInterval: 1000,
    functionsEnabled: true,
    functionsVerifyInterval: 900000,
    divergenceThreshold: 15,
    staleTtl: 1200,
    ...overrides,
  };
}

describe('oracle-updater', () => {
  it('calculates EMA utilization and clamps to 0-100', () => {
    const blocks = [
      { gasUsed: 2n, gasLimit: 10n }, // 20%
      { gasUsed: 5n, gasLimit: 10n }, // 50%
      { gasUsed: 9n, gasLimit: 10n }, // 90%
    ];

    const utilization = calculateEmaUtilization(blocks);
    expect(utilization).toBeGreaterThanOrEqual(0);
    expect(utilization).toBeLessThanOrEqual(100);
    expect(utilization).toBe(63);
  });

  it('falls back to secondary RPC when primary fails', async () => {
    const logger = createLogger();
    const chain = createChain();
    const fetchBlocks = vi
      .fn()
      .mockRejectedValueOnce(new Error('primary down'))
      .mockResolvedValue([{ gasUsed: 5n, gasLimit: 10n }]);
    const pushUpdate = vi.fn().mockResolvedValue('0xabc');

    const deps: UpdateCycleDeps = { fetchBlocks, pushUpdate };

    const result = await runUpdateCycle(
      chain,
      '0x0123456789012345678901234567890123456789012345678901234567890123',
      logger,
      deps,
    );

    expect(result.usedFallback).toBe(true);
    expect(fetchBlocks).toHaveBeenNthCalledWith(1, chain.primaryRpc, chain.emaWindow);
    expect(fetchBlocks).toHaveBeenNthCalledWith(2, chain.fallbackRpc, chain.emaWindow);
    expect(pushUpdate).toHaveBeenCalledTimes(1);
    expect(pushUpdate.mock.calls[0][0]).toBe(chain.fallbackRpc);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('retries setUtilizationFromBot call on failure', async () => {
    const logger = createLogger();
    const chain = createChain();
    const fetchBlocks = vi.fn().mockResolvedValue([{ gasUsed: 3n, gasLimit: 10n }]);
    const pushUpdate = vi
      .fn()
      .mockRejectedValueOnce(new Error('rpc timeout'))
      .mockResolvedValue('0xdef');
    const deps: UpdateCycleDeps = { fetchBlocks, pushUpdate };

    const result = await runUpdateCycle(
      chain,
      '0x0123456789012345678901234567890123456789012345678901234567890123',
      logger,
      deps,
    );

    expect(result.txHash).toBe('0xdef');
    expect(pushUpdate).toHaveBeenCalledTimes(2);
  });

  it('loads oracle config and prioritizes env overrides', () => {
    const env = {
      ORACLE_BASE_PRIMARY_RPC: 'https://base-primary',
      ORACLE_BASE_FALLBACK_RPC: 'https://base-fallback',
      ORACLE_UNICHAIN_PRIMARY_RPC: 'https://uni-primary',
      ORACLE_UNICHAIN_FALLBACK_RPC: 'https://uni-fallback',
      ORACLE_BOT_INTERVAL_MS: '30000',
      ORACLE_BASE_EMA_WINDOW: '30',
      ORACLE_UNICHAIN_FUNCTIONS_ENABLED: 'true',
      ORACLE_BASE_FUNCTIONS_SUBSCRIPTION_ID: '42',
      DEPLOYER_PRIVATE_KEY: '0xabc',
    } as NodeJS.ProcessEnv;

    const config = loadOracleConfig(env);
    const base = config.chains['base-sepolia'];
    const uni = config.chains['unichain-sepolia'];

    expect(base.primaryRpc).toBe('https://base-primary');
    expect(base.fallbackRpc).toBe('https://base-fallback');
    expect(base.emaWindow).toBe(30);
    expect(base.botUpdateInterval).toBe(30000);
    expect(uni.functionsEnabled).toBe(false);
    expect(config.chainlink['base-sepolia']!.subscriptionId).toBe(42n);
  });
});
