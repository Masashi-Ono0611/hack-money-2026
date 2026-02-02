/**
 * LI.FI SDK Swap Examples
 *
 * Production-ready examples for executing cross-chain swaps and bridges using the LI.FI SDK
 */

import { LIFI, Route, ExtendedChain, Token, LiFiStep } from '@lifi/sdk';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================================================
// Basic Setup
// ============================================================================

/**
 * Initialize LI.FI SDK
 */
function initializeLiFi() {
  return new LIFI({
    integrator: 'your-app-name', // Required for analytics and fees
    apiKey: process.env.LIFI_API_KEY, // Optional - for higher rate limits
  });
}

/**
 * Initialize Viem clients
 */
function initializeClients() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  return { publicClient, walletClient, account };
}

// ============================================================================
// Basic Swap Example
// ============================================================================

/**
 * Execute a simple same-chain swap (e.g., ETH → USDC on Ethereum)
 */
async function basicSwap() {
  const lifi = initializeLiFi();
  const { walletClient, account } = initializeClients();

  // 1. Get route quote
  const routes = await lifi.getRoutes({
    fromChainId: 1, // Ethereum
    fromTokenAddress: '0x0000000000000000000000000000000000000000', // ETH
    fromAmount: parseUnits('0.1', 18).toString(), // 0.1 ETH
    toChainId: 1, // Ethereum
    toTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    fromAddress: account.address,

    options: {
      slippage: 0.005, // 0.5%
      order: 'RECOMMENDED', // Best overall route
    },
  });

  if (!routes.routes.length) {
    throw new Error('No routes found');
  }

  const bestRoute = routes.routes[0];

  // 2. Display route details
  console.log('Route found:');
  console.log('  Input:', formatUnits(BigInt(bestRoute.fromAmount), 18), 'ETH');
  console.log('  Output:', formatUnits(BigInt(bestRoute.toAmount), 6), 'USDC');
  console.log('  Min output:', formatUnits(BigInt(bestRoute.toAmountMin), 6), 'USDC');
  console.log('  Gas cost:', bestRoute.gasCostUSD, 'USD');
  console.log('  Steps:', bestRoute.steps.length);

  // 3. Execute route
  try {
    const execution = await lifi.executeRoute({
      route: bestRoute,
      walletClient,

      updateRouteHook: (updatedRoute) => {
        const currentStep = updatedRoute.steps.findIndex(
          (step) => step.execution?.status === 'PENDING'
        );
        console.log(`Executing step ${currentStep + 1}/${updatedRoute.steps.length}`);
      },
    });

    console.log('Swap completed!');
    console.log('Transaction hash:', execution.txHash);

    return execution;
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
}

// ============================================================================
// Cross-Chain Swap Example
// ============================================================================

/**
 * Execute cross-chain swap (e.g., USDC on Ethereum → USDC on Polygon)
 */
async function crossChainSwap() {
  const lifi = initializeLiFi();
  const { walletClient, account } = initializeClients();

  // 1. Get cross-chain route
  const routes = await lifi.getRoutes({
    fromChainId: 1, // Ethereum
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    fromAmount: parseUnits('100', 6).toString(), // 100 USDC
    toChainId: 137, // Polygon
    toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
    fromAddress: account.address,

    options: {
      slippage: 0.005,
      order: 'FASTEST', // Prioritize speed

      // Prefer specific bridges
      bridges: { allow: ['stargate', 'across', 'hop'] },
    },
  });

  const bestRoute = routes.routes[0];

  // 2. Check if approval is needed
  const firstStep = bestRoute.steps[0];
  if (firstStep.action.fromToken.address !== '0x0000000000000000000000000000000000000000') {
    console.log('Approving token...');

    await lifi.approveToken({
      walletClient,
      token: firstStep.action.fromToken,
      amount: firstStep.action.fromAmount,
      spender: firstStep.estimate.approvalAddress,
    });

    console.log('Token approved');
  }

  // 3. Execute with chain switching support
  try {
    const execution = await lifi.executeRoute({
      route: bestRoute,
      walletClient,

      // Handle chain switches
      switchChainHook: async (requiredChainId) => {
        console.log(`Switching to chain ${requiredChainId}...`);
        await walletClient.switchChain({ id: requiredChainId });
      },

      // Handle rate changes
      acceptExchangeRateUpdateHook: (oldRate, newRate) => {
        const rateChange = ((newRate - oldRate) / oldRate) * 100;
        console.log(`Rate changed by ${rateChange.toFixed(2)}%`);

        // Auto-accept if change is < 1%
        return Math.abs(rateChange) < 1;
      },

      updateRouteHook: (updatedRoute) => {
        updatedRoute.steps.forEach((step, index) => {
          if (step.execution) {
            console.log(
              `Step ${index + 1}:`,
              step.execution.status,
              step.execution.process?.[0]?.txHash || ''
            );
          }
        });
      },
    });

    console.log('Cross-chain swap completed!');
    return execution;
  } catch (error) {
    console.error('Cross-chain swap failed:', error);
    throw error;
  }
}

// ============================================================================
// Advanced Route Selection
// ============================================================================

/**
 * Compare multiple routes and select the best one based on custom criteria
 */
async function advancedRouteSelection() {
  const lifi = initializeLiFi();
  const { account } = initializeClients();

  const routeRequest = {
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    fromAmount: parseUnits('1000', 6).toString(),
    toChainId: 42161, // Arbitrum
    toTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    fromAddress: account.address,
  };

  // Get multiple route options
  const routes = await lifi.getRoutes(routeRequest);

  console.log(`Found ${routes.routes.length} routes`);

  // Analyze routes
  const routeAnalysis = routes.routes.map((route) => {
    const totalTime = route.steps.reduce(
      (total, step) => total + step.estimate.executionDuration,
      0
    );

    const totalGasCost = parseFloat(route.gasCostUSD || '0');

    const outputAmount = BigInt(route.toAmountMin);

    return {
      id: route.id,
      outputAmount,
      outputUSD: parseFloat(formatUnits(outputAmount, 6)),
      totalTime,
      totalGasCost,
      steps: route.steps.length,
      bridges: route.steps
        .filter((s) => s.type === 'cross')
        .map((s) => s.tool)
        .join(', '),
      score: 0, // Will calculate
    };
  });

  // Calculate custom score (higher is better)
  const maxOutput = Math.max(...routeAnalysis.map((r) => r.outputUSD));
  const maxTime = Math.max(...routeAnalysis.map((r) => r.totalTime));
  const maxGas = Math.max(...routeAnalysis.map((r) => r.totalGasCost));

  routeAnalysis.forEach((r) => {
    // Weighted scoring:
    // - 50% output amount
    // - 30% speed
    // - 20% gas cost
    r.score =
      (r.outputUSD / maxOutput) * 0.5 +
      (1 - r.totalTime / maxTime) * 0.3 +
      (1 - r.totalGasCost / maxGas) * 0.2;
  });

  // Sort by score
  routeAnalysis.sort((a, b) => b.score - a.score);

  // Display comparison
  console.log('\n=== Route Comparison ===');
  routeAnalysis.slice(0, 3).forEach((r, i) => {
    console.log(`\nRoute ${i + 1} (Score: ${(r.score * 100).toFixed(1)}%):`);
    console.log(`  Output: $${r.outputUSD.toFixed(2)}`);
    console.log(`  Time: ${Math.floor(r.totalTime / 60)}m ${r.totalTime % 60}s`);
    console.log(`  Gas: $${r.totalGasCost.toFixed(2)}`);
    console.log(`  Steps: ${r.steps}`);
    console.log(`  Bridges: ${r.bridges || 'None'}`);
  });

  return routes.routes.find((r) => r.id === routeAnalysis[0].id);
}

// ============================================================================
// Error Handling & Recovery
// ============================================================================

/**
 * Execute swap with comprehensive error handling
 */
async function swapWithErrorHandling() {
  const lifi = initializeLiFi();
  const { walletClient, account } = initializeClients();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries}`);

      // Get routes
      const routes = await lifi.getRoutes({
        fromChainId: 1,
        fromTokenAddress: '0x0000000000000000000000000000000000000000',
        fromAmount: parseUnits('0.1', 18).toString(),
        toChainId: 137,
        toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        fromAddress: account.address,
        options: { slippage: 0.005 },
      });

      if (!routes.routes.length) {
        throw new Error('No routes available');
      }

      const route = routes.routes[0];

      // Execute
      const execution = await lifi.executeRoute({
        route,
        walletClient,

        updateRouteHook: (updatedRoute) => {
          const failedStep = updatedRoute.steps.find(
            (step) => step.execution?.status === 'FAILED'
          );

          if (failedStep) {
            console.error('Step failed:', failedStep.id);
            throw new Error(`Step ${failedStep.id} failed`);
          }
        },
      });

      console.log('Swap successful!');
      return execution;
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);

      // Handle specific errors
      if (error.code === 'USER_REJECTED_REQUEST') {
        console.log('User rejected transaction');
        throw error; // Don't retry
      }

      if (error.message.includes('insufficient funds')) {
        console.log('Insufficient balance');
        throw error; // Don't retry
      }

      if (error.message.includes('network')) {
        console.log('Network error, retrying...');
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
        attempt++;
        continue;
      }

      // Other errors: retry with backoff
      const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Retrying in ${backoffTime / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));

      attempt++;
    }
  }

  throw new Error(`Swap failed after ${maxRetries} attempts`);
}

// ============================================================================
// Status Tracking
// ============================================================================

/**
 * Track swap status across chains
 */
async function trackSwapStatus(txHash: string, fromChainId: number, toChainId: number) {
  const lifi = initializeLiFi();

  console.log('Tracking swap status...');

  const maxAttempts = 60; // 5 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await lifi.getStatus({
        txHash,
        fromChain: fromChainId,
        toChain: toChainId,
      });

      console.log('Status:', status.status);

      if (status.status === 'DONE') {
        console.log('✅ Swap completed!');
        console.log('Source tx:', status.sending.txHash);
        console.log('Destination tx:', status.receiving?.txHash);
        return status;
      }

      if (status.status === 'FAILED') {
        console.error('❌ Swap failed');
        console.error('Error:', status.error);
        throw new Error(status.error || 'Swap failed');
      }

      // Still pending
      console.log('⏳ Waiting for confirmation...');
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5s

      attempts++;
    } catch (error) {
      console.error('Error checking status:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error('Status check timeout');
}

// ============================================================================
// Fee Integration
// ============================================================================

/**
 * Execute swap with integrator fee
 */
async function swapWithFee() {
  const lifi = initializeLiFi();
  const { walletClient, account } = initializeClients();

  const routes = await lifi.getRoutes({
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    fromAmount: parseUnits('1000', 6).toString(),
    toChainId: 137,
    toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    fromAddress: account.address,

    // Add integrator fee
    integrator: 'your-app-name',
    fee: 0.03, // 3% fee
  });

  const route = routes.routes[0];

  // Calculate fee breakdown
  const fromAmount = BigInt(route.fromAmount);
  const feeAmount = (fromAmount * 3n) / 100n; // 3%
  const netAmount = fromAmount - feeAmount;

  console.log('Fee breakdown:');
  console.log('  Total:', formatUnits(fromAmount, 6), 'USDC');
  console.log('  Your fee:', formatUnits(feeAmount, 6), 'USDC');
  console.log('  Net amount:', formatUnits(netAmount, 6), 'USDC');
  console.log('  Output:', formatUnits(BigInt(route.toAmount), 6), 'USDC');

  // Execute
  const execution = await lifi.executeRoute({
    route,
    walletClient,
  });

  console.log('Swap with fee completed!');
  console.log('You earned:', formatUnits(feeAmount, 6), 'USDC');

  return execution;
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  basicSwap,
  crossChainSwap,
  advancedRouteSelection,
  swapWithErrorHandling,
  trackSwapStatus,
  swapWithFee,
};
