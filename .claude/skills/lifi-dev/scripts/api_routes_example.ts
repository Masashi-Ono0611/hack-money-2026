/**
 * LI.FI API Examples
 *
 * Production-ready examples for direct API integration (without SDK)
 */

// ============================================================================
// Basic Setup
// ============================================================================

const API_BASE_URL = 'https://li.quest/v1';
const API_KEY = process.env.LIFI_API_KEY; // Optional - for higher rate limits

/**
 * Make API request with proper headers and error handling
 */
async function apiRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-lifi-api-key'] = API_KEY;
  }

  try {
    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `API Error (${response.status}): ${error.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error: any) {
    console.error('API request failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Get Chains
// ============================================================================

/**
 * Fetch all supported chains
 */
async function getChains() {
  interface Chain {
    id: number;
    name: string;
    key: string;
    chainType: 'EVM' | 'SOL' | 'OTHER';
    nativeToken: {
      symbol: string;
      decimals: number;
      address: string;
    };
  }

  const chains = await apiRequest<Chain[]>('/chains');

  console.log(`\nSupported chains (${chains.length}):`);
  chains.slice(0, 10).forEach((chain) => {
    console.log(`  ${chain.id}: ${chain.name} (${chain.nativeToken.symbol})`);
  });

  return chains;
}

// ============================================================================
// Get Tokens
// ============================================================================

/**
 * Fetch supported tokens for specific chains
 */
async function getTokens(chainIds: number[]) {
  interface TokensResponse {
    tokens: Record<string, Token[]>;
  }

  interface Token {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    name: string;
    logoURI: string;
  }

  const response = await apiRequest<TokensResponse>('/tokens', {
    chains: chainIds.join(','),
  });

  console.log('\nSupported tokens:');
  Object.entries(response.tokens).forEach(([chainId, tokens]) => {
    console.log(`\nChain ${chainId}: ${tokens.length} tokens`);
    tokens.slice(0, 5).forEach((token) => {
      console.log(`  ${token.symbol}: ${token.address}`);
    });
  });

  return response.tokens;
}

// ============================================================================
// Get Quote
// ============================================================================

/**
 * Get single optimized route quote
 */
async function getQuote(params: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  integrator?: string;
  fee?: string;
  slippage?: string;
}) {
  interface Quote {
    id: string;
    fromChainId: number;
    toChainId: number;
    fromToken: any;
    toToken: any;
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    steps: any[];
    gasCostUSD: string;
  }

  const quote = await apiRequest<Quote>('/quote', {
    fromChain: params.fromChain,
    toChain: params.toChain,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    integrator: params.integrator || 'api-example',
    fee: params.fee || '0',
    slippage: params.slippage || '0.005',
  });

  console.log('\n=== Quote ===');
  console.log('Route ID:', quote.id);
  console.log('From:', quote.fromAmount, quote.fromToken.symbol);
  console.log('To:', quote.toAmount, quote.toToken.symbol);
  console.log('Min output:', quote.toAmountMin, quote.toToken.symbol);
  console.log('Gas cost:', quote.gasCostUSD, 'USD');
  console.log('Steps:', quote.steps.length);

  return quote;
}

// ============================================================================
// Get Multiple Routes
// ============================================================================

/**
 * Get multiple route options for comparison
 */
async function getRoutes(params: {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
}) {
  interface RoutesResponse {
    routes: any[];
  }

  const response = await apiRequest<RoutesResponse>('/advanced/routes', params);

  console.log(`\n=== ${response.routes.length} Routes Found ===`);

  response.routes.slice(0, 3).forEach((route, index) => {
    const totalTime = route.steps.reduce(
      (sum: number, step: any) => sum + step.estimate.executionDuration,
      0
    );

    console.log(`\nRoute ${index + 1}:`);
    console.log('  Output:', route.toAmount, route.toToken.symbol);
    console.log('  Time:', Math.floor(totalTime / 60), 'min', totalTime % 60, 'sec');
    console.log('  Gas:', route.gasCostUSD, 'USD');
    console.log('  Steps:', route.steps.length);
  });

  return response.routes;
}

// ============================================================================
// Check Transaction Status
// ============================================================================

/**
 * Check the status of a cross-chain transaction
 */
async function checkStatus(params: {
  txHash: string;
  fromChain: string;
  toChain: string;
  bridge?: string;
}) {
  interface Status {
    status: 'PENDING' | 'DONE' | 'FAILED';
    sending: {
      txHash: string;
      chainId: number;
      amount: string;
    };
    receiving?: {
      txHash: string;
      chainId: number;
      amount: string;
    };
    error?: string;
  }

  const status = await apiRequest<Status>('/status', {
    txHash: params.txHash,
    fromChain: params.fromChain,
    toChain: params.toChain,
    ...(params.bridge && { bridge: params.bridge }),
  });

  console.log('\n=== Transaction Status ===');
  console.log('Status:', status.status);
  console.log('Source tx:', status.sending.txHash);

  if (status.receiving) {
    console.log('Destination tx:', status.receiving.txHash);
    console.log('Amount received:', status.receiving.amount);
  }

  if (status.error) {
    console.error('Error:', status.error);
  }

  return status;
}

// ============================================================================
// Poll Status Until Complete
// ============================================================================

/**
 * Poll transaction status until it completes or times out
 */
async function pollStatus(
  txHash: string,
  fromChain: string,
  toChain: string,
  maxAttempts: number = 60
): Promise<any> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await checkStatus({
        txHash,
        fromChain,
        toChain,
      });

      if (status.status === 'DONE') {
        console.log('\n✅ Transaction completed!');
        return status;
      }

      if (status.status === 'FAILED') {
        console.error('\n❌ Transaction failed');
        throw new Error(status.error || 'Transaction failed');
      }

      console.log(`⏳ Attempt ${attempts + 1}/${maxAttempts}: Still pending...`);

      // Wait 5 seconds before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));

      attempts++;
    } catch (error: any) {
      console.error('Status check error:', error.message);

      // Retry after delay
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error('Status check timeout');
}

// ============================================================================
// Complete Flow Example
// ============================================================================

/**
 * Complete flow: Get quote, execute (simulated), track status
 */
async function completeSwapFlow() {
  console.log('=== Complete Swap Flow ===\n');

  // 1. Get available chains
  const chains = await getChains();
  const ethChain = chains.find((c) => c.id === 1);
  const polyChain = chains.find((c) => c.id === 137);

  console.log('\nSelected chains:');
  console.log('  From:', ethChain?.name);
  console.log('  To:', polyChain?.name);

  // 2. Get quote
  const quote = await getQuote({
    fromChain: '1',
    toChain: '137',
    fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    toToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
    fromAmount: '1000000000', // 1000 USDC
    fromAddress: '0x1234567890123456789012345678901234567890',
    integrator: 'api-example',
    fee: '0.003', // 0.3% fee
  });

  // 3. In real implementation: Execute transaction using quote.transactionRequest
  console.log('\n[Simulation] Executing transaction...');
  const simulatedTxHash = '0xabcdef...';

  // 4. Track status
  console.log('\nTracking transaction status...');

  try {
    // In real implementation: Uncomment to track actual transaction
    // const finalStatus = await pollStatus(simulatedTxHash, '1', '137');
    // console.log('\nFinal status:', finalStatus);

    console.log('[Simulation] Transaction would be tracked here');
  } catch (error: any) {
    console.error('Error tracking transaction:', error.message);
  }
}

// ============================================================================
// With Rate Limiting
// ============================================================================

/**
 * API client with built-in rate limiting
 */
class RateLimitedAPIClient {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowSeconds: number = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();

    // Remove old requests
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      console.log(`Rate limit: waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.throttle();
    }

    this.requests.push(now);
  }

  async getQuote(params: any): Promise<any> {
    await this.throttle();
    return getQuote(params);
  }

  async getRoutes(params: any): Promise<any> {
    await this.throttle();
    return getRoutes(params);
  }

  async checkStatus(params: any): Promise<any> {
    await this.throttle();
    return checkStatus(params);
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Robust API call with retries
 */
async function robustAPICall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.message.includes('400') || error.message.includes('401')) {
        throw error;
      }

      // Exponential backoff
      const backoffTime = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoffTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  throw lastError || new Error('API call failed after retries');
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  getChains,
  getTokens,
  getQuote,
  getRoutes,
  checkStatus,
  pollStatus,
  completeSwapFlow,
  RateLimitedAPIClient,
  robustAPICall,
};

// ============================================================================
// Usage Example
// ============================================================================

if (require.main === module) {
  // Run example
  completeSwapFlow().catch(console.error);
}
