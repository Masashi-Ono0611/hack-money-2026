import { ArcClient } from './arc-client.js';

// ---------------------------------------------------------------------------
// CLI argument parsing (minimal – no external deps)
// ---------------------------------------------------------------------------

interface SettleArgs {
  amount: string;
  vaultWalletId: string;
  tokenSymbol: string;
  idempotencyKey?: string;
  dryRun: boolean;
}

function parseArgs(): SettleArgs {
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

  const amount = map.get('amount');
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    console.error('Usage: tsx scripts/settlement/settle-to-vault.ts \\');
    console.error('         --amount <USDC amount> \\');
    console.error('         [--vault-wallet <walletId>] \\');
    console.error('         [--token-symbol <USDC-TESTNET>] \\');
    console.error('         [--idempotency-key <uuid>] \\');
    console.error('         [--dry-run]');
    process.exit(1);
  }

  return {
    amount,
    vaultWalletId:
      map.get('vault-wallet') ??
      process.env.ARC_WALLET_ID_OPERATOR_VAULT ??
      '',
    tokenSymbol: map.get('token-symbol') ?? 'USDC-TESTNET',
    idempotencyKey: map.get('idempotency-key'),
    dryRun: map.get('dry-run') === 'true',
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (!opts.vaultWalletId) {
    console.error(
      '✗ Vault wallet ID not specified. Set ARC_WALLET_ID_OPERATOR_VAULT or pass --vault-wallet.',
    );
    process.exit(1);
  }

  console.log('=== Arc Settlement → Operator Vault ===\n');

  const arc = new ArcClient();

  // 1. Check source balance
  console.log('1. Checking SOURCE wallet balance...');
  const sourceBalances = await arc.getBalance(arc.getSourceWalletId());
  sourceBalances.forEach((b) =>
    console.log(`   ${b.token.symbol}: ${b.amount}`),
  );

  const usdcToken = sourceBalances.find(
    (b) => b.token.symbol === opts.tokenSymbol,
  );
  if (!usdcToken) {
    console.error(`\n✗ ${opts.tokenSymbol} not found in SOURCE wallet`);
    process.exit(1);
  }

  const available = parseFloat(usdcToken.amount);
  const requested = parseFloat(opts.amount);
  if (available < requested) {
    console.error(
      `\n✗ Insufficient balance: available=${available}, requested=${requested}`,
    );
    process.exit(1);
  }

  // 2. Check vault balance (before)
  console.log('\n2. Checking Operator Vault balance (before)...');
  const vaultBalancesBefore = await arc.getBalance(opts.vaultWalletId);
  vaultBalancesBefore.forEach((b) =>
    console.log(`   ${b.token.symbol}: ${b.amount}`),
  );

  // 3. Resolve vault on-chain address
  console.log('\n3. Resolving Operator Vault address...');
  const vaultAddress = await arc.getWalletAddress(opts.vaultWalletId);
  console.log(`   Vault address: ${vaultAddress}`);

  // 4. Dry-run guard
  if (opts.dryRun) {
    console.log('\n[DRY RUN] Would transfer:');
    console.log(`   ${opts.amount} ${opts.tokenSymbol} → ${vaultAddress}`);
    console.log('[DRY RUN] Exiting without sending.');
    return;
  }

  // 5. Execute transfer
  console.log(
    `\n4. Transferring ${opts.amount} ${opts.tokenSymbol} → Vault...`,
  );
  const initResult = await arc.transfer({
    tokenId: usdcToken.token.id,
    amount: opts.amount,
    destinationAddress: vaultAddress,
    idempotencyKey: opts.idempotencyKey,
  });

  if (!initResult.success || !initResult.transactionId) {
    console.error(`\n✗ Transfer initiation failed: ${initResult.error}`);
    process.exit(1);
  }
  console.log(`   Transaction initiated: ${initResult.transactionId}`);

  // 6. Wait for confirmation
  console.log('\n5. Waiting for on-chain confirmation...');
  const finalResult = await arc.waitForTransaction(
    initResult.transactionId,
  );

  if (!finalResult.success) {
    console.error(`\n✗ Settlement failed: ${finalResult.error}`);
    process.exit(1);
  }

  console.log(`   ✓ Settlement confirmed!`);
  console.log(`     Tx Hash : ${finalResult.txHash}`);
  console.log(`     Status  : ${finalResult.status}`);

  // 7. Verify balances (after)
  console.log('\n6. Verifying balances (after)...');

  const sourceAfter = await arc.getBalance(arc.getSourceWalletId());
  console.log('   SOURCE:');
  sourceAfter.forEach((b) =>
    console.log(`     ${b.token.symbol}: ${b.amount}`),
  );

  const vaultAfter = await arc.getBalance(opts.vaultWalletId);
  console.log('   VAULT:');
  vaultAfter.forEach((b) =>
    console.log(`     ${b.token.symbol}: ${b.amount}`),
  );

  // 8. Summary
  const vaultUsdcBefore =
    vaultBalancesBefore.find((b) => b.token.symbol === opts.tokenSymbol)
      ?.amount ?? '0';
  const vaultUsdcAfter =
    vaultAfter.find((b) => b.token.symbol === opts.tokenSymbol)?.amount ??
    '0';
  const delta = parseFloat(vaultUsdcAfter) - parseFloat(vaultUsdcBefore);

  console.log('\n=== Settlement Summary ===');
  console.log(`  Settled   : ${opts.amount} ${opts.tokenSymbol}`);
  console.log(`  Vault Δ   : +${delta.toFixed(6)} ${opts.tokenSymbol}`);
  console.log(`  Tx Hash   : ${finalResult.txHash}`);
  console.log('=== Done ===');
}

main().catch((err) => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
