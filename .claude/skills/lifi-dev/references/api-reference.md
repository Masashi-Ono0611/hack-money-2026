# LI.FI API Reference

Complete REST API documentation for LI.FI integration.

## Base URL

```
https://li.quest/v1
```

## Authentication

API key is optional but recommended for higher rate limits.

```bash
curl -H "x-lifi-api-key: YOUR_API_KEY" https://li.quest/v1/...
```

**Rate Limits**:
- Without API key: 10-30 requests/minute (per IP)
- With API key: 100-300 requests/minute (per key)

## Core Endpoints

### GET /chains

Get all supported blockchains.

**Response**:
```json
[
  {
    "id": 1,
    "name": "Ethereum",
    "key": "eth",
    "chainType": "EVM",
    "nativeToken": {
      "symbol": "ETH",
      "decimals": 18,
      "address": "0x0000000000000000000000000000000000000000"
    },
    "metamask": {
      "chainId": "0x1",
      "chainName": "Ethereum Mainnet"
    }
  }
]
```

### GET /tokens

Get supported tokens across chains.

**Parameters**:
- `chains` (optional): Comma-separated chain IDs (e.g., "1,137,42161")

**Example**:
```bash
curl "https://li.quest/v1/tokens?chains=1,137"
```

**Response**:
```json
{
  "tokens": {
    "1": [
      {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol": "USDC",
        "decimals": 6,
        "chainId": 1,
        "name": "USD Coin",
        "logoURI": "https://..."
      }
    ],
    "137": [...]
  }
}
```

### GET /quote

Get single optimized route quote (fastest endpoint).

**Parameters**:
- `fromChain` (required): Source chain ID
- `toChain` (required): Destination chain ID
- `fromToken` (required): Source token address
- `toToken` (required): Destination token address
- `fromAmount` (required): Amount in smallest unit
- `fromAddress` (required): User wallet address
- `integrator` (optional): Your app name
- `fee` (optional): Integrator fee (decimal, e.g., "0.03" for 3%)
- `slippage` (optional): Max slippage (decimal, default "0.005")
- `order` (optional): "RECOMMENDED" | "FASTEST" | "CHEAPEST" | "SAFEST"
- `fromAmountForGas` (optional): Amount for LI.Fuel gas subsidy

**Example**:
```bash
curl "https://li.quest/v1/quote?\
fromChain=1&\
toChain=137&\
fromToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&\
toToken=0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359&\
fromAmount=1000000000&\
fromAddress=0x1234...&\
integrator=my-app&\
fee=0.03&\
slippage=0.005"
```

**Response**:
```json
{
  "id": "route-123",
  "fromChainId": 1,
  "toChainId": 137,
  "fromToken": {
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "symbol": "USDC",
    "decimals": 6
  },
  "toToken": { ... },
  "fromAmount": "1000000000",
  "toAmount": "998500000",
  "toAmountMin": "993500000",
  "steps": [
    {
      "type": "cross",
      "tool": "stargate",
      "estimate": {
        "executionDuration": 120,
        "approvalAddress": "0x...",
        "gasCosts": [
          {
            "amount": "150000000000000",
            "amountUSD": "0.45"
          }
        ]
      },
      "transactionRequest": {
        "from": "0x...",
        "to": "0x...",
        "data": "0x...",
        "value": "0x00"
      }
    }
  ],
  "gasCostUSD": "0.45"
}
```

### GET /advanced/routes

Get multiple route options for comparison.

**Parameters**: Same as `/quote` endpoint

**Response**:
```json
{
  "routes": [
    { ... }, // Route 1
    { ... }, // Route 2
    { ... }  // Route 3
  ]
}
```

### GET /status

Check transaction status.

**Parameters**:
- `txHash` (required): Transaction hash
- `bridge` (optional): Bridge name (speeds up lookup)
- `fromChain` (required): Source chain ID
- `toChain` (required): Destination chain ID

**Example**:
```bash
curl "https://li.quest/v1/status?\
txHash=0xabc...&\
fromChain=1&\
toChain=137&\
bridge=stargate"
```

**Response**:
```json
{
  "status": "DONE",
  "sending": {
    "txHash": "0xabc...",
    "chainId": 1,
    "amount": "1000000000"
  },
  "receiving": {
    "txHash": "0xdef...",
    "chainId": 137,
    "amount": "998500000"
  }
}
```

**Status Values**:
- `PENDING`: Transaction in progress
- `DONE`: Successfully completed
- `FAILED`: Transaction failed

## Advanced Endpoints

### GET /tools

Get all available bridges and DEX aggregators.

**Response**:
```json
{
  "bridges": [
    {
      "key": "stargate",
      "name": "Stargate",
      "logoURI": "https://..."
    }
  ],
  "exchanges": [
    {
      "key": "uniswap",
      "name": "Uniswap",
      "logoURI": "https://..."
    }
  ]
}
```

### GET /connections

Get available connections between two chains.

**Parameters**:
- `fromChain`: Source chain ID
- `toChain`: Destination chain ID
- `fromToken` (optional): Filter by token
- `toToken` (optional): Filter by token

### POST /advanced/stepTransaction

Execute single step of a multi-step route.

**Request Body**:
```json
{
  "step": { ... }, // Step from route
  "settings": {
    "slippage": 0.005
  }
}
```

## Filtering Options

### Bridge Filtering

```bash
# Allow specific bridges
curl "https://li.quest/v1/quote?...&allowBridges=stargate,across,hop"

# Deny specific bridges
curl "https://li.quest/v1/quote?...&denyBridges=multichain"
```

### Exchange Filtering

```bash
# Allow specific DEXs
curl "https://li.quest/v1/quote?...&allowExchanges=uniswap,1inch"

# Deny specific DEXs
curl "https://li.quest/v1/quote?...&denyExchanges=sushiswap"
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "No routes found for the given parameters",
    "details": { ... }
  }
}
```

### Common Error Codes

- `INVALID_PARAMS`: Missing or invalid request parameters
- `ROUTE_NOT_FOUND`: No available routes
- `INSUFFICIENT_LIQUIDITY`: Not enough liquidity on DEXs/bridges
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `CHAIN_NOT_SUPPORTED`: Chain ID not supported
- `TOKEN_NOT_FOUND`: Token address invalid or not supported

### HTTP Status Codes

- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error
- `503`: Service temporarily unavailable

## Integrator Fees

### Fee Configuration

```bash
curl "https://li.quest/v1/quote?\
...&\
integrator=your-app&\
fee=0.03"  # 3% fee
```

### Fee Collection API

**Endpoint**: `GET /integrators/fees`

**Headers**:
- `Authorization: Bearer YOUR_TOKEN`
- `x-lifi-api-key: YOUR_API_KEY`

**Response**:
```json
{
  "fees": {
    "1": {  // Ethereum
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {  // USDC
        "amount": "1500000000",  // 1500 USDC
        "amountUSD": "1500"
      }
    }
  },
  "totalUSD": "1500"
}
```

**Withdrawal**: `POST /integrators/fees/withdraw`

```json
{
  "chainId": 1,
  "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "amount": "1500000000",
  "recipient": "0x..."
}
```

## Contract Addresses

### USDC Addresses

- Ethereum: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Polygon: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- Arbitrum: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Optimism: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Avalanche: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`

### LI.FI Diamond Proxy

Multi-chain deployment at: `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`

Supports:
- Ethereum, Polygon, Arbitrum, Optimism, Base
- BSC, Avalanche, Fantom, Gnosis
- And more...

## Code Examples

### TypeScript/JavaScript

```typescript
async function getQuote() {
  const response = await fetch(
    'https://li.quest/v1/quote?' +
      new URLSearchParams({
        fromChain: '1',
        toChain: '137',
        fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        toToken: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        fromAmount: '1000000000',
        fromAddress: userAddress,
      }),
    {
      headers: {
        'x-lifi-api-key': process.env.LIFI_API_KEY || '',
      },
    }
  );

  return await response.json();
}
```

### Python

```python
import requests

def get_quote(from_address: str):
    params = {
        'fromChain': '1',
        'toChain': '137',
        'fromToken': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'toToken': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        'fromAmount': '1000000000',
        'fromAddress': from_address
    }

    headers = {
        'x-lifi-api-key': os.getenv('LIFI_API_KEY', '')
    }

    response = requests.get(
        'https://li.quest/v1/quote',
        params=params,
        headers=headers
    )

    return response.json()
```

### Go

```go
package main

import (
    "encoding/json"
    "net/http"
    "net/url"
)

func getQuote(fromAddress string) (map[string]interface{}, error) {
    baseURL := "https://li.quest/v1/quote"

    params := url.Values{}
    params.Add("fromChain", "1")
    params.Add("toChain", "137")
    params.Add("fromToken", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    params.Add("toToken", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359")
    params.Add("fromAmount", "1000000000")
    params.Add("fromAddress", fromAddress)

    req, _ := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
    req.Header.Add("x-lifi-api-key", os.Getenv("LIFI_API_KEY"))

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    return result, nil
}
```

## Best Practices

1. **Cache Chain/Token Data**: `/chains` and `/tokens` data changes infrequently
2. **Rate Limiting**: Implement client-side rate limiting
3. **Timeout Handling**: Set appropriate timeouts (30s recommended)
4. **Error Retry**: Implement exponential backoff for network errors
5. **Status Polling**: Check status every 5-10 seconds for cross-chain swaps
6. **User Feedback**: Show execution time estimates to users
7. **Slippage**: Default to 0.5% (0.005), allow user adjustment
8. **API Key**: Use backend proxy to protect API key
