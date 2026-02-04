# LI.FI Security Best Practices

Critical security guidelines for building production applications with LI.FI.

## Security Checklist

Use this checklist before deploying to production:

### Essential Requirements

- [ ] **Slippage Protection**: Set maximum slippage on all routes (default 0.5% = 0.005)
- [ ] **Token Approval Limits**: Approve exact amounts, never `MaxUint256`
- [ ] **Amount Validation**: Verify `toAmountMin` before executing routes
- [ ] **API Key Protection**: Never expose API keys in frontend code
- [ ] **Rate Limiting**: Implement client-side rate limiting for API calls
- [ ] **Error Handling**: Handle all route failures and network errors gracefully
- [ ] **Transaction Monitoring**: Track transaction status across all chains
- [ ] **Chain Verification**: Verify user is on correct chain before execution
- [ ] **User Confirmation**: Show final amounts, fees, and risks before swap
- [ ] **Bridge Risk Disclosure**: Inform users about bridge security and execution time

### Recommended Practices

- [ ] **Deadline Protection**: Set realistic transaction deadlines (15-30 minutes)
- [ ] **Gas Estimation**: Validate gas estimates before execution
- [ ] **Balance Checks**: Verify user has sufficient balance before swap
- [ ] **Allowance Checks**: Check existing allowances before requesting approval
- [ ] **Transaction Receipts**: Store transaction hashes for tracking
- [ ] **Analytics Logging**: Log swap events for monitoring and debugging
- [ ] **Webhook Verification**: Validate webhook signatures if using backend integration
- [ ] **Input Sanitization**: Validate all user inputs (addresses, amounts)
- [ ] **Smart Contract Audits**: Use audited contracts when possible
- [ ] **Testnet Testing**: Test all flows on testnet before mainnet deployment

## Critical Vulnerabilities

### 1. Unlimited Token Approvals

**Risk**: Malicious contracts can drain all approved tokens

```typescript
// ❌ VULNERABLE
const tx = await token.approve(
  spenderAddress,
  ethers.MaxUint256 // Allows unlimited spending!
);

// ✅ SECURE
const lifi = new LIFI({ integrator: 'your-app' });
await lifi.approveToken({
  token: route.steps[0].action.fromToken,
  amount: route.steps[0].action.fromAmount, // Exact amount only
  spender: route.steps[0].estimate.approvalAddress
});
```

**Best Practice**: Always approve exact amounts required for each transaction.

### 2. Missing Slippage Protection

**Risk**: Users can lose significant value due to price movement or MEV attacks

```typescript
// ❌ VULNERABLE
const routes = await lifi.getRoutes({
  fromChainId: 1,
  fromAmount: '1000000000',
  // Missing slippage parameter!
  ...
});

// ✅ SECURE
const routes = await lifi.getRoutes({
  fromChainId: 1,
  fromAmount: '1000000000',
  options: {
    slippage: 0.005 // 0.5% maximum slippage
  },
  ...
});

// Verify minimum output
const minOutput = BigInt(route.toAmountMin);
console.log('Guaranteed minimum:', minOutput);
```

**Best Practice**: Always set slippage tolerance and verify `toAmountMin` before execution.

### 3. Exposed API Keys

**Risk**: Attackers can use your API key to exhaust rate limits or incur costs

```typescript
// ❌ VULNERABLE - Frontend
const lifi = new LIFI({
  integrator: 'your-app',
  apiKey: 'pk_live_abc123...' // Exposed in browser bundle!
});

// ✅ SECURE - Backend Proxy
// Frontend: Call your backend
const routes = await fetch('/api/lifi/routes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(routeRequest)
}).then(r => r.json());

// Backend: Use API key securely
import { LIFI } from '@lifi/sdk';

export async function POST(request: Request) {
  const lifi = new LIFI({
    integrator: 'your-app',
    apiKey: process.env.LIFI_API_KEY // Only on server!
  });

  const body = await request.json();
  const routes = await lifi.getRoutes(body);

  return Response.json(routes);
}
```

**Best Practice**: Use backend proxy for API calls that require authentication.

### 4. Unvalidated User Input

**Risk**: Malformed input can cause errors or unexpected behavior

```typescript
// ❌ VULNERABLE
const routes = await lifi.getRoutes({
  fromChainId: parseInt(userInput.chainId), // Could be NaN!
  fromAmount: userInput.amount, // Could be negative or invalid!
  fromAddress: userInput.address // Could be malformed!
});

// ✅ SECURE
import { isAddress } from 'viem';

// Validate chain ID
const fromChainId = parseInt(userInput.chainId);
if (!fromChainId || fromChainId < 1) {
  throw new Error('Invalid chain ID');
}

// Validate amount
const amount = BigInt(userInput.amount);
if (amount <= 0n) {
  throw new Error('Amount must be positive');
}

// Validate address
if (!isAddress(userInput.address)) {
  throw new Error('Invalid Ethereum address');
}

const routes = await lifi.getRoutes({
  fromChainId,
  fromAmount: amount.toString(),
  fromAddress: userInput.address
});
```

**Best Practice**: Validate and sanitize all user inputs before API calls.

### 5. Missing Error Handling

**Risk**: Unhandled errors can leave transactions in unknown states

```typescript
// ❌ VULNERABLE
const execution = await lifi.executeRoute({
  route,
  walletClient
});
// What if this fails?

// ✅ SECURE
try {
  const execution = await lifi.executeRoute({
    route,
    walletClient,

    updateRouteHook: (updatedRoute) => {
      // Log status updates
      const currentStep = updatedRoute.steps.find(
        s => s.execution?.status === 'PENDING'
      );
      console.log('Current step:', currentStep?.id);
    }
  });

  // Store successful transaction
  await db.transactions.create({
    routeId: route.id,
    status: 'COMPLETED',
    txHash: execution.txHash
  });

} catch (error) {
  // Handle specific error types
  if (error.code === 'USER_REJECTED') {
    toast.info('Transaction cancelled');
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    toast.error('Insufficient balance');
  } else {
    toast.error('Swap failed. Please try again.');

    // Log for debugging
    console.error('Route execution failed:', error);
    analytics.track('swap_failed', {
      routeId: route.id,
      error: error.message
    });
  }

  // Store failed transaction
  await db.transactions.create({
    routeId: route.id,
    status: 'FAILED',
    error: error.message
  });
}
```

**Best Practice**: Always wrap route execution in try-catch and handle all error cases.

## Wallet Security

### Private Key Management

```typescript
// ❌ NEVER DO THIS
const PRIVATE_KEY = '0x1234...'; // Hardcoded in source!

// ❌ NEVER DO THIS
localStorage.setItem('privateKey', privateKey); // Stored in browser!

// ✅ SECURE - Environment Variables (Backend Only)
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http()
});

// ✅ SECURE - Browser Wallet (Frontend)
import { createWalletClient, custom } from 'viem';

const walletClient = createWalletClient({
  transport: custom(window.ethereum)
});
```

### Transaction Signing

```typescript
// ❌ VULNERABLE - Signing without verification
const signature = await walletClient.signMessage({
  message: untrustedMessage // Could be anything!
});

// ✅ SECURE - Verify what you're signing
import { recoverMessageAddress } from 'viem';

// Show user exactly what they're signing
const message = `
Sign this message to authorize swap:
From: ${route.fromToken.symbol} (${route.fromAmount})
To: ${route.toToken.symbol} (${route.toAmountMin})
Slippage: 0.5%
`;

// User sees this in wallet
const signature = await walletClient.signMessage({ message });

// Verify signature
const recoveredAddress = await recoverMessageAddress({
  message,
  signature
});

if (recoveredAddress !== userAddress) {
  throw new Error('Invalid signature');
}
```

## API Security

### Rate Limiting

```typescript
// Implement client-side rate limiting
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  async throttle(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      console.log(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      return this.throttle(); // Retry
    }

    this.requests.push(now);
  }
}

// Usage
const rateLimiter = new RateLimiter(10, 60); // 10 requests per minute

async function getRoutes(request) {
  await rateLimiter.throttle();

  const lifi = new LIFI({ integrator: 'your-app' });
  return await lifi.getRoutes(request);
}
```

### Request Timeout

```typescript
// Add timeout to API calls
async function getRoutesWithTimeout(request, timeoutMs = 30000) {
  const lifi = new LIFI({ integrator: 'your-app' });

  const routePromise = lifi.getRoutes(request);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );

  try {
    const routes = await Promise.race([routePromise, timeoutPromise]);
    return routes;
  } catch (error) {
    if (error.message === 'Request timeout') {
      console.error('Route request timed out after', timeoutMs, 'ms');
      // Retry with different parameters or show error
    }
    throw error;
  }
}
```

### Webhook Verification

```typescript
import { createHmac } from 'crypto';

export async function verifyLiFiWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in API route
export async function POST(request: Request) {
  const signature = request.headers.get('x-lifi-signature');
  const payload = await request.text();

  const isValid = await verifyLiFiWebhook(
    payload,
    signature,
    process.env.LIFI_WEBHOOK_SECRET
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process webhook
  const data = JSON.parse(payload);
  // ...
}
```

## Smart Contract Security

### Approval Management

```typescript
// Check existing allowance before requesting approval
async function approveIfNeeded(
  token: Token,
  spender: string,
  amount: bigint,
  walletClient: WalletClient
) {
  const currentAllowance = await publicClient.readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletClient.account.address, spender]
  });

  // Only approve if needed
  if (currentAllowance < amount) {
    const approvalTx = await walletClient.writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount] // Exact amount, not unlimited
    });

    await publicClient.waitForTransactionReceipt({ hash: approvalTx });
  }
}
```

### Gas Estimation

```typescript
// Estimate gas before execution
async function executeRouteWithGasCheck(route, walletClient) {
  const step = route.steps[0];

  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateGas({
      account: walletClient.account,
      to: step.estimate.approvalAddress,
      data: step.transactionRequest.data,
      value: step.action.fromAmount
    });

    // Add 20% buffer
    const gasLimit = (gasEstimate * 120n) / 100n;

    console.log('Estimated gas:', gasEstimate.toString());
    console.log('Gas limit:', gasLimit.toString());

    // Execute with gas limit
    const tx = await walletClient.sendTransaction({
      to: step.estimate.approvalAddress,
      data: step.transactionRequest.data,
      gas: gasLimit
    });

    return tx;

  } catch (error) {
    if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas');
    }
    throw error;
  }
}
```

## Frontend Security

### Content Security Policy

```html
<!-- Add to <head> -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://unpkg.com/@lifi/widget;
  style-src 'self' 'unsafe-inline' https://unpkg.com/@lifi/widget;
  connect-src 'self' https://li.quest https://*.li.quest;
  img-src 'self' data: https:;
  font-src 'self' data:;
">
```

### Subresource Integrity (SRI)

```html
<!-- Use SRI for CDN resources -->
<script
  src="https://unpkg.com/@lifi/widget@1.0.0/dist/widget.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

### XSS Prevention

```typescript
// ❌ VULNERABLE - Rendering user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SECURE - Sanitize user input
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: sanitized }} />

// ✅ BETTER - Use React's automatic escaping
<div>{userInput}</div>
```

## Monitoring & Logging

### Transaction Monitoring

```typescript
async function monitorTransaction(txHash: string, chainId: number) {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: txHash
      });

      if (receipt.status === 'success') {
        console.log('Transaction confirmed:', txHash);
        return receipt;
      } else {
        console.error('Transaction failed:', txHash);
        throw new Error('Transaction reverted');
      }

    } catch (error) {
      if (error.message.includes('not found')) {
        // Transaction not yet mined
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Transaction confirmation timeout');
}
```

### Analytics & Logging

```typescript
// Log all swap events for monitoring
const config = {
  integrator: 'your-app',

  onRouteExecutionStarted: (route) => {
    analytics.track('swap_started', {
      routeId: route.id,
      fromChain: route.fromChainId,
      toChain: route.toChainId,
      fromToken: route.fromToken.symbol,
      toToken: route.toToken.symbol,
      amount: route.fromAmount,
      estimatedTime: route.steps.reduce((t, s) => t + s.estimate.executionDuration, 0)
    });
  },

  onRouteExecutionCompleted: (route) => {
    analytics.track('swap_completed', {
      routeId: route.id,
      actualTime: Date.now() - route.executionStartedAt,
      outputAmount: route.toAmount
    });
  },

  onRouteExecutionFailed: (route, error) => {
    analytics.track('swap_failed', {
      routeId: route.id,
      error: error.message,
      failedStep: route.steps.findIndex(s => s.execution?.status === 'FAILED')
    });

    // Alert on critical failures
    if (error.code === 'BRIDGE_FAILURE') {
      alerting.send({
        severity: 'high',
        message: `Bridge failure on route ${route.id}`,
        metadata: { route, error }
      });
    }
  }
};
```

## Incident Response

### Emergency Procedures

1. **Detect Issue**: Monitor logs and analytics for anomalies
2. **Pause Operations**: Disable swap functionality if critical issue detected
3. **Investigate**: Review transaction logs and error reports
4. **Communicate**: Notify users of any issues and expected resolution time
5. **Fix**: Deploy fix and test thoroughly
6. **Resume**: Re-enable functionality after verification
7. **Post-Mortem**: Document incident and implement preventive measures

### Emergency Shutdown

```typescript
// Implement kill switch for critical issues
const EMERGENCY_SHUTDOWN = false; // Set via environment variable

function App() {
  if (EMERGENCY_SHUTDOWN) {
    return (
      <div>
        <h1>Maintenance Mode</h1>
        <p>Swap functionality is temporarily unavailable. Please check back soon.</p>
      </div>
    );
  }

  return <LiFiWidget config={config} />;
}
```

## Security Audit Checklist

Before production deployment:

- [ ] Code review by senior developer
- [ ] Security audit by third party (if handling significant value)
- [ ] Penetration testing
- [ ] Load testing
- [ ] Testnet testing with real scenarios
- [ ] Smart contract audits (if using custom contracts)
- [ ] Dependency vulnerability scan (`npm audit`)
- [ ] Environment variable security review
- [ ] API key rotation plan
- [ ] Incident response plan
- [ ] User communication plan for issues
- [ ] Monitoring and alerting setup
- [ ] Rate limiting verification
- [ ] Error handling verification
- [ ] Transaction monitoring setup

## Resources

- LI.FI Security Docs: https://docs.li.fi/guides/security
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Smart Contract Security Best Practices: https://consensys.github.io/smart-contract-best-practices/
