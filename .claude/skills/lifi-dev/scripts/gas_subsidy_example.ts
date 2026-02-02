/**
 * LI.FI Gas Subsidy (LI.Fuel) Examples
 *
 * Examples for implementing gas subsidy to solve the cold-start problem on new chains
 */

import { LIFI } from '@lifi/sdk';
import { createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================================================
// Basic Gas Subsidy
// ============================================================================

/**
 * Bridge USDC to Polygon with gas subsidy
 *
 * Problem: User has 1000 USDC on Ethereum but no MATIC on Polygon for gas
 * Solution: Convert 50 USDC to MATIC during the bridge
 */
async function basicGasSubsidy() {
  const lifi = new LIFI({ integrator: 'your-app' });

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // Request route with gas subsidy
  const routes = await lifi.getRoutes({
    fromChainId: 1, // Ethereum
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    fromAmount: parseUnits('1000', 6).toString(), // 1000 USDC
    toChainId: 137, // Polygon
    toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
    fromAddress: account.address,

    // Enable gas subsidy: Convert 50 USDC to MATIC
    fromAmountForGas: parseUnits('50', 6).toString(),

    options: {
      slippage: 0.005, // 0.5%
    },
  });

  if (!routes.routes.length) {
    throw new Error('No routes found');
  }

  const route = routes.routes[0];

  // Verify gas subsidy is included
  console.log('Route breakdown:');
  console.log('  Total input:', formatUnits(BigInt(route.fromAmount), 6), 'USDC');
  console.log('  For swap/bridge:', formatUnits(BigInt(route.fromAmount) - 50000000n, 6), 'USDC');
  console.log('  For gas (LI.Fuel):', formatUnits(50000000n, 6), 'USDC');
  console.log('  Expected output:', formatUnits(BigInt(route.toAmount), 6), 'USDC');
  console.log('  Expected gas tokens: ~40 MATIC (varies by price)');

  // Check if gas conversion step exists
  const hasGasStep = route.steps.some((step) =>
    step.includedSteps?.some(
      (includedStep) =>
        includedStep.type === 'swap' &&
        includedStep.action.toToken.address === '0x0000000000000000000000000000000000000000'
    )
  );

  if (hasGasStep) {
    console.log('\n✅ Gas subsidy enabled: User will receive native MATIC tokens');
  } else {
    console.log('\n⚠️  Gas subsidy may not be available for this route');
  }

  return route;
}

// ============================================================================
// Dynamic Gas Amount Calculation
// ============================================================================

/**
 * Calculate optimal gas subsidy amount based on gas prices and user needs
 */
async function calculateOptimalGasSubsidy() {
  // Estimate user's gas needs on destination chain
  const estimatedTransactions = 10; // User plans to do 10 transactions
  const averageGasPerTx = 200000n; // Average gas per transaction
  const bufferMultiplier = 1.2; // 20% buffer

  // Get current gas price on destination chain (Polygon)
  const polygonClient = createWalletClient({
    chain: { id: 137, name: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: { default: { http: ['https://polygon-rpc.com'] } } },
    transport: http(),
  });

  const gasPrice = await polygonClient.estimateGas({
    account: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    to: '0x0000000000000000000000000000000000000001' as `0x${string}`,
  });

  // Calculate total gas needed
  const totalGasNeeded = averageGasPerTx * BigInt(estimatedTransactions);
  const gasWithBuffer = (totalGasNeeded * BigInt(Math.floor(bufferMultiplier * 100))) / 100n;

  // Convert to MATIC (approximate MATIC price in USDC: $0.80)
  const maticPriceUSD = 0.8;
  const maticNeeded = Number(gasWithBuffer) / 1e18;
  const usdcForGas = maticNeeded * maticPriceUSD;

  console.log('Gas subsidy calculation:');
  console.log(`  Estimated transactions: ${estimatedTransactions}`);
  console.log(`  Total gas needed: ${gasWithBuffer.toString()} wei`);
  console.log(`  MATIC needed: ${maticNeeded.toFixed(4)} MATIC`);
  console.log(`  USDC to allocate: $${usdcForGas.toFixed(2)}`);

  const fromAmountForGas = parseUnits(usdcForGas.toFixed(2), 6).toString();

  console.log(`\nRecommended fromAmountForGas: ${fromAmountForGas}`);

  return fromAmountForGas;
}

// ============================================================================
// Multi-Chain Gas Subsidy
// ============================================================================

/**
 * Bridge to multiple chains with gas subsidy for each
 */
async function multiChainGasSubsidy() {
  const lifi = new LIFI({ integrator: 'your-app' });
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // Define destination chains and gas amounts
  const destinations = [
    { chainId: 137, name: 'Polygon', gasAmount: '30' }, // $30 for MATIC
    { chainId: 42161, name: 'Arbitrum', gasAmount: '20' }, // $20 for ETH
    { chainId: 10, name: 'Optimism', gasAmount: '20' }, // $20 for ETH
  ];

  console.log('Bridging USDC to multiple chains with gas subsidy...\n');

  for (const dest of destinations) {
    console.log(`\n=== ${dest.name} ===`);

    const routes = await lifi.getRoutes({
      fromChainId: 1, // Ethereum
      fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      fromAmount: parseUnits('1000', 6).toString(), // 1000 USDC
      toChainId: dest.chainId,
      toTokenAddress: getUSDCAddress(dest.chainId),
      fromAddress: account.address,

      // Gas subsidy for this chain
      fromAmountForGas: parseUnits(dest.gasAmount, 6).toString(),
    });

    if (routes.routes.length) {
      const route = routes.routes[0];

      console.log(`  Input: 1000 USDC`);
      console.log(`  Gas subsidy: $${dest.gasAmount}`);
      console.log(`  Output: ${formatUnits(BigInt(route.toAmount), 6)} USDC`);
      console.log(`  Execution time: ${route.steps.reduce((t, s) => t + s.estimate.executionDuration, 0)}s`);
    } else {
      console.log(`  ❌ No routes available`);
    }
  }
}

// Helper function
function getUSDCAddress(chainId: number): string {
  const addresses: Record<number, string> = {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  };
  return addresses[chainId] || '';
}

// ============================================================================
// Gas Subsidy with User Preference
// ============================================================================

/**
 * Let users choose their gas subsidy amount
 */
async function userConfigurableGasSubsidy(userGasPreference: 'low' | 'medium' | 'high') {
  const lifi = new LIFI({ integrator: 'your-app' });
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // Gas subsidy presets
  const gasPresets = {
    low: '20', // $20 in USDC
    medium: '50', // $50 in USDC
    high: '100', // $100 in USDC
  };

  const fromAmountForGas = parseUnits(gasPresets[userGasPreference], 6).toString();

  console.log(`User selected: ${userGasPreference} gas subsidy ($${gasPresets[userGasPreference]})`);

  const routes = await lifi.getRoutes({
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    fromAmount: parseUnits('1000', 6).toString(),
    toChainId: 137,
    toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    fromAddress: account.address,
    fromAmountForGas,
  });

  const route = routes.routes[0];

  // Show user the breakdown
  const gasAmount = parseFloat(gasPresets[userGasPreference]);
  const bridgeAmount = 1000 - gasAmount;

  console.log('\nBreakdown:');
  console.log(`  Bridge: $${bridgeAmount} USDC → ${formatUnits(BigInt(route.toAmount), 6)} USDC`);
  console.log(`  Gas: $${gasAmount} USDC → ~${(gasAmount / 0.8).toFixed(2)} MATIC`);
  console.log(`\nTotal output:`);
  console.log(`  ${formatUnits(BigInt(route.toAmount), 6)} USDC`);
  console.log(`  + ${(gasAmount / 0.8).toFixed(2)} MATIC (for gas)`);

  return route;
}

// ============================================================================
// Validation & Error Handling
// ============================================================================

/**
 * Validate gas subsidy availability before execution
 */
async function validateGasSubsidy(
  fromChainId: number,
  toChainId: number,
  fromAmountForGas: string
) {
  const lifi = new LIFI({ integrator: 'your-app' });

  try {
    // Test route with gas subsidy
    const routes = await lifi.getRoutes({
      fromChainId,
      fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      fromAmount: parseUnits('1000', 6).toString(),
      toChainId,
      toTokenAddress: getUSDCAddress(toChainId),
      fromAddress: '0x0000000000000000000000000000000000000001', // Dummy address for testing
      fromAmountForGas,
    });

    if (!routes.routes.length) {
      console.error('❌ Gas subsidy not available for this route');
      return false;
    }

    // Check if gas conversion is included
    const route = routes.routes[0];
    const hasGasConversion = route.steps.some((step) =>
      step.includedSteps?.some((s) => s.action.toToken.address === '0x0000000000000000000000000000000000000000')
    );

    if (!hasGasConversion) {
      console.warn('⚠️  Route found but gas conversion may not be available');
      return false;
    }

    console.log('✅ Gas subsidy available for this route');
    console.log(`   Estimated gas tokens: ${formatUnits(BigInt(route.toAmount), 6)} native tokens`);

    return true;
  } catch (error: any) {
    console.error('❌ Error validating gas subsidy:', error.message);
    return false;
  }
}

// ============================================================================
// Complete Flow with Execution
// ============================================================================

/**
 * Complete flow: Get route with gas subsidy and execute
 */
async function completeGasSubsidyFlow() {
  const lifi = new LIFI({ integrator: 'your-app' });

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  // 1. Get route with gas subsidy
  console.log('Fetching route with gas subsidy...');

  const routes = await lifi.getRoutes({
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    fromAmount: parseUnits('1000', 6).toString(),
    toChainId: 137,
    toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    fromAddress: account.address,
    fromAmountForGas: parseUnits('50', 6).toString(), // $50 for gas
  });

  const route = routes.routes[0];

  // 2. Show user breakdown
  console.log('\n=== Route Summary ===');
  console.log('Input: 1000 USDC on Ethereum');
  console.log('Output:', formatUnits(BigInt(route.toAmount), 6), 'USDC on Polygon');
  console.log('Gas subsidy: ~40 MATIC (varies by price)');
  console.log('Execution time:', route.steps.reduce((t, s) => t + s.estimate.executionDuration, 0), 'seconds');
  console.log('Gas cost:', route.gasCostUSD, 'USD');

  // 3. Get user confirmation
  const confirmed = true; // In real app: ask user for confirmation

  if (!confirmed) {
    console.log('User cancelled');
    return;
  }

  // 4. Approve token if needed
  const firstStep = route.steps[0];
  if (firstStep.action.fromToken.address !== '0x0000000000000000000000000000000000000000') {
    console.log('\nApproving USDC...');

    await lifi.approveToken({
      walletClient,
      token: firstStep.action.fromToken,
      amount: firstStep.action.fromAmount,
      spender: firstStep.estimate.approvalAddress,
    });

    console.log('✅ Token approved');
  }

  // 5. Execute route
  console.log('\nExecuting swap...');

  try {
    const execution = await lifi.executeRoute({
      route,
      walletClient,

      updateRouteHook: (updatedRoute) => {
        const currentStep = updatedRoute.steps.findIndex((s) => s.execution?.status === 'PENDING');
        if (currentStep >= 0) {
          console.log(`Step ${currentStep + 1}/${updatedRoute.steps.length} in progress...`);
        }
      },
    });

    console.log('\n✅ Swap completed!');
    console.log('Transaction hash:', execution.txHash);
    console.log('\nUser now has:');
    console.log('  -', formatUnits(BigInt(route.toAmount), 6), 'USDC on Polygon');
    console.log('  - ~40 MATIC for gas fees');
  } catch (error: any) {
    console.error('\n❌ Swap failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  basicGasSubsidy,
  calculateOptimalGasSubsidy,
  multiChainGasSubsidy,
  userConfigurableGasSubsidy,
  validateGasSubsidy,
  completeGasSubsidyFlow,
};
