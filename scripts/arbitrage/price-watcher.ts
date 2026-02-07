import { createPublicClient, http } from 'viem';
import type { PublicClient } from 'viem';
import { STATE_VIEW_ABI } from './abi/state-view.js';
import type {
  ArbitrageConfig,
  ChainConfig,
  ChainPrice,
  DiscrepancyCallback,
  ILogger,
  IPriceWatcher,
  PriceDiscrepancy,
  PriceSnapshot,
} from './types.js';
import { withRetry } from '../lib/retry.js';

const COMPONENT = 'PriceWatcher';
const Q96 = 2n ** 96n;
const RETRY_OPTIONS = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 2 };

export class PriceWatcher implements IPriceWatcher {
  private readonly config: ArbitrageConfig;
  private readonly logger: ILogger;
  private readonly clientA: PublicClient;
  private readonly clientB: PublicClient;
  private callbacks: DiscrepancyCallback[] = [];
  private latestSnapshot: PriceSnapshot | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(config: ArbitrageConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
    this.clientA = createPublicClient({ transport: http(config.chainA.rpcUrl) });
    this.clientB = createPublicClient({ transport: http(config.chainB.rpcUrl) });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info(COMPONENT, 'Starting price watcher', {
      chainA: this.config.chainA.name,
      chainB: this.config.chainB.name,
      pollIntervalMs: this.config.pollIntervalMs,
      thresholdBps: this.config.thresholdBps,
    });

    // Run immediately, then on interval
    void this.poll();
    this.intervalId = setInterval(() => void this.poll(), this.config.pollIntervalMs);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.info(COMPONENT, 'Stopped price watcher');
  }

  onDiscrepancy(callback: DiscrepancyCallback): void {
    this.callbacks.push(callback);
  }

  getLatestSnapshot(): PriceSnapshot | null {
    return this.latestSnapshot;
  }

  private async poll(): Promise<void> {
    try {
      const [priceA, priceB] = await Promise.all([
        this.fetchChainPrice(this.clientA, this.config.chainA),
        this.fetchChainPrice(this.clientB, this.config.chainB),
      ]);

      const avg = (priceA.priceUsdcPerCpt + priceB.priceUsdcPerCpt) / 2;
      const spreadBps = avg > 0
        ? Math.abs(priceA.priceUsdcPerCpt - priceB.priceUsdcPerCpt) / avg * 10000
        : 0;

      const snapshot: PriceSnapshot = { chainA: priceA, chainB: priceB, spreadBps };
      this.latestSnapshot = snapshot;

      this.logger.info(COMPONENT, 'Price snapshot', {
        priceA: priceA.priceUsdcPerCpt,
        priceB: priceB.priceUsdcPerCpt,
        spreadBps: Math.round(spreadBps * 100) / 100,
      });

      if (spreadBps >= this.config.thresholdBps) {
        const direction = priceA.priceUsdcPerCpt < priceB.priceUsdcPerCpt
          ? 'A_CHEAPER' as const
          : 'B_CHEAPER' as const;

        const discrepancy: PriceDiscrepancy = {
          snapshot,
          direction,
          timestamp: Date.now(),
        };

        this.logger.info(COMPONENT, 'Price discrepancy detected', {
          spreadBps: Math.round(spreadBps * 100) / 100,
          direction,
        });

        for (const cb of this.callbacks) {
          cb(discrepancy);
        }
      }
    } catch (err) {
      this.logger.error(COMPONENT, 'Poll cycle failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async fetchChainPrice(client: PublicClient, chain: ChainConfig): Promise<ChainPrice> {
    const result = await withRetry(
      async () => {
        const data = await client.readContract({
          address: chain.stateViewAddress,
          abi: STATE_VIEW_ABI,
          functionName: 'getSlot0',
          args: [chain.poolId],
        });
        return data;
      },
      RETRY_OPTIONS,
      this.logger,
      `${COMPONENT}:${chain.name}`,
    );

    const [sqrtPriceX96, tick] = result;

    if (sqrtPriceX96 === 0n) {
      throw new Error(`sqrtPriceX96 is 0 for chain ${chain.name} — pool may not be initialized`);
    }

    const priceUsdcPerCpt = this.sqrtPriceX96ToPrice(
      sqrtPriceX96,
      chain.cptAddress,
      chain.usdcAddress,
      chain.cptDecimals,
      chain.usdcDecimals,
    );

    return {
      sqrtPriceX96,
      tick: Number(tick),
      priceUsdcPerCpt,
      timestamp: Date.now(),
    };
  }

  /**
   * Convert sqrtPriceX96 to human-readable USDC/CPT price.
   *
   * sqrtPriceX96 encodes price of token1 in terms of token0:
   *   price_token1_per_token0 = (sqrtPriceX96 / 2^96)^2
   *
   * Token ordering: token0 < token1 (by address).
   * We need USDC per CPT regardless of ordering.
   */
  private sqrtPriceX96ToPrice(
    sqrtPriceX96: bigint,
    cptAddress: `0x${string}`,
    usdcAddress: `0x${string}`,
    cptDecimals: number,
    usdcDecimals: number,
  ): number {
    // Determine token order: token0 is the lower address
    const cptIsToken0 = cptAddress.toLowerCase() < usdcAddress.toLowerCase();

    // price_token1_per_token0 = (sqrtPriceX96)^2 / (2^192)
    // Use scaled integer math to maintain precision
    const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
    const Q192 = Q96 * Q96;

    if (cptIsToken0) {
      // token0 = CPT, token1 = USDC
      // price = USDC_per_CPT = sqrtPriceSq / Q192 * 10^(cptDecimals - usdcDecimals)
      const decimalAdjust = 10n ** BigInt(cptDecimals - usdcDecimals);
      // Scale up for precision: multiply by 1e18 first, then divide
      const scaled = (sqrtPriceSq * decimalAdjust * 10n ** 18n) / Q192;
      return Number(scaled) / 1e18;
    } else {
      // token0 = USDC, token1 = CPT
      // price_CPT_per_USDC = sqrtPriceSq / Q192 * 10^(usdcDecimals - cptDecimals)
      // USDC_per_CPT = 1 / price_CPT_per_USDC
      const decimalAdjust = 10n ** BigInt(cptDecimals - usdcDecimals);
      // Scale: Q192 * decimalAdjust * 1e18 / sqrtPriceSq
      const scaled = (Q192 * decimalAdjust * 10n ** 18n) / sqrtPriceSq;
      return Number(scaled) / 1e18;
    }
  }
}
