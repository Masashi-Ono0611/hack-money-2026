/**
 * Bridge Kit - Simplified Cross-Chain Transfer Example
 *
 * Demonstrates easy USDC cross-chain transfers using Bridge Kit SDK
 * - Minimal code (abstracts CCTP complexity)
 * - Built-in progress tracking
 * - Automatic retry logic
 * - Fee collection support
 */

import { createBridgeKit, BridgeKit } from '@circle-fin/bridge-kit';
import { createWalletClient, http, parseUnits } from 'viem';
import { mainnet, arbitrum, base, optimism } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable required');
}

// Note: Bridge Kit can work without API key but may have rate limits
if (!BRIDGE_API_KEY) {
  console.warn('⚠️  BRIDGE_API_KEY not set - using public endpoints (rate limited)');
}

// ============================================================================
// Setup Wallet Adapters
// ============================================================================

function createEVMWalletAdapter(chain: any, rpcUrl?: string) {
  const account = privateKeyToAccount(PRIVATE_KEY);

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });
}

// Example: Ethereum wallet
const ethereumWallet = createEVMWalletAdapter(
  mainnet,
  process.env.ETHEREUM_RPC_URL
);

// Example: Arbitrum wallet
const arbitrumWallet = createEVMWalletAdapter(
  arbitrum,
  process.env.ARBITRUM_RPC_URL
);

// Example: Base wallet
const baseWallet = createEVMWalletAdapter(
  base,
  process.env.BASE_RPC_URL
);

// ============================================================================
// 1. Basic Bridge Transfer
// ============================================================================

async function basicBridgeTransfer() {
  console.log('\n=== Basic Bridge Transfer ===\n');

  // Initialize Bridge Kit
  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  try {
    console.log('Initiating transfer...');
    console.log('  From: Ethereum');
    console.log('  To: Arbitrum');
    console.log('  Amount: 10.00 USDC');

    // Execute transfer
    const result = await kit.bridge({
      from: {
        adapter: ethereumWallet,
        chain: 'Ethereum'
      },
      to: {
        adapter: arbitrumWallet,
        chain: 'Arbitrum'
      },
      amount: '10.00'
    });

    console.log('\n✅ Transfer completed!');
    console.log('  Status:', result.status);
    console.log('  Source TX:', result.sourceTxHash);
    console.log('  Destination TX:', result.destTxHash);

    return result;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// 2. Transfer with Progress Tracking
// ============================================================================

async function bridgeWithProgressTracking() {
  console.log('\n=== Bridge Transfer with Progress Tracking ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  // Setup progress event listeners
  kit.on('progress', (event) => {
    console.log(`[${new Date().toISOString()}] Progress: ${event.stage}`);

    switch (event.stage) {
      case 'approving':
        console.log('  → Approving USDC spend...');
        break;
      case 'burning':
        console.log('  → Burning USDC on source chain...');
        if (event.txHash) {
          console.log('  → TX:', event.txHash);
        }
        break;
      case 'waiting_attestation':
        console.log('  → Waiting for Circle attestation...');
        break;
      case 'minting':
        console.log('  → Minting USDC on destination chain...');
        break;
      case 'complete':
        console.log('  ✅ Transfer complete!');
        break;
    }
  });

  kit.on('error', (error) => {
    console.error('  ❌ Error:', error.message);
  });

  try {
    const result = await kit.bridge({
      from: { adapter: ethereumWallet, chain: 'Ethereum' },
      to: { adapter: baseWallet, chain: 'Base' },
      amount: '5.00'
    });

    console.log('\nFinal Result:');
    console.log('  Source TX:', result.sourceTxHash);
    console.log('  Dest TX:', result.destTxHash);
    console.log('  Amount:', result.amount);

    return result;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// 3. Transfer with Fee Collection
// ============================================================================

async function bridgeWithFeeCollection() {
  console.log('\n=== Bridge Transfer with Fee Collection ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_ADDRESS || ethereumWallet.account.address;

  try {
    console.log('Transfer details:');
    console.log('  User amount: 100.00 USDC');
    console.log('  Fee: 0.50 USDC (0.5%)');
    console.log('  Fee recipient:', FEE_COLLECTOR_ADDRESS);

    const result = await kit.bridge({
      from: { adapter: ethereumWallet, chain: 'Ethereum' },
      to: { adapter: arbitrumWallet, chain: 'Arbitrum' },
      amount: '100.00',
      fee: {
        amount: '0.50',
        recipient: FEE_COLLECTOR_ADDRESS
      }
    });

    console.log('\n✅ Transfer with fee completed!');
    console.log('  User received: 99.50 USDC');
    console.log('  Fee collected: 0.50 USDC');
    console.log('  Source TX:', result.sourceTxHash);
    console.log('  Dest TX:', result.destTxHash);

    return result;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// 4. Query Available Routes
// ============================================================================

async function queryAvailableRoutes() {
  console.log('\n=== Available Bridge Routes ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  try {
    const routes = await kit.getAvailableRoutes();

    console.log(`Found ${routes.length} routes:\n`);

    // Group by source chain
    const routesBySource: Record<string, any[]> = {};

    routes.forEach(route => {
      if (!routesBySource[route.from]) {
        routesBySource[route.from] = [];
      }
      routesBySource[route.from].push(route);
    });

    // Display grouped routes
    Object.entries(routesBySource).forEach(([source, destRoutes]) => {
      console.log(`From ${source}:`);
      destRoutes.forEach(route => {
        console.log(`  → ${route.to} (${route.estimatedTime}s, ${route.protocol})`);
      });
      console.log('');
    });

    return routes;

  } catch (error: any) {
    console.error('❌ Failed to query routes:', error.message);
    throw error;
  }
}

// ============================================================================
// 5. Custom RPC Configuration
// ============================================================================

async function bridgeWithCustomRPC() {
  console.log('\n=== Bridge with Custom RPC URLs ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY,
    customRpcUrls: {
      'Ethereum': process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      'Arbitrum': process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      'Base': process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    }
  });

  try {
    console.log('Using custom RPC endpoints for faster performance');

    const result = await kit.bridge({
      from: { adapter: ethereumWallet, chain: 'Ethereum' },
      to: { adapter: baseWallet, chain: 'Base' },
      amount: '25.00'
    });

    console.log('✅ Transfer completed via custom RPCs');
    console.log('  TX:', result.destTxHash);

    return result;

  } catch (error: any) {
    console.error('❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// 6. Transfer with Retry Logic
// ============================================================================

async function bridgeWithRetry() {
  console.log('\n=== Bridge Transfer with Retry ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY,
    retryConfig: {
      maxAttempts: 3,
      delayMs: 5000,
      backoffMultiplier: 2
    }
  });

  try {
    console.log('Transfer with automatic retry on failure');

    const result = await kit.bridge({
      from: { adapter: ethereumWallet, chain: 'Ethereum' },
      to: { adapter: arbitrumWallet, chain: 'Arbitrum' },
      amount: '15.00'
    });

    console.log('✅ Transfer succeeded (possibly after retries)');
    console.log('  Result:', result);

    return result;

  } catch (error: any) {
    console.error('❌ Transfer failed after all retries:', error.message);
    throw error;
  }
}

// ============================================================================
// 7. Estimate Transfer Time
// ============================================================================

async function estimateTransferTime() {
  console.log('\n=== Estimate Transfer Time ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  try {
    const routes = [
      { from: 'Ethereum', to: 'Arbitrum' },
      { from: 'Ethereum', to: 'Base' },
      { from: 'Ethereum', to: 'Optimism' },
      { from: 'Arbitrum', to: 'Base' }
    ];

    console.log('Estimated transfer times:\n');

    for (const route of routes) {
      const estimate = await kit.estimateTransferTime(route.from, route.to);

      console.log(`${route.from} → ${route.to}:`);
      console.log(`  Fast mode: ~${estimate.fast}s`);
      console.log(`  Standard mode: ~${estimate.standard}s`);
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Failed to estimate:', error.message);
    throw error;
  }
}

// ============================================================================
// 8. Complete Example with Error Handling
// ============================================================================

async function completeBridgeExample() {
  console.log('\n=== Complete Bridge Example ===\n');

  const kit = createBridgeKit({
    apiKey: BRIDGE_API_KEY
  });

  // Setup comprehensive event handling
  kit.on('progress', (event) => {
    console.log(`Progress: ${event.stage}`);
  });

  kit.on('error', (error) => {
    console.error('Error:', error);
  });

  kit.on('warning', (warning) => {
    console.warn('Warning:', warning);
  });

  try {
    // 1. Check if route is available
    console.log('1. Checking route availability...');
    const routes = await kit.getAvailableRoutes();
    const hasRoute = routes.some(
      r => r.from === 'Ethereum' && r.to === 'Arbitrum'
    );

    if (!hasRoute) {
      throw new Error('Route not available');
    }
    console.log('   ✅ Route available');

    // 2. Estimate transfer time
    console.log('\n2. Estimating transfer time...');
    const estimate = await kit.estimateTransferTime('Ethereum', 'Arbitrum');
    console.log(`   Estimated time: ${estimate.fast}s`);

    // 3. Execute transfer
    console.log('\n3. Executing transfer...');
    const result = await kit.bridge({
      from: { adapter: ethereumWallet, chain: 'Ethereum' },
      to: { adapter: arbitrumWallet, chain: 'Arbitrum' },
      amount: '50.00',
      fee: {
        amount: '0.25',
        recipient: process.env.FEE_COLLECTOR_ADDRESS || ethereumWallet.account.address
      }
    });

    console.log('\n✅ Transfer complete!');
    console.log('Summary:');
    console.log('  Amount: 50.00 USDC');
    console.log('  Fee: 0.25 USDC');
    console.log('  User received: 49.75 USDC');
    console.log('  Source TX:', result.sourceTxHash);
    console.log('  Dest TX:', result.destTxHash);
    console.log('  Time taken:', result.durationSeconds, 'seconds');

    return result;

  } catch (error: any) {
    console.error('\n❌ Complete example failed:', error.message);

    // Cleanup or rollback logic here
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💡 Tip: Make sure you have enough USDC and ETH for gas');
    } else if (error.code === 'TRANSACTION_REVERTED') {
      console.log('💡 Tip: Check your allowance and try again');
    }

    throw error;
  }
}

// ============================================================================
// Main Function - Select which example to run
// ============================================================================

async function main() {
  const examples = [
    { name: 'Basic Transfer', fn: basicBridgeTransfer },
    { name: 'Progress Tracking', fn: bridgeWithProgressTracking },
    { name: 'Fee Collection', fn: bridgeWithFeeCollection },
    { name: 'Query Routes', fn: queryAvailableRoutes },
    { name: 'Custom RPC', fn: bridgeWithCustomRPC },
    { name: 'With Retry', fn: bridgeWithRetry },
    { name: 'Estimate Time', fn: estimateTransferTime },
    { name: 'Complete Example', fn: completeBridgeExample }
  ];

  console.log('🌉 Circle Bridge Kit Examples\n');
  console.log('Available examples:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}`);
  });

  // Run specific example (change index to run different examples)
  const exampleIndex = 0; // 0 = Basic Transfer

  console.log(`\nRunning: ${examples[exampleIndex].name}\n`);
  console.log('='.repeat(60));

  await examples[exampleIndex].fn();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use in other modules
export {
  basicBridgeTransfer,
  bridgeWithProgressTracking,
  bridgeWithFeeCollection,
  queryAvailableRoutes,
  bridgeWithCustomRPC,
  bridgeWithRetry,
  estimateTransferTime,
  completeBridgeExample
};
