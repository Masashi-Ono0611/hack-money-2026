/**
 * open-channel-direct.ts
 *
 * Bypasses NitroliteClient.createChannel (which uses personal_sign via
 * WalletStateSigner) and instead signs the packed state with raw ECDSA
 * (keccak256 + account.sign) to match the Custody contract's ecrecover.
 *
 * Usage: npx tsx --env-file=.env scripts/settlement/open-channel-direct.ts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodeAbiParameters,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
  getChannelId,
  getPackedState,
  CustodyAbi,
} from '@erc7824/nitrolite';
import { YellowClient } from './yellow-client.js';
import type { Hex, Address } from 'viem';

// ---------------------------------------------------------------------------
// Config – Sepolia sandbox
// ---------------------------------------------------------------------------

const SEPOLIA_CHAIN_ID = 11155111;
const CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262' as Address;
const YTEST_USD_TOKEN = '0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb' as Address;

// ---------------------------------------------------------------------------
// Raw ECDSA sign (same as SDK's signRawECDSAMessage — no personal_sign prefix)
// ---------------------------------------------------------------------------

async function signStateRawECDSA(
  privateKey: Hex,
  channelId: Hex,
  state: {
    intent: number;
    version: bigint;
    data: Hex;
    allocations: { destination: Address; token: Address; amount: bigint }[];
  },
): Promise<Hex> {
  const packed = getPackedState(channelId, state);
  const hash = keccak256(packed);
  const account = privateKeyToAccount(privateKey);
  return account.sign({ hash });
}

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
      console.log('   Channel already exists. Done.');
      return;
    }

    // 2. Request channel creation from ClearNode
    console.log('\n2. Requesting channel creation (Sepolia, ytest.usd)...');
    const createResult = await yellow.requestCreateChannel(
      SEPOLIA_CHAIN_ID,
      YTEST_USD_TOKEN,
    );

    const { channel_id, channel, state, server_signature } = createResult;
    console.log(`   ✓ Channel prepared: ${channel_id}`);
    console.log(`   Channel:`, JSON.stringify(channel, null, 2));
    console.log(`   State:`, JSON.stringify(state, null, 2));
    console.log(`   Server sig: ${server_signature}`);

    // 3. Build the channel & state structs
    const channelStruct = {
      participants: channel.participants as [Address, Address],
      adjudicator: channel.adjudicator as Address,
      challenge: BigInt(channel.challenge),
      nonce: BigInt(channel.nonce),
    };

    const unsignedState = {
      intent: state.intent as number,
      version: BigInt(state.version),
      data: (state.state_data ?? state.data ?? '0x') as Hex,
      allocations: state.allocations.map((a: any) => ({
        destination: a.destination as Address,
        token: a.token as Address,
        amount: BigInt(a.amount),
      })),
    };

    // 4. Compute channelId and sign with raw ECDSA
    const computedChannelId = getChannelId(channelStruct, SEPOLIA_CHAIN_ID);
    console.log(`\n3. Computed channelId: ${computedChannelId}`);
    console.log(`   ClearNode channelId: ${channel_id}`);
    console.log(`   Match: ${computedChannelId === channel_id}`);

    const userSignature = await signStateRawECDSA(
      privateKey,
      computedChannelId as Hex,
      unsignedState,
    );
    console.log(`   User signature (raw ECDSA): ${userSignature}`);

    // 5. Build signed state
    const signedState = {
      ...unsignedState,
      sigs: [userSignature, server_signature as Hex],
    };

    // 6. Submit on-chain directly via Custody ABI
    console.log('\n4. Submitting on-chain transaction (direct Custody.create)...');

    const { request } = await publicClient.simulateContract({
      address: CUSTODY_ADDRESS,
      abi: CustodyAbi,
      functionName: 'create',
      args: [channelStruct, signedState],
      account,
    });

    const txHash = await walletClient.writeContract(request);
    console.log(`   ✓ Create channel tx: ${txHash}`);

    console.log('   Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`   ✓ Channel created on-chain! Block: ${receipt.blockNumber}`);

    // 7. Verify
    console.log('\n5. Verifying...');
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
