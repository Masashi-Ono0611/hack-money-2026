# LI.FI Monetization Guide

Complete guide to earning revenue through LI.FI integration.

## Overview

LI.FI enables integrators to earn revenue by adding fees to swaps and bridges. You earn a percentage of each transaction volume flowing through your integration.

## Fee Structure

### Base Fees

- **LI.FI base fee**: 0.25% on all transactions
- **Your integrator fee**: Configurable (typically 0.1% - 1%)
- **User pays**: LI.FI fee + your fee + protocol fees (DEX/bridge)

### Example Fee Breakdown

User swaps 1000 USDC:

```
User input:          1000 USDC
├─ Your fee (0.3%):   -3 USDC  → You earn
├─ LI.FI fee (0.25%): -2.5 USDC → LI.FI
├─ Protocol fees:     -5 USDC  → Uniswap/Stargate/etc
└─ User receives:     989.5 USDC
```

## Getting Started

### 1. Register as Integrator

Sign up at [LI.FI Portal](https://portal.li.fi):

1. Create account with wallet address
2. Set your integrator name
3. Configure fee percentage
4. Get API credentials (optional)

### 2. Add Fee to Integration

#### SDK Integration

```typescript
import { LIFI } from '@lifi/sdk';

const lifi = new LIFI({
  integrator: 'your-app-name', // Required!
  apiKey: process.env.LIFI_API_KEY, // Optional
});

const routes = await lifi.getRoutes({
  fromChainId: 1,
  fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  fromAmount: '1000000000', // 1000 USDC
  toChainId: 137,
  toTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  fromAddress: userAddress,

  // Your fee (3% = 0.03)
  fee: 0.03,
});
```

#### Widget Integration

```typescript
import { LiFiWidget } from '@lifi/widget';

<LiFiWidget
  config={{
    integrator: 'your-app-name',
    fee: 0.03, // 3% fee
  }}
/>
```

#### API Integration

```bash
curl "https://li.quest/v1/quote?\
fromChain=1&\
toChain=137&\
fromToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&\
toToken=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359&\
fromAmount=1000000000&\
fromAddress=0x...&\
integrator=your-app-name&\
fee=0.03"
```

## Fee Management

### Check Collected Fees

```typescript
// Via SDK
import { LIFI } from '@lifi/sdk';

const lifi = new LIFI({
  integrator: 'your-app',
  apiKey: process.env.LIFI_API_KEY,
});

const fees = await lifi.getIntegratorFees();

console.log('Collected fees:', fees);
```

**Response**:
```json
{
  "fees": {
    "1": {
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
        "amount": "15000000000",
        "amountUSD": "15000",
        "symbol": "USDC"
      }
    },
    "137": {
      "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359": {
        "amount": "8000000000",
        "amountUSD": "8000",
        "symbol": "USDC"
      }
    }
  },
  "totalUSD": "23000"
}
```

### Withdraw Fees

#### Via Portal

1. Go to [portal.li.fi](https://portal.li.fi)
2. Connect wallet (must be original integrator wallet)
3. Navigate to "Fees" section
4. Click "Withdraw"
5. Select token and chain
6. Confirm transaction

#### Via API

```typescript
const withdrawal = await fetch('https://li.quest/v1/integrators/fees/withdraw', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'x-lifi-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chainId: 1, // Ethereum
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    amount: '15000000000', // 15000 USDC
    recipient: walletAddress,
  }),
});

const result = await withdrawal.json();
console.log('Withdrawal tx:', result.txHash);
```

**Important**: Must use the same wallet address that was registered as integrator.

## Fee Optimization

### Finding the Optimal Fee

**Too low (<0.1%)**:
- ✅ Higher conversion rate
- ❌ Minimal revenue
- Best for: High-volume applications

**Balanced (0.1% - 0.5%)**:
- ✅ Good conversion rate
- ✅ Reasonable revenue
- Best for: Most applications

**High (>0.5%)**:
- ⚠️ May reduce conversion
- ✅ Higher per-transaction revenue
- Best for: Premium services, unique value-add

### A/B Testing Fees

```typescript
// Implement A/B testing
const userFee = Math.random() < 0.5 ? 0.003 : 0.005; // Test 0.3% vs 0.5%

const routes = await lifi.getRoutes({
  ...params,
  fee: userFee,
});

// Track conversion rates
analytics.track('route_requested', {
  feePercentage: userFee * 100,
  userId: user.id,
});
```

## Revenue Calculation

### Estimating Monthly Revenue

```typescript
function estimateMonthlyRevenue(
  avgTransactionUSD: number,
  transactionsPerDay: number,
  feePercentage: number
): number {
  const dailyRevenue = avgTransactionUSD * transactionsPerDay * feePercentage;
  const monthlyRevenue = dailyRevenue * 30;

  return monthlyRevenue;
}

// Example: 100 swaps/day averaging $500
const revenue = estimateMonthlyRevenue(500, 100, 0.003);
console.log('Estimated monthly revenue:', revenue); // $4,500
```

### Revenue Projections

| Scenario | Avg Swap | Swaps/Day | Fee % | Monthly Revenue |
|----------|----------|-----------|-------|-----------------|
| Small    | $200     | 20        | 0.3%  | $360            |
| Medium   | $500     | 100       | 0.3%  | $4,500          |
| Large    | $1,000   | 500       | 0.3%  | $45,000         |
| Enterprise| $2,000  | 2,000     | 0.2%  | $240,000        |

## Advanced Strategies

### Dynamic Fees

Adjust fees based on user behavior or market conditions:

```typescript
function calculateDynamicFee(user: User): number {
  // New users: lower fee
  if (user.transactionCount < 5) {
    return 0.001; // 0.1%
  }

  // Power users: higher fee acceptable
  if (user.monthlyVolume > 10000) {
    return 0.005; // 0.5%
  }

  // Default
  return 0.003; // 0.3%
}

const routes = await lifi.getRoutes({
  ...params,
  fee: calculateDynamicFee(currentUser),
});
```

### Tiered Pricing

```typescript
const feeSchedule = {
  free: 0, // 0% for first 10 swaps
  basic: 0.003, // 0.3% for casual users
  pro: 0.002, // 0.2% for subscribers
  enterprise: 0.001, // 0.1% for high volume
};

const userFee = feeSchedule[user.tier];
```

### Fee Consolidation

Auto-consolidate fees to a single chain/token:

```typescript
// Configure in portal.li.fi
{
  "autoConsolidate": true,
  "targetChain": 1, // Ethereum
  "targetToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "threshold": "1000", // Consolidate when >$1000 collected
  "schedule": "daily" // or "weekly", "monthly"
}
```

## Volume Discounts

### Enterprise Pricing

For high-volume integrators:

| Monthly Volume | LI.FI Base Fee | Your Savings |
|----------------|----------------|--------------|
| $0 - $1M       | 0.25%          | Standard     |
| $1M - $10M     | 0.20%          | 20% off      |
| $10M - $50M    | 0.15%          | 40% off      |
| $50M+          | Custom         | Negotiable   |

**Contact**: partnerships@li.fi for enterprise pricing

## Analytics & Reporting

### Track Fee Performance

```typescript
// Daily fee collection
const dailyFees = await lifi.getIntegratorFees({
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date().toISOString(),
});

// Volume breakdown
const volumeByChain = Object.entries(dailyFees.fees).map(([chainId, tokens]) => {
  const chainTotal = Object.values(tokens).reduce(
    (sum, token: any) => sum + parseFloat(token.amountUSD),
    0
  );

  return { chainId, totalUSD: chainTotal };
});

console.log('Volume by chain:', volumeByChain);
```

### Revenue Dashboard

Create a dashboard to track:

1. **Daily/Weekly/Monthly revenue**
2. **Revenue by token/chain**
3. **Average fee per transaction**
4. **Transaction volume trends**
5. **User retention impact**

Example metrics:

```typescript
interface RevenueMetrics {
  totalRevenue: number;
  transactionCount: number;
  avgFeePerTx: number;
  topChains: Array<{ chain: string; revenue: number }>;
  topTokens: Array<{ token: string; revenue: number }>;
  growthRate: number; // Month-over-month %
}
```

## Best Practices

### 1. Transparency

Always disclose fees to users:

```typescript
const config = {
  integrator: 'your-app',
  fee: 0.03,

  // Show fee breakdown in UI
  onRouteExecutionStarted: (route) => {
    const feeAmount = (BigInt(route.fromAmount) * 3n) / 100n;

    showNotification({
      title: 'Fee Breakdown',
      message: `
        Amount: ${formatUnits(BigInt(route.fromAmount), 6)} USDC
        Service fee (3%): ${formatUnits(feeAmount, 6)} USDC
        You receive: ${formatUnits(BigInt(route.toAmount), 6)} USDC
      `,
    });
  },
};
```

### 2. Provide Value

Justify fees with value-added services:

- ✅ Superior UX
- ✅ 24/7 support
- ✅ Transaction tracking
- ✅ Portfolio management
- ✅ Price alerts
- ✅ Gas optimization

### 3. Competitive Pricing

Research competitor fees:

| Platform | Typical Fee |
|----------|-------------|
| LI.FI integrators | 0.1% - 1% |
| DEX aggregators | 0% - 0.5% |
| Exchanges (CEX) | 0.1% - 0.5% |
| Wallets | 0.5% - 2% |

### 4. Test & Optimize

```typescript
// Track conversion funnel
analytics.track('quote_viewed', { feePercentage: fee });
analytics.track('swap_initiated', { feePercentage: fee });
analytics.track('swap_completed', { feePercentage: fee });

// Calculate conversion rate
const conversionRate = swapsCompleted / quotesViewed;

// Adjust fees based on data
if (conversionRate < 0.3) {
  // Consider lowering fee
}
```

## Tax & Compliance

### Record Keeping

Track all fee collections for tax purposes:

```typescript
interface FeeRecord {
  timestamp: Date;
  chainId: number;
  token: string;
  amount: string;
  amountUSD: string;
  txHash: string;
  user: string;
}

// Store in database
await db.feeCollections.insert({
  timestamp: new Date(),
  chainId: route.fromChainId,
  token: route.fromToken.address,
  amount: feeAmount.toString(),
  amountUSD: (parseFloat(feeAmount.toString()) / 1e6).toString(),
  txHash: execution.txHash,
  user: userAddress,
});
```

### Tax Reporting

Consult with tax professional for:

1. Income classification (business income vs capital gains)
2. Timing of recognition (collected vs withdrawn)
3. Multi-jurisdiction considerations
4. Crypto-to-crypto transactions
5. Reporting requirements

## Troubleshooting

### Fees Not Appearing

**Problem**: Collected fees not showing in portal

**Solutions**:
1. Verify `integrator` name matches portal registration
2. Check wallet address is correct
3. Wait 24 hours for settlement
4. Contact support@li.fi

### Unable to Withdraw

**Problem**: Withdrawal transaction fails

**Solutions**:
1. Ensure using same wallet as registration
2. Check sufficient gas on destination chain
3. Verify token balance is available
4. Try withdrawing smaller amount

### Fee Calculation Incorrect

**Problem**: Fee amount doesn't match expectation

**Example**:
```typescript
// Fee is deducted from input amount, not output
const fromAmount = 1000; // USDC
const fee = 0.03; // 3%

const feeAmount = fromAmount * fee; // 30 USDC
const netSwapAmount = fromAmount - feeAmount; // 970 USDC swapped
// NOT: fee deducted from output
```

## Support & Resources

- **Portal**: https://portal.li.fi
- **Documentation**: https://docs.li.fi/faqs/fees-monetization
- **Support**: partnerships@li.fi
- **Discord**: https://discord.gg/lifi
