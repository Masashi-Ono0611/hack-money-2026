/**
 * Complete wallet creation example with security best practices
 *
 * This script demonstrates:
 * - Developer-Controlled Wallet creation
 * - User-Controlled Wallet creation
 * - USDC transfer execution
 * - Transaction monitoring
 * - Error handling
 * - Security patterns
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import dotenv from 'dotenv';
import { isAddress } from 'viem';

dotenv.config();

// ============================================================================
// Configuration & Validation
// ============================================================================

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.ENTITY_SECRET;
const BLOCKCHAIN = process.env.BLOCKCHAIN || 'ETH-SEPOLIA';

// Validate required environment variables
if (!API_KEY || !ENTITY_SECRET) {
  throw new Error('Missing required environment variables: CIRCLE_API_KEY, ENTITY_SECRET');
}

// USDC contract addresses by blockchain
const USDC_ADDRESSES: Record<string, string> = {
  'ETH': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'ETH-SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'POLY-AMOY': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  'ARB': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'BASE': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};

// ============================================================================
// 1. Developer-Controlled Wallet Creation
// ============================================================================

async function createDeveloperControlledWallet() {
  console.log('\n=== Creating Developer-Controlled Wallet ===\n');

  // Initialize SDK
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY!,
    entitySecret: ENTITY_SECRET!
  });

  try {
    // Create EOA wallet (Externally Owned Account)
    const eoaWallet = await client.createWallet({
      accountType: 'EOA',
      blockchains: [BLOCKCHAIN],
      metadata: [
        { name: 'user_id', value: 'user_12345' },
        { name: 'wallet_type', value: 'primary' }
      ]
    });

    console.log('✅ EOA Wallet Created:');
    console.log('  Wallet ID:', eoaWallet.data.walletId);
    console.log('  Address:', eoaWallet.data.address);
    console.log('  State:', eoaWallet.data.state);
    console.log('  Blockchain:', eoaWallet.data.blockchain);

    // Create SCA wallet (Smart Contract Account for ERC-4337)
    // Required for Gas Station integration
    const scaWallet = await client.createWallet({
      accountType: 'SCA',
      blockchains: [BLOCKCHAIN],
      metadata: [
        { name: 'user_id', value: 'user_12345' },
        { name: 'wallet_type', value: 'gas_station' }
      ]
    });

    console.log('\n✅ SCA Wallet Created (Gas Station Compatible):');
    console.log('  Wallet ID:', scaWallet.data.walletId);
    console.log('  Address:', scaWallet.data.address);
    console.log('  State:', scaWallet.data.state);

    return {
      eoaWallet: eoaWallet.data,
      scaWallet: scaWallet.data,
      client
    };

  } catch (error: any) {
    console.error('❌ Error creating wallet:', error.message);
    throw error;
  }
}

// ============================================================================
// 2. User-Controlled Wallet Creation
// ============================================================================

async function createUserControlledWallet() {
  console.log('\n=== Creating User-Controlled Wallet ===\n');

  const APP_ID = process.env.W3S_APP_ID;

  if (!APP_ID) {
    console.log('⚠️  Skipping User-Controlled Wallet (W3S_APP_ID not set)');
    return null;
  }

  try {
    // Note: This requires frontend integration for social login
    // This is a simplified example showing the SDK initialization

    const sdk = new W3SSdk();
    await sdk.setAppSettings({
      appId: APP_ID
    });

    console.log('✅ User-Controlled Wallet SDK initialized');
    console.log('  App ID:', APP_ID);
    console.log('  Note: Complete wallet creation requires user interaction in browser');

    // In a real application, you would:
    // 1. User logs in via social provider (Google, Apple, etc.)
    // 2. SDK generates challenge
    // 3. User completes PIN setup
    // 4. Wallet is created with user custody

    return sdk;

  } catch (error: any) {
    console.error('❌ Error initializing User-Controlled Wallet:', error.message);
    throw error;
  }
}

// ============================================================================
// 3. USDC Transfer
// ============================================================================

interface TransferParams {
  walletId: string;
  destinationAddress: string;
  amount: string;
  blockchain: string;
}

function validateTransferParams(params: TransferParams): void {
  // Validate destination address
  if (!isAddress(params.destinationAddress)) {
    throw new Error('Invalid destination address format');
  }

  // Validate amount
  const numAmount = parseFloat(params.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Invalid amount: must be positive number');
  }

  // Check amount limits
  const MAX_TRANSFER = 10000;
  const MIN_TRANSFER = 0.01;

  if (numAmount > MAX_TRANSFER) {
    throw new Error(`Amount exceeds maximum: ${MAX_TRANSFER} USDC`);
  }

  if (numAmount < MIN_TRANSFER) {
    throw new Error(`Amount below minimum: ${MIN_TRANSFER} USDC`);
  }
}

async function transferUSDC(client: any, params: TransferParams) {
  console.log('\n=== Executing USDC Transfer ===\n');

  try {
    // Validate inputs
    validateTransferParams(params);

    console.log('Transfer details:');
    console.log('  From Wallet:', params.walletId);
    console.log('  To Address:', params.destinationAddress);
    console.log('  Amount:', params.amount, 'USDC');
    console.log('  Blockchain:', params.blockchain);

    // Get USDC token address for blockchain
    const tokenAddress = USDC_ADDRESSES[params.blockchain];
    if (!tokenAddress) {
      throw new Error(`USDC address not configured for ${params.blockchain}`);
    }

    // Create transfer transaction
    const transfer = await client.createTransaction({
      walletId: params.walletId,
      blockchain: params.blockchain,
      tokenAddress: tokenAddress,
      destinationAddress: params.destinationAddress,
      amount: [params.amount],
      fee: {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM' // LOW, MEDIUM, or HIGH
        }
      }
    });

    console.log('\n✅ Transfer initiated:');
    console.log('  Transaction ID:', transfer.data.id);
    console.log('  State:', transfer.data.state);

    // Monitor transaction
    await monitorTransaction(client, transfer.data.id);

    return transfer.data;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// 4. Transaction Monitoring
// ============================================================================

async function monitorTransaction(client: any, transactionId: string) {
  console.log('\n=== Monitoring Transaction ===\n');

  const MAX_ATTEMPTS = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    try {
      const tx = await client.getTransaction({ id: transactionId });

      console.log(`[${attempts + 1}/${MAX_ATTEMPTS}] State: ${tx.data.state}`);

      if (tx.data.state === 'COMPLETE') {
        console.log('\n✅ Transaction completed successfully!');
        console.log('  Transaction Hash:', tx.data.txHash);
        console.log('  Block Explorer:', getBlockExplorerUrl(tx.data.blockchain, tx.data.txHash));
        return tx.data;
      }

      if (tx.data.state === 'FAILED') {
        console.error('\n❌ Transaction failed');
        console.error('  Reason:', tx.data.errorReason || 'Unknown');
        throw new Error(`Transaction failed: ${tx.data.errorReason}`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

    } catch (error: any) {
      console.error('❌ Error monitoring transaction:', error.message);
      throw error;
    }
  }

  throw new Error('Transaction monitoring timeout');
}

function getBlockExplorerUrl(blockchain: string, txHash: string): string {
  const explorers: Record<string, string> = {
    'ETH': 'https://etherscan.io/tx/',
    'ETH-SEPOLIA': 'https://sepolia.etherscan.io/tx/',
    'POLY-AMOY': 'https://amoy.polygonscan.com/tx/',
    'ARB': 'https://arbiscan.io/tx/',
    'BASE': 'https://basescan.org/tx/'
  };

  const baseUrl = explorers[blockchain] || 'https://etherscan.io/tx/';
  return `${baseUrl}${txHash}`;
}

// ============================================================================
// 5. Get Wallet Balance
// ============================================================================

async function getWalletBalance(client: any, walletId: string) {
  console.log('\n=== Checking Wallet Balance ===\n');

  try {
    const wallet = await client.getWallet({ id: walletId });

    console.log('Wallet:', wallet.data.address);
    console.log('Balances:');

    if (wallet.data.balances && wallet.data.balances.length > 0) {
      wallet.data.balances.forEach((balance: any) => {
        console.log(`  ${balance.token.symbol}: ${balance.amount}`);
      });
    } else {
      console.log('  No balances found');
    }

    return wallet.data.balances;

  } catch (error: any) {
    console.error('❌ Error getting balance:', error.message);
    throw error;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Circle Wallet Creation & Transfer Example\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Blockchain:', BLOCKCHAIN);

  try {
    // 1. Create Developer-Controlled Wallet
    const { eoaWallet, scaWallet, client } = await createDeveloperControlledWallet();

    // 2. Create User-Controlled Wallet (optional)
    await createUserControlledWallet();

    // 3. Check wallet balance
    await getWalletBalance(client, eoaWallet.walletId);

    // 4. Example transfer (commented out to prevent accidental execution)
    /*
    await transferUSDC(client, {
      walletId: eoaWallet.walletId,
      destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '1.00',
      blockchain: BLOCKCHAIN
    });
    */

    console.log('\n✅ All operations completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Error in main execution:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
export {
  createDeveloperControlledWallet,
  createUserControlledWallet,
  transferUSDC,
  monitorTransaction,
  getWalletBalance,
  validateTransferParams
};
