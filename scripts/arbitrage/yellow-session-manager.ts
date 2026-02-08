import type {
  ArbitrageConfig,
  ArbitrageStrategy,
  ILogger,
  IYellowSession,
  IYellowSessionManager,
  SessionResult,
  TradeOrder,
} from './types.js';
import { RealYellowSession } from './real-yellow-session.js';

const COMPONENT = 'YellowSessionManager';

export class YellowSessionManager implements IYellowSessionManager {
  private readonly session: IYellowSession;
  private readonly logger: ILogger;

  constructor(_config: ArbitrageConfig, logger: ILogger) {
    this.logger = logger;
    this.session = new RealYellowSession();
    this.logger.info(COMPONENT, 'Using RealYellowSession (Yellow ClearNode)');
  }

  async executeArbitrage(strategy: ArbitrageStrategy): Promise<SessionResult> {
    let sessionId = '';

    try {
      // 1. Create session
      const sessionInfo = await this.session.createSession(strategy);
      sessionId = sessionInfo.sessionId;

      this.logger.info(COMPONENT, 'Session created', {
        sessionId,
        direction: strategy.direction,
      });

      // 2. Place buy order (buy cheap CPT)
      const buyPrice = strategy.buyChain === 'A'
        ? strategy.spreadBps // placeholder — actual price comes from strategy context
        : strategy.spreadBps;

      const buyOrder: TradeOrder = {
        type: 'BUY',
        token: strategy.buyChain === 'A' ? 'CPT_A' : 'CPT_B',
        amountCpt: strategy.amountCpt,
        priceUsdc: this.estimateBuyPrice(strategy),
      };

      const buyResult = await this.session.placeOrder(sessionId, buyOrder);
      this.logger.info(COMPONENT, 'Buy order executed', {
        sessionId,
        orderId: buyResult.orderId,
        token: buyOrder.token,
        amountCpt: buyOrder.amountCpt.toString(),
        executedPrice: buyResult.executedPriceUsdc,
      });

      // 3. Place sell order (sell expensive CPT)
      const sellOrder: TradeOrder = {
        type: 'SELL',
        token: strategy.sellChain === 'A' ? 'CPT_A' : 'CPT_B',
        amountCpt: strategy.amountCpt,
        priceUsdc: this.estimateSellPrice(strategy),
      };

      const sellResult = await this.session.placeOrder(sessionId, sellOrder);
      this.logger.info(COMPONENT, 'Sell order executed', {
        sessionId,
        orderId: sellResult.orderId,
        token: sellOrder.token,
        amountCpt: sellOrder.amountCpt.toString(),
        executedPrice: sellResult.executedPriceUsdc,
      });

      // 4. Close session
      const result = await this.session.closeSession(sessionId);

      this.logger.info(COMPONENT, 'Session closed', {
        sessionId,
        netProfitUsdc: result.netProfitUsdc.toString(),
        ordersCount: result.orders.length,
        durationMs: result.duration,
      });

      return result;
    } catch (err) {
      this.logger.error(COMPONENT, 'Session execution failed, closing session', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });

      // Ensure session is always closed
      if (sessionId) {
        try {
          await this.session.closeSession(sessionId);
        } catch (closeErr) {
          this.logger.error(COMPONENT, 'Failed to close session after error', {
            sessionId,
            error: closeErr instanceof Error ? closeErr.message : String(closeErr),
          });
        }
      }

      throw err;
    }
  }

  private estimateBuyPrice(strategy: ArbitrageStrategy): number {
    // Use the spread to estimate: the buy side is the cheaper chain
    const basePrice = 1.0;
    const spreadFraction = strategy.spreadBps / 10000;
    return basePrice * (1 - spreadFraction / 2);
  }

  private estimateSellPrice(strategy: ArbitrageStrategy): number {
    const basePrice = 1.0;
    const spreadFraction = strategy.spreadBps / 10000;
    return basePrice * (1 + spreadFraction / 2);
  }
}
