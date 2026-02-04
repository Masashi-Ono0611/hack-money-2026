# Uniswap Subgraph API Reference

## Overview

The Uniswap Subgraph provides a GraphQL API for querying historical and current data from Uniswap pools. It's indexed via The Graph protocol.

## Endpoints

- **v3 Mainnet**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
- **v3 Arbitrum**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum
- **v3 Optimism**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-optimism
- **v3 Polygon**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon
- **v2 Mainnet**: https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2

## Core Entities

### Factory

Global factory entity tracking protocol-wide metrics:

```graphql
type Factory {
  id: ID!
  poolCount: BigInt!
  txCount: BigInt!
  totalVolumeUSD: BigDecimal!
  totalFeesUSD: BigDecimal!
  totalValueLockedUSD: BigDecimal!
  owner: Bytes!
}
```

**Example Query**:
```graphql
{
  factory(id: "0x1F98431c8aD98523631AE4a59f267346ea31F984") {
    poolCount
    totalVolumeUSD
    totalValueLockedUSD
  }
}
```

### Pool

Individual pool data:

```graphql
type Pool {
  id: ID!  # Pool address
  token0: Token!
  token1: Token!
  feeTier: BigInt!
  liquidity: BigInt!
  sqrtPrice: BigInt!
  tick: BigInt
  token0Price: BigDecimal!
  token1Price: BigDecimal!
  volumeToken0: BigDecimal!
  volumeToken1: BigDecimal!
  volumeUSD: BigDecimal!
  feesUSD: BigDecimal!
  txCount: BigInt!
  totalValueLockedToken0: BigDecimal!
  totalValueLockedToken1: BigDecimal!
  totalValueLockedUSD: BigDecimal!
}
```

**Example Query**:
```graphql
{
  pool(id: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8") {
    token0 {
      symbol
      decimals
    }
    token1 {
      symbol
      decimals
    }
    feeTier
    token0Price
    token1Price
    volumeUSD
    totalValueLockedUSD
  }
}
```

### Token

Token information:

```graphql
type Token {
  id: ID!  # Token address
  symbol: String!
  name: String!
  decimals: BigInt!
  totalSupply: BigInt!
  volume: BigDecimal!
  volumeUSD: BigDecimal!
  feesUSD: BigDecimal!
  txCount: BigInt!
  totalValueLocked: BigDecimal!
  totalValueLockedUSD: BigDecimal!
  derivedETH: BigDecimal!
}
```

**Example Query**:
```graphql
{
  token(id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48") {
    symbol
    name
    decimals
    totalValueLockedUSD
    volumeUSD
  }
}
```

### Swap

Individual swap transactions:

```graphql
type Swap {
  id: ID!
  transaction: Transaction!
  timestamp: BigInt!
  pool: Pool!
  token0: Token!
  token1: Token!
  sender: Bytes!
  recipient: Bytes!
  origin: Bytes!
  amount0: BigDecimal!
  amount1: BigDecimal!
  amountUSD: BigDecimal!
  sqrtPriceX96: BigInt!
  tick: BigInt!
  logIndex: BigInt
}
```

**Example Query**:
```graphql
{
  swaps(
    first: 10
    orderBy: timestamp
    orderDirection: desc
    where: {
      pool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
    }
  ) {
    timestamp
    amount0
    amount1
    amountUSD
    token0 { symbol }
    token1 { symbol }
  }
}
```

### Position

Liquidity provider positions:

```graphql
type Position {
  id: ID!  # NFT token ID
  owner: Bytes!
  pool: Pool!
  token0: Token!
  token1: Token!
  tickLower: Tick!
  tickUpper: Tick!
  liquidity: BigInt!
  depositedToken0: BigDecimal!
  depositedToken1: BigDecimal!
  withdrawnToken0: BigDecimal!
  withdrawnToken1: BigDecimal!
  collectedFeesToken0: BigDecimal!
  collectedFeesToken1: BigDecimal!
}
```

**Example Query**:
```graphql
{
  positions(
    where: {
      owner: "0x..."
      liquidity_gt: "0"
    }
  ) {
    id
    pool {
      token0 { symbol }
      token1 { symbol }
    }
    liquidity
    depositedToken0
    depositedToken1
    collectedFeesToken0
    collectedFeesToken1
  }
}
```

## Common Query Patterns

### 1. Top Pools by Volume (24h)

```graphql
{
  pools(
    first: 10
    orderBy: volumeUSD
    orderDirection: desc
  ) {
    id
    token0 { symbol }
    token1 { symbol }
    volumeUSD
    totalValueLockedUSD
    feeTier
  }
}
```

### 2. Token Price History

```graphql
{
  tokenDayDatas(
    first: 30
    orderBy: date
    orderDirection: desc
    where: {
      token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  # USDC
    }
  ) {
    date
    priceUSD
    volumeUSD
    totalValueLockedUSD
  }
}
```

### 3. Pool Statistics (Historical)

```graphql
{
  poolDayDatas(
    first: 7
    orderBy: date
    orderDirection: desc
    where: {
      pool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
    }
  ) {
    date
    volumeUSD
    tvlUSD
    feesUSD
    txCount
  }
}
```

### 4. Recent Swaps for a Pool

```graphql
{
  swaps(
    first: 100
    orderBy: timestamp
    orderDirection: desc
    where: {
      pool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"
    }
  ) {
    timestamp
    sender
    amount0
    amount1
    amountUSD
    transaction { id }
  }
}
```

### 5. User's Active Positions

```graphql
{
  positions(
    where: {
      owner: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
      liquidity_gt: "0"
    }
  ) {
    id
    pool {
      token0 { symbol }
      token1 { symbol }
    }
    liquidity
    tickLower { tickIdx }
    tickUpper { tickIdx }
    collectedFeesToken0
    collectedFeesToken1
  }
}
```

### 6. Protocol Analytics

```graphql
{
  uniswapDayDatas(
    first: 30
    orderBy: date
    orderDirection: desc
  ) {
    date
    volumeUSD
    tvlUSD
    feesUSD
    txCount
  }
}
```

### 7. Token Search

```graphql
{
  tokens(
    where: {
      symbol_contains_nocase: "usdc"
    }
    first: 5
  ) {
    id
    symbol
    name
    volumeUSD
    totalValueLockedUSD
  }
}
```

### 8. Large Swaps (Whale Tracking)

```graphql
{
  swaps(
    first: 10
    orderBy: amountUSD
    orderDirection: desc
    where: {
      amountUSD_gt: "100000"
    }
  ) {
    timestamp
    pool {
      token0 { symbol }
      token1 { symbol }
    }
    amount0
    amount1
    amountUSD
    origin
  }
}
```

## Pagination

Subgraph queries are limited to 1000 results. Use pagination:

```graphql
{
  # First page
  swaps(first: 1000, skip: 0, orderBy: timestamp) {
    id
    timestamp
  }
}

{
  # Second page
  swaps(first: 1000, skip: 1000, orderBy: timestamp) {
    id
    timestamp
  }
}
```

Or use cursor-based pagination with block numbers:

```graphql
{
  # First page
  swaps(
    first: 1000
    where: { timestamp_gt: "0" }
    orderBy: timestamp
  ) {
    timestamp
  }
}

{
  # Next page (use last timestamp from previous query)
  swaps(
    first: 1000
    where: { timestamp_gt: "1642521600" }
    orderBy: timestamp
  ) {
    timestamp
  }
}
```

## Time-Based Queries

The Graph uses Unix timestamps (seconds since epoch):

```graphql
{
  swaps(
    where: {
      timestamp_gte: "1642521600"  # After Jan 18, 2022
      timestamp_lt: "1642608000"   # Before Jan 19, 2022
    }
  ) {
    timestamp
    amountUSD
  }
}
```

JavaScript helper:
```javascript
const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

const query = `
  {
    swaps(where: { timestamp_gte: "${oneDayAgo}" }) {
      timestamp
      amountUSD
    }
  }
`;
```

## Filtering

Supported filter operators:
- `_gt`: Greater than
- `_gte`: Greater than or equal
- `_lt`: Less than
- `_lte`: Less than or equal
- `_in`: In array
- `_not`: Not equal
- `_contains`: String contains (case-sensitive)
- `_contains_nocase`: String contains (case-insensitive)
- `_starts_with`: String starts with
- `_ends_with`: String ends with

Example:
```graphql
{
  pools(
    where: {
      volumeUSD_gt: "1000000"
      feeTier_in: ["500", "3000"]
      token0_: { symbol_contains: "WETH" }
    }
  ) {
    id
    volumeUSD
  }
}
```

## Using with TypeScript/JavaScript

### Setup

```bash
npm install graphql-request graphql
```

### Query Example

```typescript
import { request, gql } from 'graphql-request';

const UNISWAP_V3_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

async function getPoolData(poolAddress: string) {
  const query = gql`
    query GetPool($id: ID!) {
      pool(id: $id) {
        token0 {
          symbol
          decimals
        }
        token1 {
          symbol
          decimals
        }
        token0Price
        token1Price
        volumeUSD
        totalValueLockedUSD
      }
    }
  `;

  const variables = {
    id: poolAddress.toLowerCase()
  };

  const data = await request(UNISWAP_V3_SUBGRAPH, query, variables);
  return data.pool;
}

// Usage
const poolData = await getPoolData('0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8');
console.log(`${poolData.token0.symbol}/${poolData.token1.symbol}`);
console.log(`TVL: $${poolData.totalValueLockedUSD}`);
```

### Advanced: Real-time Price Tracking

```typescript
async function getTokenPriceUSD(tokenAddress: string): Promise<number> {
  const query = gql`
    query GetToken($id: ID!) {
      token(id: $id) {
        derivedETH
      }
      bundle(id: "1") {
        ethPriceUSD
      }
    }
  `;

  const data = await request(UNISWAP_V3_SUBGRAPH, query, {
    id: tokenAddress.toLowerCase()
  });

  const ethPrice = parseFloat(data.bundle.ethPriceUSD);
  const tokenEthPrice = parseFloat(data.token.derivedETH);

  return ethPrice * tokenEthPrice;
}

// Get USDC price
const usdcPrice = await getTokenPriceUSD('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
```

## Rate Limiting

The Graph enforces rate limits:
- Free tier: ~1000 requests/day
- Consider caching responses
- Use batch queries when possible
- For production, consider running your own graph node

## Troubleshooting

### Query Too Complex
If you get "query complexity" errors, reduce:
- Number of fields requested
- Nested entity depth
- Result count (`first` parameter)

### Stale Data
Subgraph may lag blockchain by ~1-5 minutes. For real-time data:
- Query blockchain directly via RPC
- Use events from pool contracts
- Combine subgraph (historical) + RPC (real-time)

## Resources

- Subgraph Explorer: https://thegraph.com/explorer
- API Docs: https://docs.uniswap.org/api/subgraph
- GraphQL Docs: https://graphql.org/learn/
- The Graph Docs: https://thegraph.com/docs/
