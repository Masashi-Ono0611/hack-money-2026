/**
 * Circle Paymaster Example
 *
 * Demonstrates paying gas fees in USDC instead of native tokens (ETH)
 * - Uses Circle Paymaster (ERC-4337)
 * - Users pay in USDC instead of holding ETH
 * - Simplified UX for USDC-native applications
 */

import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { mainnet, arbitrum, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const BUNDLER_URL = process.env.BUNDLER_URL || 'https://bundler.example.com';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable required');
}

// Circle Paymaster Addresses (Mainnet)
const PAYMASTER_ADDRESSES: Record<string, `0x${string}`> = {
  'ethereum': '0x...',     // Ethereum Mainnet
  'arbitrum': '0x...',     // Arbitrum One
  'base': '0x...',         // Base
  'optimism': '0x...',     // Optimism
  'polygon': '0x...',      // Polygon
  'avalanche': '0x...'     // Avalanche
};

// USDC Addresses
const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};

// EntryPoint v0.7 Address (ERC-4337)
const ENTRYPOINT_V07_ADDRESS: `0x${string}` = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// ============================================================================
// ABIs
// ============================================================================

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

const PAYMASTER_ABI = [
  {
    inputs: [
      { name: 'userOp', type: 'tuple', components: [] },
      { name: 'requiredPrefund', type: 'uint256' }
    ],
    name: 'validatePaymasterUserOp',
    outputs: [
      { name: 'context', type: 'bytes' },
      { name: 'validationData', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ============================================================================
// UserOperation Type (ERC-4337)
// ============================================================================

interface UserOperation {
  sender: `0x${string}`;
  nonce: bigint;
  callData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  signature: `0x${string}`;
  // Paymaster fields
  paymasterAndData?: `0x${string}`;
}

// ============================================================================
// 1. Create UserOperation with Paymaster
// ============================================================================

async function createUserOpWithPaymaster(
  chain: string,
  senderAddress: `0x${string}`,
  targetAddress: `0x${string}`,
  value: bigint,
  data: `0x${string}`
): Promise<UserOperation> {
  console.log('\n=== Creating UserOperation with Paymaster ===\n');

  const publicClient = createPublicClient({
    chain: getChainConfig(chain),
    transport: http()
  });

  // Get nonce for smart account
  const nonce = await publicClient.getTransactionCount({
    address: senderAddress
  });

  // Estimate gas
  const gasEstimate = await publicClient.estimateGas({
    account: senderAddress,
    to: targetAddress,
    value,
    data
  });

  // Get gas prices
  const gasPrice = await publicClient.getGasPrice();

  // Build UserOperation
  const userOp: UserOperation = {
    sender: senderAddress,
    nonce: BigInt(nonce),
    callData: data,
    callGasLimit: gasEstimate,
    verificationGasLimit: BigInt(100000),
    preVerificationGas: BigInt(21000),
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice / BigInt(2),
    signature: '0x',
    // Include Paymaster address
    paymasterAndData: PAYMASTER_ADDRESSES[chain] || '0x'
  };

  console.log('UserOperation created:');
  console.log('  Sender:', userOp.sender);
  console.log('  Paymaster:', PAYMASTER_ADDRESSES[chain]);
  console.log('  CallGasLimit:', userOp.callGasLimit.toString());

  return userOp;
}

// ============================================================================
// 2. Sign UserOperation
// ============================================================================

async function signUserOperation(
  userOp: UserOperation,
  account: any,
  chainId: number
): Promise<UserOperation> {
  console.log('\n=== Signing UserOperation ===\n');

  // Create hash to sign
  const userOpHash = getUserOperationHash(userOp, chainId);

  // Sign with account
  const signature = await account.signMessage({
    message: { raw: userOpHash }
  });

  const signedUserOp = {
    ...userOp,
    signature: signature as `0x${string}`
  };

  console.log('✅ UserOperation signed');
  console.log('  Signature:', signature.slice(0, 20) + '...');

  return signedUserOp;
}

// ============================================================================
// 3. Submit UserOperation to Bundler
// ============================================================================

async function submitUserOperation(
  userOp: UserOperation
): Promise<string> {
  console.log('\n=== Submitting UserOperation to Bundler ===\n');

  try {
    const response = await fetch(BUNDLER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, ENTRYPOINT_V07_ADDRESS]
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`Bundler error: ${result.error.message}`);
    }

    const userOpHash = result.result;
    console.log('✅ UserOperation submitted');
    console.log('  UserOp Hash:', userOpHash);

    return userOpHash;

  } catch (error: any) {
    console.error('❌ Failed to submit UserOperation:', error.message);
    throw error;
  }
}

// ============================================================================
// 4. Wait for UserOperation Receipt
// ============================================================================

async function waitForUserOpReceipt(
  userOpHash: string
): Promise<any> {
  console.log('\n=== Waiting for UserOperation Receipt ===\n');

  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(BUNDLER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash]
        })
      });

      const result = await response.json();

      if (result.result) {
        console.log('✅ UserOperation executed!');
        console.log('  Transaction Hash:', result.result.receipt.transactionHash);
        console.log('  Gas Used (USDC):', calculateUSDCGasCost(result.result));

        return result.result;
      }

      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

    } catch (error: any) {
      console.error('Error checking receipt:', error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  throw new Error('UserOperation receipt timeout');
}

// ============================================================================
// 5. Complete USDC Transfer with Paymaster
// ============================================================================

async function transferUSDCWithPaymaster(
  chain: string,
  recipientAddress: `0x${string}`,
  amount: string
) {
  console.log('\n🚀 USDC Transfer with Paymaster\n');
  console.log('Chain:', chain);
  console.log('Recipient:', recipientAddress);
  console.log('Amount:', amount, 'USDC');
  console.log('Gas payment: USDC (via Paymaster)\n');

  try {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const usdcAddress = USDC_ADDRESSES[chain];

    if (!usdcAddress) {
      throw new Error(`USDC not supported on ${chain}`);
    }

    // 1. Encode transfer call
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipientAddress, parseUnits(amount, 6)]
    });

    // 2. Create UserOperation
    const userOp = await createUserOpWithPaymaster(
      chain,
      account.address,
      usdcAddress,
      BigInt(0),
      transferData
    );

    // 3. Sign UserOperation
    const chainId = getChainId(chain);
    const signedUserOp = await signUserOperation(userOp, account, chainId);

    // 4. Submit to bundler
    const userOpHash = await submitUserOperation(signedUserOp);

    // 5. Wait for execution
    const receipt = await waitForUserOpReceipt(userOpHash);

    console.log('\n✅ Transfer complete!');
    console.log('Summary:');
    console.log('  Amount transferred:', amount, 'USDC');
    console.log('  Gas paid in: USDC');
    console.log('  Transaction:', receipt.receipt.transactionHash);

    return receipt;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getChainConfig(chain: string) {
  const configs: Record<string, any> = {
    'ethereum': mainnet,
    'arbitrum': arbitrum,
    'base': base
  };

  return configs[chain] || mainnet;
}

function getChainId(chain: string): number {
  const chainIds: Record<string, number> = {
    'ethereum': 1,
    'arbitrum': 42161,
    'base': 8453,
    'optimism': 10,
    'polygon': 137
  };

  return chainIds[chain] || 1;
}

function getUserOperationHash(userOp: UserOperation, chainId: number): `0x${string}` {
  // Simplified - in production, use proper ERC-4337 hash calculation
  // This would involve packing the UserOperation and hashing with EntryPoint and chainId
  const packed = `${userOp.sender}${userOp.nonce}${chainId}`;
  return `0x${packed}` as `0x${string}`;
}

function calculateUSDCGasCost(receipt: any): string {
  // Calculate gas cost in USDC based on receipt
  // In production, parse Paymaster events for exact USDC amount
  const gasUsed = BigInt(receipt.receipt.gasUsed);
  const effectiveGasPrice = BigInt(receipt.receipt.effectiveGasPrice);
  const gasCostInWei = gasUsed * effectiveGasPrice;

  // Rough conversion (would need oracle price in production)
  // Assuming 1 ETH = 2000 USDC
  const gasCostInUSDC = Number(gasCostInWei) / 1e18 * 2000;

  return gasCostInUSDC.toFixed(2);
}

// ============================================================================
// 6. Check Paymaster Balance
// ============================================================================

async function checkPaymasterBalance(chain: string): Promise<string> {
  console.log('\n=== Checking Paymaster Balance ===\n');

  const publicClient = createPublicClient({
    chain: getChainConfig(chain),
    transport: http()
  });

  const paymasterAddress = PAYMASTER_ADDRESSES[chain];

  if (!paymasterAddress) {
    throw new Error(`Paymaster not available on ${chain}`);
  }

  const balance = await publicClient.getBalance({
    address: paymasterAddress
  });

  console.log('Paymaster Balance:');
  console.log('  Address:', paymasterAddress);
  console.log('  Balance:', (Number(balance) / 1e18).toFixed(4), 'ETH');

  return balance.toString();
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log('💰 Circle Paymaster Example\n');
  console.log('Pay gas fees in USDC instead of ETH!\n');

  try {
    // Example: Transfer 10 USDC on Arbitrum with Paymaster
    await transferUSDCWithPaymaster(
      'arbitrum',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`,
      '10.00'
    );

    // Check Paymaster balance
    await checkPaymasterBalance('arbitrum');

  } catch (error: any) {
    console.error('Error in main:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
export {
  createUserOpWithPaymaster,
  signUserOperation,
  submitUserOperation,
  waitForUserOpReceipt,
  transferUSDCWithPaymaster,
  checkPaymasterBalance
};
