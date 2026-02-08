import { ArcClient } from './arc-client.js';
import { SessionClient } from './session-client.js';
import type { SettlementRecord } from './types.js';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface AutoSettleArgs {
  sessionId: string;
  vaultWalletId: string;
  tokenSymbol: string;
  dryRun: boolean;
  overrideAmount: number | null;
}

function parseArgs(): AutoSettleArgs {
  const raw = process.argv.slice(2).filter((a) => a !== '--');
  const map = new Map<string, string>();

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '--dry-run') {
      map.set('dry-run', 'true');
      continue;
    }
    if (raw[i].startsWith('--') && i + 1 < raw.length) {
      map.set(raw[i].replace(/^--/, ''), raw[i + 1]);
      i++;
    }
  }

  const sessionId = map.get('session');
  if (!sessionId) {
    console.error('Usage: tsx scripts/settlement/auto-settle.ts \\');
    console.error('         --session <sessionId> \\');
    console.error('         [--vault-wallet <walletId>] \\');
    console.error('         [--token-symbol <USDC-TESTNET>] \\');
    console.error('         [--dry-run]');
    process.exit(1);
  }

  const amountStr = map.get('amount');
  return {
    sessionId,
    vaultWalletId:
      map.get('vault-wallet') ??
      process.env.ARC_WALLET_ID_OPERATOR_VAULT ??
      '',
    tokenSymbol: map.get('token-symbol') ?? 'USDC',
    dryRun: map.get('dry-run') === 'true',
    overrideAmount: amountStr ? parseFloat(amountStr) : null,
  };
}

// ---------------------------------------------------------------------------
// Idempotency key derived from sessionId (deterministic, no duplicates)
// ---------------------------------------------------------------------------

function deriveIdempotencyKey(sessionId: string): string {
  return createHash('sha256')
    .update(`settle:${sessionId}`)
    .digest('hex')
    .slice(0, 32);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<SettlementRecord> {
  const opts = parseArgs();

  if (!opts.vaultWalletId) {
    console.error(
      '✗ Vault wallet ID not set. Use --vault-wallet or ARC_WALLET_ID_OPERATOR_VAULT.',
    );
    process.exit(1);
  }

  console.log('=== Auto Settlement Pipeline ===\n');

  // 1. Fetch session result
  console.log(`1. Fetching session result: ${opts.sessionId}`);
  const session = new SessionClient();
  const result = await session.getResult(opts.sessionId);

  console.log(`   Chain A     : ${result.chainA}`);
  console.log(`   Chain B     : ${result.chainB}`);
  console.log(`   Net Profit  : ${result.netProfitUsdc} USDC`);
  console.log(`   Status      : ${result.status}`);

  // 2. Guard: skip if not profitable or not completed
  const profit = parseFloat(result.netProfitUsdc);

  if (result.status !== 'COMPLETED') {
    console.log(`\n⏭ Session not completed (${result.status}). Skipping.`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: `Session status: ${result.status}`,
    };
  }

  if (profit <= 0) {
    console.log(`\n⏭ No profit (${result.netProfitUsdc}). Skipping settlement.`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: 'No profit to settle',
    };
  }

  // 3. Resolve vault
  const arc = new ArcClient();

  console.log('\n2. Checking SOURCE balance...');
  const sourceBalances = await arc.getBalance(arc.getSourceWalletId());
  const usdcToken = sourceBalances.find(
    (b) => b.token.symbol === opts.tokenSymbol,
  );

  if (!usdcToken) {
    const err = `${opts.tokenSymbol} not found in SOURCE wallet`;
    console.error(`\n✗ ${err}`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: err,
    };
  }

  const available = parseFloat(usdcToken.amount);
  const settleAmount = opts.overrideAmount
    ? Math.min(opts.overrideAmount, available)
    : Math.min(profit, available);

  if (settleAmount <= 0) {
    const err = `Insufficient balance: available=${available}`;
    console.error(`\n✗ ${err}`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: err,
    };
  }

  console.log(`   Available   : ${available} ${opts.tokenSymbol}`);
  console.log(`   To settle   : ${settleAmount} ${opts.tokenSymbol}`);

  // 4. Vault balance before
  console.log('\n3. Checking Vault balance (before)...');
  const vaultBefore = await arc.getBalance(opts.vaultWalletId);
  const vaultUsdcBefore =
    vaultBefore.find((b) => b.token.symbol === opts.tokenSymbol)?.amount ??
    '0';
  console.log(`   Vault USDC  : ${vaultUsdcBefore}`);

  // 5. Resolve vault address
  const vaultAddress = await arc.getWalletAddress(opts.vaultWalletId);
  console.log(`   Vault addr  : ${vaultAddress}`);

  // 6. Dry-run guard
  if (opts.dryRun) {
    console.log('\n[DRY RUN] Would settle:');
    console.log(`   ${settleAmount} ${opts.tokenSymbol} → ${vaultAddress}`);
    console.log(`   Idempotency : ${deriveIdempotencyKey(opts.sessionId)}`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: 'dry-run',
    };
  }

  // 7. Transfer
  const idempotencyKey = deriveIdempotencyKey(opts.sessionId);
  console.log(`\n4. Transferring ${settleAmount} ${opts.tokenSymbol} → Vault...`);
  console.log(`   Idempotency : ${idempotencyKey}`);

  const initResult = await arc.transfer({
    tokenId: usdcToken.token.id,
    amount: String(settleAmount),
    destinationAddress: vaultAddress,
    idempotencyKey,
  });

  if (!initResult.success || !initResult.transactionId) {
    const err = `Transfer failed: ${initResult.error}`;
    console.error(`\n✗ ${err}`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      error: err,
    };
  }

  // 8. Wait for confirmation
  console.log('\n5. Waiting for confirmation...');
  const finalResult = await arc.waitForTransaction(initResult.transactionId);

  if (!finalResult.success) {
    const err = `Tx failed: ${finalResult.error}`;
    console.error(`\n✗ ${err}`);
    return {
      sessionId: opts.sessionId,
      netProfitUsdc: result.netProfitUsdc,
      settled: false,
      transactionId: initResult.transactionId,
      error: err,
    };
  }

  // 9. Vault balance after
  console.log('\n6. Verifying Vault balance (after)...');
  const vaultAfter = await arc.getBalance(opts.vaultWalletId);
  const vaultUsdcAfter =
    vaultAfter.find((b) => b.token.symbol === opts.tokenSymbol)?.amount ??
    '0';
  const delta = parseFloat(vaultUsdcAfter) - parseFloat(vaultUsdcBefore);

  // 10. Summary
  const record: SettlementRecord = {
    sessionId: opts.sessionId,
    netProfitUsdc: result.netProfitUsdc,
    settled: true,
    transactionId: initResult.transactionId,
    txHash: finalResult.txHash,
    vaultBalanceBefore: vaultUsdcBefore,
    vaultBalanceAfter: vaultUsdcAfter,
    settledAt: Date.now(),
  };

  console.log('\n=== Settlement Summary ===');
  console.log(`  Session   : ${record.sessionId}`);
  console.log(`  Profit    : ${record.netProfitUsdc} USDC`);
  console.log(`  Settled   : ${settleAmount} ${opts.tokenSymbol}`);
  console.log(`  Vault Δ   : +${delta.toFixed(6)} ${opts.tokenSymbol}`);
  console.log(`  Tx Hash   : ${record.txHash}`);
  console.log('=== Done ===');

  return record;
}

main().catch((err) => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
