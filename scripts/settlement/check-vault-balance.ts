import { ArcClient } from './arc-client.js';

async function main() {
  const vaultWalletId =
    process.argv[2] ?? process.env.ARC_WALLET_ID_OPERATOR_VAULT ?? '';

  if (!vaultWalletId) {
    console.error(
      'Usage: tsx scripts/settlement/check-vault-balance.ts [vaultWalletId]',
    );
    console.error('  or set ARC_WALLET_ID_OPERATOR_VAULT in .env');
    process.exit(1);
  }

  const arc = new ArcClient();

  console.log('=== Operator Vault Balance Check ===\n');

  console.log(`Vault Wallet ID: ${vaultWalletId}`);

  const address = await arc.getWalletAddress(vaultWalletId);
  console.log(`Vault Address  : ${address}\n`);

  const balances = await arc.getBalance(vaultWalletId);

  if (balances.length === 0) {
    console.log('(no token balances found)');
    return;
  }

  console.log('Balances:');
  balances.forEach((b) => {
    console.log(
      `  ${b.token.symbol.padEnd(16)} ${b.amount.padStart(18)}  (${b.token.blockchain})`,
    );
  });

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
