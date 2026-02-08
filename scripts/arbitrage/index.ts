import { loadConfig } from './config.js';
import { PriceWatcher } from './price-watcher.js';
import { ArbitrageEngine } from './arbitrage-engine.js';
import { YellowSessionManager } from './yellow-session-manager.js';
import { Logger } from '../lib/logger.js';

const COMPONENT = 'Orchestrator';

async function main(): Promise<void> {
  // 1. Load config
  const config = loadConfig();
  const logger = new Logger(config.logLevel);

  logger.info(COMPONENT, 'Starting Offchain Arbitrage Engine', {
    chainA: config.chainA.name,
    chainB: config.chainB.name,
    pollIntervalMs: config.pollIntervalMs,
    thresholdBps: config.thresholdBps,
    logLevel: config.logLevel,
  });

  // 2. Initialize components
  const sessionManager = new YellowSessionManager(config, logger);
  const engine = new ArbitrageEngine(config, sessionManager, logger);
  const watcher = new PriceWatcher(config, logger);

  // 3. Connect pipeline: PriceWatcher → ArbitrageEngine
  watcher.onDiscrepancy((discrepancy) => {
    void engine.handleDiscrepancy(discrepancy).catch((err) => {
      logger.error(COMPONENT, 'Unhandled error in arbitrage pipeline', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });

  // 4. Graceful shutdown
  const shutdown = (): void => {
    logger.info(COMPONENT, 'Shutting down...');
    watcher.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', (reason) => {
    logger.error(COMPONENT, 'Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // 5. Start
  watcher.start();

  logger.info(COMPONENT, 'Arbitrage engine running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
