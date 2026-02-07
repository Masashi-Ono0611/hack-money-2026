import {
  NitroliteClient,
  WalletStateSigner,
} from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { YellowClient } from './yellow-client.js';
import type { Hex, Address } from 'viem';

// ---------------------------------------------------------------------------
// Config – Sepolia sandbox
// ---------------------------------------------------------------------------

const SEPOLIA_CHAIN_ID = 11155111;
const CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262' as Address;
const ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as Address;
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as Address;
const ALLOCATE_AMOUNT = 20n;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rawKey = process.env.YELLOW_PRIVATE_KEY;
  if (!rawKey) {
    console.error('✗ YELLOW_PRIVATE_KEY not set');
    process.exit(1);
  }
  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex;

  const account = privateKeyToAccount(privateKey);
  console.log(`Wallet: ${account.address}`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
    account,
  });

  const nitrolite = new NitroliteClient({
    publicClient,
    walletClient,
    stateSigner: new WalletStateSigner(walletClient),
    addresses: { custody: CUSTODY_ADDRESS, adjudicator: ADJUDICATOR_ADDRESS },
    chainId: SEPOLIA_CHAIN_ID,
    challengeDuration: 3600n,
  });

  const yellow = new YellowClient({ privateKey });

  try {
    await yellow.connect();

    // 1. Check existing channels
    console.log('\n1. Checking existing channels...');
    const channelsResult = await yellow.getChannels();
    const channels = Array.isArray(channelsResult)
      ? channelsResult
      : (channelsResult as any)?.channels ?? [];

    const openChannel = channels.find((c: any) => c.status === 'open');

    if (openChannel) {
      console.log(`   ✓ Found open channel: ${openChannel.channel_id}`);
      console.log(`     amount=${openChannel.amount}, token=${openChannel.token}`);

      if (BigInt(openChannel.amount ?? 0) >= ALLOCATE_AMOUNT) {
        console.log(`   Already funded (${openChannel.amount}). Done.`);
        return;
      }
    } else {
      // 2. Request channel creation from ClearNode
      console.log('\n2. Requesting channel creation (Sepolia, ytest.usd)...');
      const createResult = await yellow.requestCreateChannel(
        SEPOLIA_CHAIN_ID,
        YTEST_USD_TOKEN,
      );

      const { channel_id, channel, state, server_signature } = createResult;
      console.log(`   ✓ Channel prepared: ${channel_id}`);

      // 3. Submit on-chain (same pattern as mashharuki/yellow-sample)
      console.log('\n3. Submitting on-chain transaction...');

      const unsignedInitialState = {
        intent: state.intent,
        version: BigInt(state.version),
        data: state.state_data,
        allocations: state.allocations.map((a: any) => ({
          destination: a.destination,
          token: a.token,
          amount: BigInt(a.amount),
        })),
      };

      const txResult = await nitrolite.createChannel({
        channel,
        unsignedInitialState,
        serverSignature: server_signature,
      } as any);
      const txHash = typeof txResult === 'string' ? txResult : txResult.txHash;
      console.log(`   ✓ Create channel tx: ${txHash}`);

      console.log('   Waiting for confirmation...');
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('   ✓ Channel created on-chain!');
    }

    // 4. Verify
    console.log('\n4. Verifying...');
    const finalChannels = await yellow.getChannels();
    const fc = Array.isArray(finalChannels)
      ? finalChannels
      : (finalChannels as any)?.channels ?? [];
    fc.forEach((c: any, i: number) => {
      console.log(`   [${i}] id=${c.channel_id} status=${c.status} amount=${c.amount}`);
    });

    console.log('\n=== Channel setup complete ===');
  } catch (err) {
    console.error('\n✗ Error:', err);
    process.exit(1);
  } finally {
    yellow.disconnect();
  }
}

main();
