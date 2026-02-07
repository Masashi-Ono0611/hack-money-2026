import { ArcClient } from './arc-client.js';
import type { SettlementRecord } from './types.js';
import { createHash } from 'crypto';

const COMPONENT = 'SettlementOrchestrator';
const MAX_RETRIES = 3;

interface SettlementOrchestratorConfig {
  vaultWalletId: string;
  tokenSymbol: string;
}

interface Logger {
  info(component: string, message: string, context?: Record<string, unknown>): void;
  warn(component: string, message: string, context?: Record<string, unknown>): void;
  error(component: string, message: string, context?: Record<string, unknown>): void;
}

export class SettlementOrchestrator {
  private readonly arc: ArcClient;
  private readonly config: SettlementOrchestratorConfig;
  private readonly logger: Logger;

  constructor(config: SettlementOrchestratorConfig, logger: Logger) {
    this.arc = new ArcClient();
    this.config = config;
    this.logger = logger;
  }

  async settleProfit(
    sessionId: string,
    profitUsdc: string,
  ): Promise<SettlementRecord> {
    const profit = parseFloat(profitUsdc);

    if (profit <= 0) {
      this.logger.info(COMPONENT, 'No profit to settle', { sessionId, profitUsdc });
      return {
        sessionId,
        netProfitUsdc: profitUsdc,
        settled: false,
        error: 'No profit to settle',
      };
    }

    this.logger.info(COMPONENT, 'Starting settlement', { sessionId, profitUsdc });

    // Retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.executeSettlement(sessionId, profitUsdc, profit);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(COMPONENT, `Settlement attempt ${attempt} failed`, {
          sessionId,
          attempt,
          error: errorMsg,
        });

        if (attempt === MAX_RETRIES) {
          this.logger.error(COMPONENT, 'All settlement attempts failed', {
            sessionId,
            error: errorMsg,
          });
          return {
            sessionId,
            netProfitUsdc: profitUsdc,
            settled: false,
            error: `All ${MAX_RETRIES} attempts failed: ${errorMsg}`,
          };
        }

        // Exponential backoff
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    // Should not reach here
    return { sessionId, netProfitUsdc: profitUsdc, settled: false, error: 'Unexpected' };
  }

  private async executeSettlement(
    sessionId: string,
    profitUsdc: string,
    profit: number,
  ): Promise<SettlementRecord> {
    // 1. Check source balance
    const sourceBalances = await this.arc.getBalance(this.arc.getSourceWalletId());
    const usdcToken = sourceBalances.find(
      (b) => b.token.symbol === this.config.tokenSymbol,
    );

    if (!usdcToken) {
      throw new Error(`${this.config.tokenSymbol} not found in source wallet`);
    }

    const available = parseFloat(usdcToken.amount);
    const settleAmount = Math.min(profit, available);

    if (settleAmount <= 0) {
      throw new Error(`Insufficient balance: available=${available}`);
    }

    // 2. Get vault balance before
    const vaultBefore = await this.arc.getBalance(this.config.vaultWalletId);
    const vaultUsdcBefore =
      vaultBefore.find((b) => b.token.symbol === this.config.tokenSymbol)?.amount ?? '0';

    // 3. Resolve vault address
    const vaultAddress = await this.arc.getWalletAddress(this.config.vaultWalletId);

    // 4. Transfer
    const idempotencyKey = createHash('sha256')
      .update(`settle:${sessionId}`)
      .digest('hex')
      .slice(0, 32);

    this.logger.info(COMPONENT, 'Transferring to vault', {
      sessionId,
      amount: settleAmount,
      vaultAddress,
    });

    const initResult = await this.arc.transfer({
      tokenId: usdcToken.token.id,
      amount: String(settleAmount),
      destinationAddress: vaultAddress,
      idempotencyKey,
    });

    if (!initResult.success || !initResult.transactionId) {
      throw new Error(`Transfer initiation failed: ${initResult.error}`);
    }

    // 5. Wait for confirmation
    const finalResult = await this.arc.waitForTransaction(initResult.transactionId);

    if (!finalResult.success) {
      throw new Error(`Transaction failed: ${finalResult.error}`);
    }

    // 6. Verify vault balance after
    const vaultAfter = await this.arc.getBalance(this.config.vaultWalletId);
    const vaultUsdcAfter =
      vaultAfter.find((b) => b.token.symbol === this.config.tokenSymbol)?.amount ?? '0';

    const record: SettlementRecord = {
      sessionId,
      netProfitUsdc: profitUsdc,
      settled: true,
      transactionId: initResult.transactionId,
      txHash: finalResult.txHash,
      vaultBalanceBefore: vaultUsdcBefore,
      vaultBalanceAfter: vaultUsdcAfter,
      settledAt: Date.now(),
    };

    this.logger.info(COMPONENT, 'Settlement completed', {
      sessionId,
      txHash: finalResult.txHash,
      vaultBalanceBefore: vaultUsdcBefore,
      vaultBalanceAfter: vaultUsdcAfter,
    });

    return record;
  }
}
