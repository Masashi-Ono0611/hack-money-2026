import type {
  ArbitrageConfig,
  ArbitrageResult,
  ArbitrageStrategy,
  IArbitrageEngine,
  ILogger,
  IYellowSessionManager,
  PriceDiscrepancy,
  RiskConfig,
} from './types.js';

const COMPONENT = 'ArbitrageEngine';

export class ArbitrageEngine implements IArbitrageEngine {
  private readonly config: ArbitrageConfig;
  private readonly riskConfig: RiskConfig;
  private readonly sessionManager: IYellowSessionManager;
  private readonly logger: ILogger;
  private activeSessionCount = 0;
  private lastExecutionTime = 0;

  constructor(
    config: ArbitrageConfig,
    sessionManager: IYellowSessionManager,
    logger: ILogger,
  ) {
    this.config = config;
    this.sessionManager = sessionManager;
    this.logger = logger;
    this.riskConfig = {
      maxTradeAmountUsdc: config.maxTradeAmountUSDC,
      minProfitUsdc: config.minProfitUSDC,
      maxConcurrentSessions: 1,
      cooldownMs: 10_000,
    };
  }

  async handleDiscrepancy(discrepancy: PriceDiscrepancy): Promise<ArbitrageResult | null> {
    // Cooldown check
    const now = Date.now();
    if (now - this.lastExecutionTime < this.riskConfig.cooldownMs) {
      this.logger.warn(COMPONENT, 'Cooldown active, skipping', {
        remainingMs: this.riskConfig.cooldownMs - (now - this.lastExecutionTime),
      });
      return null;
    }

    // Concurrent session check
    if (this.activeSessionCount >= this.riskConfig.maxConcurrentSessions) {
      this.logger.warn(COMPONENT, 'Max concurrent sessions reached, skipping', {
        active: this.activeSessionCount,
        max: this.riskConfig.maxConcurrentSessions,
      });
      return null;
    }

    const strategy = this.generateStrategy(discrepancy);
    if (!strategy) return null;

    // Risk validation
    if (strategy.expectedProfitUsdc < this.riskConfig.minProfitUsdc) {
      this.logger.warn(COMPONENT, 'Expected profit below minimum, skipping', {
        expectedProfitUsdc: strategy.expectedProfitUsdc.toString(),
        minProfitUsdc: this.riskConfig.minProfitUsdc.toString(),
      });
      return null;
    }

    this.logger.info(COMPONENT, 'Executing arbitrage strategy', {
      direction: strategy.direction,
      spreadBps: strategy.spreadBps,
      amountCpt: strategy.amountCpt.toString(),
      expectedProfitUsdc: strategy.expectedProfitUsdc.toString(),
    });

    this.activeSessionCount++;
    this.lastExecutionTime = now;

    try {
      const sessionResult = await this.sessionManager.executeArbitrage(strategy);

      const result: ArbitrageResult = {
        success: true,
        strategy,
        sessionId: sessionResult.sessionId,
        actualProfitUsdc: sessionResult.netProfitUsdc,
        ordersExecuted: sessionResult.orders.length,
      };

      this.logger.info(COMPONENT, 'Arbitrage completed', {
        sessionId: sessionResult.sessionId,
        netProfitUsdc: sessionResult.netProfitUsdc.toString(),
        ordersExecuted: sessionResult.orders.length,
        durationMs: sessionResult.duration,
      });

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(COMPONENT, 'Arbitrage execution failed', { error: errorMsg });

      return {
        success: false,
        strategy,
        sessionId: '',
        actualProfitUsdc: 0n,
        ordersExecuted: 0,
        error: errorMsg,
      };
    } finally {
      this.activeSessionCount--;
    }
  }

  getActiveSessionCount(): number {
    return this.activeSessionCount;
  }

  private generateStrategy(discrepancy: PriceDiscrepancy): ArbitrageStrategy | null {
    const { snapshot, direction } = discrepancy;
    const { chainA, chainB, spreadBps } = snapshot;

    // Determine trade direction: buy cheap, sell expensive
    const tradeDirection = direction === 'A_CHEAPER' ? 'BUY_A_SELL_B' as const : 'BUY_B_SELL_A' as const;
    const buyChain = direction === 'A_CHEAPER' ? 'A' as const : 'B' as const;
    const sellChain = direction === 'A_CHEAPER' ? 'B' as const : 'A' as const;

    const buyPrice = buyChain === 'A' ? chainA.priceUsdcPerCpt : chainB.priceUsdcPerCpt;
    const sellPrice = sellChain === 'A' ? chainA.priceUsdcPerCpt : chainB.priceUsdcPerCpt;
    const priceDiff = sellPrice - buyPrice;

    if (priceDiff <= 0) {
      this.logger.warn(COMPONENT, 'No positive price difference after analysis', {
        buyPrice,
        sellPrice,
      });
      return null;
    }

    // Calculate trade amount: use max trade amount in USDC terms, convert to CPT
    // amountCpt = maxTradeAmountUSDC / buyPrice (in CPT's 18 decimals)
    const buyPriceScaled = BigInt(Math.round(buyPrice * 1e6)); // USDC 6 decimals
    if (buyPriceScaled === 0n) return null;

    // amountCpt (18 decimals) = maxTradeAmountUSDC (6 decimals) * 1e18 / buyPrice (6 decimals)
    const amountCpt = (this.config.maxTradeAmountUSDC * 10n ** 18n) / buyPriceScaled;

    // Expected profit in USDC (6 decimals)
    const priceDiffScaled = BigInt(Math.round(priceDiff * 1e6));
    const expectedProfitUsdc = (amountCpt * priceDiffScaled) / 10n ** 18n;

    return {
      direction: tradeDirection,
      buyChain,
      sellChain,
      amountCpt,
      expectedProfitUsdc,
      spreadBps,
      timestamp: Date.now(),
    };
  }
}
