/**
 * Hackathon Demo Script
 *
 * Automates the full Zombie L2 Clearinghouse flow:
 * 1. Simulate L2 utilization changes via Oracle
 * 2. Detect price discrepancy across chains
 * 3. Execute arbitrage via Yellow session (ClearNode)
 * 4. Settle profit to Operator Vault
 * 5. Display summary
 */

import "dotenv/config";
import { ArbitrageEngine } from '../arbitrage/arbitrage-engine.js';
import { loadConfig } from '../arbitrage/config.js';
import { PriceWatcher } from '../arbitrage/price-watcher.js';
import type { ArbitrageResult, PriceDiscrepancy } from '../arbitrage/types.js';
import { YellowSessionManager } from '../arbitrage/yellow-session-manager.js';
import { SettlementOrchestrator } from '../settlement/settlement-orchestrator.js';
import { Logger } from '../lib/logger.js';

const COMPONENT = 'DemoScript';

interface DemoStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';
  detail?: string;
  durationMs?: number;
}

class DemoRunner {
  private logger: Logger;
  private steps: DemoStep[] = [];
  private results: ArbitrageResult[] = [];
  private startTime = 0;

  constructor(private logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    this.logger = new Logger(logLevel);
  }

  private addStep(label: string): number {
    const idx = this.steps.length;
    this.steps.push({ label, status: 'pending' });
    return idx;
  }

  private markStep(idx: number, status: DemoStep['status'], detail?: string) {
    this.steps[idx].status = status;
    if (detail) this.steps[idx].detail = detail;
  }

  private printBanner() {
    const banner = [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║          GHOST YIELD — Zombie L2 Clearinghouse          ║',
      '║              Hackathon Demo Script v1.0                  ║',
      '╚══════════════════════════════════════════════════════════╝',
      '',
    ];
    for (const line of banner) {
      console.log(line);
    }
  }

  private printStepHeader(stepNum: number, label: string) {
    console.log(`\n${'─'.repeat(56)}`);
    console.log(`  STEP ${stepNum}: ${label}`);
    console.log(`${'─'.repeat(56)}`);
  }

  /**
   * デモコード
   * @returns
   */
  async run() {
    this.printBanner();
    this.startTime = Date.now();

    // ── Step 1: Load Configuration ──
    const s1 = this.addStep('Load Configuration');
    this.printStepHeader(1, 'LOAD CONFIGURATION');
    this.markStep(s1, 'running');

    let config;

    try {
      config = loadConfig();
      this.logger.info(COMPONENT, 'Configuration loaded', {
        chainA: config.chainA.name,
        chainB: config.chainB.name,
        thresholdBps: config.thresholdBps,
      });
      this.markStep(s1, 'done', `Chain A: ${config.chainA.name}, Chain B: ${config.chainB.name}`);
      console.log(`  ✅ Chain A: ${config.chainA.name} (ID: ${config.chainA.chainId})`);
      console.log(`  ✅ Chain B: ${config.chainB.name} (ID: ${config.chainB.chainId})`);
      console.log(`  ✅ Threshold: ${config.thresholdBps} bps`);
      console.log(`  ✅ Yellow SDK: LIVE (ClearNode)`);
    } catch (err) {
      this.markStep(s1, 'failed', String(err));
      console.log(`  ❌ Failed to load config: ${err}`);
      console.log('  💡 Hint: Set CHAIN_A_RPC_URL and CHAIN_B_RPC_URL environment variables');
      this.printSummary();
      return;
    }

    // ── Step 2: Initialize Components ──
    const s2 = this.addStep('Initialize Components');
    this.printStepHeader(2, 'INITIALIZE COMPONENTS');
    this.markStep(s2, 'running');

    const sessionManager = new YellowSessionManager(config, this.logger);
    const engine = new ArbitrageEngine(config, sessionManager, this.logger);
    const watcher = new PriceWatcher(config, this.logger);

    console.log('  ✅ PriceWatcher initialized');
    console.log('  ✅ ArbitrageEngine initialized');
    console.log(`  ✅ YellowSessionManager initialized (Yellow ClearNode)`);
    this.markStep(s2, 'done');

    // ── Step 3: Fetch Current Prices ──
    const s3 = this.addStep('Fetch Current Prices');
    this.printStepHeader(3, 'FETCH CURRENT PRICES');
    this.markStep(s3, 'running');

    let discrepancy: PriceDiscrepancy | null = null;

    try {
      // Poll once to get current prices
      const pollResult = await this.pollOnce(watcher);
      if (pollResult) {
        discrepancy = pollResult;
        const snap = pollResult.snapshot;
        console.log(`  📊 Chain A (${config.chainA.name}):`);
        console.log(`     Price: $${snap.chainA.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
        console.log(`     Tick:  ${snap.chainA.tick}`);
        console.log(`  📊 Chain B (${config.chainB.name}):`);
        console.log(`     Price: $${snap.chainB.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
        console.log(`     Tick:  ${snap.chainB.tick}`);
        console.log(`  📈 Spread: ${snap.spreadBps.toFixed(2)} bps`);
        console.log(`  📈 Direction: ${pollResult.direction}`);
        this.markStep(s3, 'done', `Spread: ${snap.spreadBps.toFixed(2)} bps`);
      } else {
        console.log('  ⚠️  No price discrepancy detected above threshold');
        console.log(`     Threshold: ${config.thresholdBps} bps`);
        console.log('  💡 Simulating price discrepancy for demo...');
        discrepancy = this.simulateDiscrepancy();
        const snap = discrepancy.snapshot;
        console.log(`  📊 Simulated Chain A: $${snap.chainA.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
        console.log(`  📊 Simulated Chain B: $${snap.chainB.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
        console.log(`  📈 Simulated Spread: ${snap.spreadBps.toFixed(2)} bps`);
        this.markStep(s3, 'done', `Simulated spread: ${snap.spreadBps.toFixed(2)} bps`);
      }
    } catch (err) {
      console.log(`  ⚠️  RPC fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      console.log('  💡 Using simulated prices for demo...');
      discrepancy = this.simulateDiscrepancy();
      const snap = discrepancy.snapshot;
      console.log(`  📊 Simulated Chain A: $${snap.chainA.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
      console.log(`  📊 Simulated Chain B: $${snap.chainB.priceUsdcPerCpt.toFixed(6)} USDC/CPT`);
      console.log(`  📈 Simulated Spread: ${snap.spreadBps.toFixed(2)} bps`);
      this.markStep(s3, 'done', `Simulated spread: ${snap.spreadBps.toFixed(2)} bps`);
    }

    // ── Step 4: Execute Arbitrage ──
    const s4 = this.addStep('Execute Arbitrage');
    this.printStepHeader(4, 'EXECUTE ARBITRAGE');
    this.markStep(s4, 'running');

    try {
      // Execute arbitrage based on detected discrepancy
      const result = await engine.handleDiscrepancy(discrepancy);

      if (result) {
        this.results.push(result);
        if (result.success) {
          console.log(`  ✅ Arbitrage executed successfully`);
          console.log(`     Session: ${result.sessionId}`);
          console.log(`     Direction: ${result.strategy.direction}`);
          console.log(`     Orders: ${result.ordersExecuted}`);
          console.log(`     Profit: ${Number(result.actualProfitUsdc) / 1e6} USDC`);
          this.markStep(s4, 'done', `Profit: ${Number(result.actualProfitUsdc) / 1e6} USDC`);
        } else {
          console.log(`  ⚠️  Arbitrage failed: ${result.error}`);
          this.markStep(s4, 'failed', result.error);
        }
      } else {
        console.log('  ⚠️  Arbitrage skipped (risk check or cooldown)');
        this.markStep(s4, 'skipped', 'Risk check or cooldown');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Arbitrage error: ${msg}`);
      this.markStep(s4, 'failed', msg);
    }

    // ── Step 5: Settlement via Arc ──
    const s5 = this.addStep('Settlement via Arc');
    this.printStepHeader(5, 'SETTLEMENT');
    this.markStep(s5, 'running');

    if (this.results.length > 0 && this.results[0].success) {
      const profitRaw = this.results[0].actualProfitUsdc;
      const profit = Number(profitRaw) / 1e6;

      if (profit <= 0) {
        console.log('  ℹ️  No positive profit to settle');
        this.markStep(s5, 'skipped', 'No positive profit');
      } else {
        console.log(`  💰 Profit to settle: $${profit.toFixed(6)} USDC`);
        console.log('  📋 Settling to Operator Vault via Arc (Circle Programmable Wallets)');

        await this.executeSettlement(
          s5,
          this.results[0].sessionId,
          profit.toFixed(6),
        );
      }
    } else {
      console.log('  ℹ️  No profit to settle');
      this.markStep(s5, 'skipped', 'No profit');
    }

    // ── Summary ──
    this.printSummary();
  }

  private async executeSettlement(
    stepIdx: number,
    sessionId: string,
    profitUsdc: string,
  ): Promise<void> {
    const arcApiKey = process.env.ARC_API_KEY;
    const vaultWalletId = process.env.ARC_WALLET_ID_OPERATOR_VAULT;

    if (!arcApiKey || !vaultWalletId) {
      console.log('  ⚠️  ARC_API_KEY or ARC_WALLET_ID_OPERATOR_VAULT not set');
      console.log('  ℹ️  Skipping actual settlement (credentials missing)');
      console.log(`  📋 Would settle $${profitUsdc} USDC → Operator Vault`);
      this.markStep(stepIdx, 'skipped', `$${profitUsdc} USDC (credentials missing)`);
      return;
    }

    try {
      const tokenSymbol = process.env.ARC_TOKEN_SYMBOL ?? 'USDC';
      const orchestrator = new SettlementOrchestrator(
        { vaultWalletId, tokenSymbol },
        this.logger,
      );

      const record = await orchestrator.settleProfit(sessionId, profitUsdc);

      if (record.settled) {
        console.log(`  ✅ Settlement completed!`);
        console.log(`     Tx Hash: ${record.txHash}`);
        console.log(`     Vault before: ${record.vaultBalanceBefore} USDC`);
        console.log(`     Vault after:  ${record.vaultBalanceAfter} USDC`);
        this.markStep(stepIdx, 'done', `$${profitUsdc} USDC settled (tx: ${record.txHash?.slice(0, 10)}...)`);
      } else {
        console.log(`  ⚠️  Settlement not completed: ${record.error}`);
        this.markStep(stepIdx, 'failed', record.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Settlement error: ${msg}`);
      this.markStep(stepIdx, 'failed', msg);
    }
  }

  private async pollOnce(watcher: PriceWatcher): Promise<PriceDiscrepancy | null> {
    return new Promise((resolve) => {
      let resolved = false;
      watcher.onDiscrepancy((d) => {
        if (!resolved) {
          resolved = true;
          watcher.stop();
          resolve(d);
        }
      });

      // Start polling, then stop after first cycle
      watcher.start();

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          watcher.stop();
          resolve(null);
        }
      }, 15_000);
    });
  }

  /**
   * デモ用の価格乖離をシミュレートします
   * @returns
   */
  private simulateDiscrepancy(): PriceDiscrepancy {
    const priceA = 0.9847;
    const priceB = 1.0213;
    const avg = (priceA + priceB) / 2;
    const spreadBps = (Math.abs(priceA - priceB) / avg) * 10000;

    return {
      snapshot: {
        chainA: {
          sqrtPriceX96: 0n,
          tick: -152,
          priceUsdcPerCpt: priceA,
          timestamp: Date.now(),
        },
        chainB: {
          sqrtPriceX96: 0n,
          tick: 213,
          priceUsdcPerCpt: priceB,
          timestamp: Date.now(),
        },
        spreadBps,
      },
      direction: 'A_CHEAPER',
      timestamp: Date.now(),
    };
  }

  /**
   * デモのサマリーを表示します
   */
  private printSummary() {
    const elapsed = Date.now() - this.startTime;

    console.log(`\n${'═'.repeat(56)}`);
    console.log('  DEMO SUMMARY');
    console.log(`${'═'.repeat(56)}`);

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const icon =
        step.status === 'done' ? '✅' :
        step.status === 'failed' ? '❌' :
        step.status === 'skipped' ? '⏭️ ' :
        '⏳';
      const detail = step.detail ? ` — ${step.detail}` : '';
      console.log(`  ${icon} Step ${i + 1}: ${step.label}${detail}`);
    }

    console.log('');

    const totalProfit = this.results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + Number(r.actualProfitUsdc) / 1e6, 0);

    console.log(`  📊 Total Arbitrage Profit: $${totalProfit.toFixed(6)} USDC`);
    console.log(`  ⏱️  Total Duration: ${elapsed}ms`);
    console.log(`  🔧 Yellow SDK: LIVE (ClearNode)`);
    console.log(`  📦 Sessions Executed: ${this.results.length}`);

    console.log(`\n${'═'.repeat(56)}`);
    console.log('  Ghost Yield — Turn idle L2 compute into USDC revenue');
    console.log(`${'═'.repeat(56)}\n`);
  }
}

// ── Entry Point ──
const runner = new DemoRunner(
  (process.env.LOG_LEVEL as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') ?? 'INFO',
);

runner.run().catch((err) => {
  console.error('Fatal demo error:', err);
  process.exit(1);
});
