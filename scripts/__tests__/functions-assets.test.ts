import { describe, it, expect } from 'vitest';
import {
  BASE_SEPOLIA_FUNCTIONS_DEFAULTS,
  buildFunctionsRequestArgs,
} from '../arbitrage/functions/config.js';
import { buildBaseSepoliaFunctionsDeployConfig } from '../arbitrage/functions/deploy/base-sepolia.js';

describe('functions assets', () => {
  it('defines base sepolia defaults for router and DON', () => {
    expect(BASE_SEPOLIA_FUNCTIONS_DEFAULTS.chainId).toBe(84532);
    expect(BASE_SEPOLIA_FUNCTIONS_DEFAULTS.router).toBe('0xf9B8fc078197181C841c296C876945aaa425B278');
    expect(BASE_SEPOLIA_FUNCTIONS_DEFAULTS.donId).toBe('fun-base-sepolia-1');
  });

  it('builds fixed request args schema: chainId, blockWindow, rpcPrimary, rpcFallback', () => {
    const args = buildFunctionsRequestArgs({
      chainId: 84532,
      blockWindow: 60,
      rpcPrimary: 'https://primary',
      rpcFallback: 'https://fallback',
    });

    expect(args).toEqual(['84532', '60', 'https://primary', 'https://fallback']);
  });

  it('builds base sepolia deploy config from fixed defaults and request args', () => {
    const cfg = buildBaseSepoliaFunctionsDeployConfig({
      rpcPrimary: 'https://p',
      rpcFallback: 'https://f',
      subscriptionId: 99n,
      blockWindow: 120,
    });

    expect(cfg.chainId).toBe(84532);
    expect(cfg.router).toBe(BASE_SEPOLIA_FUNCTIONS_DEFAULTS.router);
    expect(cfg.donId).toBe(BASE_SEPOLIA_FUNCTIONS_DEFAULTS.donId);
    expect(cfg.subscriptionId).toBe(99n);
    expect(cfg.args).toEqual(['84532', '120', 'https://p', 'https://f']);
  });
});
