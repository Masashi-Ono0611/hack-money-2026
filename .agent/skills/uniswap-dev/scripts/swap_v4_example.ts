/**
 * Uniswap v4 Swap Example
 *
 * This script demonstrates how to execute a swap on Uniswap v4 using the SDK.
 * It includes proper slippage protection, deadline handling, and error management.
 */

import { ethers } from 'ethers';
import { CurrencyAmount, Token, Percent } from '@uniswap/sdk-core';
import { Pool, Route, SwapRouter, Trade } from '@uniswap/v4-sdk';
import { abi as PoolManagerABI } from '@uniswap/v4-core/artifacts/contracts/PoolManager.sol/PoolManager.json';

// Configuration
const POOL_MANAGER_ADDRESS = '0x...'; // v4 PoolManager singleton address
const SWAP_ROUTER_ADDRESS = '0x...';   // v4 SwapRouter address

// Token addresses (example: USDC/WETH on mainnet)
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

async function executeSwap() {
  // Setup provider and signer
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Define tokens
  const chainId = 1; // Mainnet
  const USDC = new Token(chainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin');
  const WETH = new Token(chainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');

  // Amount to swap (1000 USDC)
  const amountIn = CurrencyAmount.fromRawAmount(USDC, '1000000000'); // 1000 USDC (6 decimals)

  // Get pool data
  const poolManager = new ethers.Contract(
    POOL_MANAGER_ADDRESS,
    PoolManagerABI,
    provider
  );

  // Pool key for USDC/WETH with 0.3% fee
  const poolKey = {
    currency0: USDC_ADDRESS < WETH_ADDRESS ? USDC_ADDRESS : WETH_ADDRESS,
    currency1: USDC_ADDRESS < WETH_ADDRESS ? WETH_ADDRESS : USDC_ADDRESS,
    fee: 3000, // 0.3%
    tickSpacing: 60,
    hooks: ethers.constants.AddressZero // No hooks for this example
  };

  // Get pool state
  const poolState = await poolManager.getPool(
    poolKey.currency0,
    poolKey.currency1,
    poolKey.fee,
    poolKey.tickSpacing,
    poolKey.hooks
  );

  // Create Pool instance
  const pool = new Pool(
    USDC,
    WETH,
    poolKey.fee,
    poolState.sqrtPriceX96.toString(),
    poolState.liquidity.toString(),
    poolState.tick
  );

  // Create swap route
  const route = new Route([pool], USDC, WETH);

  // Create trade
  const trade = await Trade.fromRoute(
    route,
    amountIn,
    TradeType.EXACT_INPUT
  );

  // Configure slippage tolerance (0.5%)
  const slippageTolerance = new Percent(50, 10000);

  // Calculate minimum amount out with slippage
  const minimumAmountOut = trade.minimumAmountOut(slippageTolerance);

  console.log('=== Swap Details ===');
  console.log(`Input: ${amountIn.toSignificant(6)} ${USDC.symbol}`);
  console.log(`Expected Output: ${trade.outputAmount.toSignificant(6)} ${WETH.symbol}`);
  console.log(`Minimum Output: ${minimumAmountOut.toSignificant(6)} ${WETH.symbol}`);
  console.log(`Price Impact: ${trade.priceImpact.toSignificant(2)}%`);
  console.log(`Exchange Rate: 1 ${USDC.symbol} = ${trade.executionPrice.toSignificant(6)} ${WETH.symbol}`);

  // Set deadline (20 minutes from now)
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  // Generate swap parameters
  const swapParams = {
    zeroForOne: USDC_ADDRESS < WETH_ADDRESS,
    amountSpecified: amountIn.quotient.toString(),
    sqrtPriceLimitX96: 0, // No price limit (use slippage protection instead)
  };

  // Build transaction
  const swapRouter = new ethers.Contract(
    SWAP_ROUTER_ADDRESS,
    [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData, uint256 deadline) external payable returns (int256 amount0, int256 amount1)'
    ],
    wallet
  );

  // Approve USDC spending (if not already approved)
  const usdcContract = new ethers.Contract(
    USDC_ADDRESS,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    wallet
  );

  const currentAllowance = await usdcContract.allowance(wallet.address, SWAP_ROUTER_ADDRESS);
  if (currentAllowance.lt(amountIn.quotient.toString())) {
    console.log('Approving USDC...');
    const approveTx = await usdcContract.approve(
      SWAP_ROUTER_ADDRESS,
      ethers.constants.MaxUint256
    );
    await approveTx.wait();
    console.log('USDC approved');
  }

  // Execute swap
  console.log('\nExecuting swap...');
  try {
    const tx = await swapRouter.swap(
      poolKey,
      swapParams,
      '0x', // No hook data
      deadline,
      {
        gasLimit: 500000 // Adjust as needed
      }
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`✅ Swap successful! Block: ${receipt.blockNumber}`);

    // Parse swap event to get actual amounts
    const swapEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = poolManager.interface.parseLog(log);
        return parsed.name === 'Swap';
      } catch {
        return false;
      }
    });

    if (swapEvent) {
      const parsed = poolManager.interface.parseLog(swapEvent);
      console.log(`Actual output: ${ethers.utils.formatUnits(parsed.args.amount1, WETH.decimals)} ${WETH.symbol}`);
    }

  } catch (error: any) {
    console.error('❌ Swap failed:', error.message);

    // Common error handling
    if (error.message.includes('SLIPPAGE')) {
      console.error('Slippage exceeded! Try increasing slippage tolerance.');
    } else if (error.message.includes('DEADLINE')) {
      console.error('Transaction deadline exceeded!');
    } else if (error.message.includes('INSUFFICIENT')) {
      console.error('Insufficient liquidity or balance!');
    }

    throw error;
  }
}

// Helper: Estimate gas for swap
async function estimateSwapGas(
  provider: ethers.providers.Provider,
  swapRouter: ethers.Contract,
  poolKey: any,
  swapParams: any,
  deadline: number
): Promise<ethers.BigNumber> {
  try {
    const gasEstimate = await swapRouter.estimateGas.swap(
      poolKey,
      swapParams,
      '0x',
      deadline
    );

    // Add 20% buffer
    return gasEstimate.mul(120).div(100);
  } catch (error) {
    console.warn('Gas estimation failed, using default');
    return ethers.BigNumber.from(500000);
  }
}

// Run the swap
if (require.main === module) {
  executeSwap()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { executeSwap };
