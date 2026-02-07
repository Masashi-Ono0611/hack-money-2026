import { YellowClient } from './yellow-client.js';
import type { Hex } from 'viem';

async function main() {
  const rawKey = process.env.YELLOW_PRIVATE_KEY;
  const privateKey = rawKey
    ? (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex
    : undefined;
  const wsUrl = process.env.YELLOW_WS_URL;

  if (!privateKey) {
    console.error('✗ YELLOW_PRIVATE_KEY not set in .env');
    console.error('  This test requires a private key to connect to ClearNode Sandbox.');
    console.error('');
    console.error('  Steps:');
    console.error('  1. Go to https://apps.yellow.com and connect your wallet');
    console.error('  2. Open a State Channel on Base Sepolia or Polygon Amoy');
    console.error('  3. Use the Yellow faucet to get ytest.usd tokens');
    console.error('  4. Set YELLOW_PRIVATE_KEY=0x... in your .env');
    process.exit(1);
  }

  const envUrl = wsUrl ?? 'wss://clearnet-sandbox.yellow.com/ws';
  const isSandbox = envUrl.includes('sandbox');

  console.log('=== Yellow ClearNode Connection Test ===\n');
  console.log(`   Environment : ${isSandbox ? 'Sandbox (testnet)' : 'Production'}`);
  console.log(`   WebSocket   : ${envUrl}`);
  console.log(`   Asset       : ${isSandbox ? 'ytest.usd' : 'usdc'}\n`);

  const yellow = new YellowClient({ privateKey, wsUrl: envUrl });

  try {
    // 1. Connect & authenticate
    console.log('1. Connecting & authenticating...');
    await yellow.connect();
    console.log(`   ✓ Connected as: ${yellow.getAddress()}`);

    // 2. Get channels
    console.log('\n2. Fetching channels...');
    const channelsResult = await yellow.getChannels();
    const channels = Array.isArray(channelsResult)
      ? channelsResult
      : (channelsResult as any)?.channels ?? [];
    console.log(`   Found ${channels.length} channel(s)`);
    channels.forEach((ch: any, i: number) => {
      console.log(`   [${i}] id=${ch.channel_id} status=${ch.status} amount=${ch.amount}`);
    });

    // 3. Get balances
    console.log('\n3. Fetching ledger balances...');
    const balancesResult = await yellow.getBalances();
    const balances = Array.isArray(balancesResult)
      ? balancesResult
      : (balancesResult as any)?.balances ?? [];
    if (balances.length === 0) {
      console.log('   (no balances found – use the Yellow faucet to get ytest.usd)');
    } else {
      balances.forEach((b: any) => {
        console.log(`   ${b.asset}: ${b.amount}`);
      });
    }

    console.log('\n=== All tests passed ===');
  } catch (err) {
    console.error('\n✗ Test failed:', err);
    process.exit(1);
  } finally {
    yellow.disconnect();
  }
}

main();
