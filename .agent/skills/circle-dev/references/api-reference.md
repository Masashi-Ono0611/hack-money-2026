# Circle API Reference

Quick reference for Circle APIs, contract addresses, and endpoints.

## API Endpoints

### Production (Mainnet)
```
Base URL: https://api.circle.com
Attestation API: https://iris-api.circle.com
```

### Sandbox (Testnet)
```
Base URL: https://api-sandbox.circle.com
Attestation API: https://iris-api-sandbox.circle.com
```

---

## USDC Contract Addresses

### Mainnet

| Blockchain | USDC Address | Decimals |
|------------|-------------|----------|
| Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6 |
| Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | 6 |
| Avalanche | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | 6 |
| BSC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | 18 |
| Solana | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |

### Testnet

| Blockchain | USDC Address |
|------------|-------------|
| Ethereum Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Arbitrum Sepolia | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Polygon Amoy | `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` |
| Avalanche Fuji | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| Optimism Sepolia | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` |

---

## EURC Contract Addresses

### Mainnet

| Blockchain | EURC Address |
|------------|-------------|
| Ethereum | `0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c` |
| Avalanche | `0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD` |
| Solana | `HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr` |

---

## CCTP Contract Addresses

### Mainnet

#### Ethereum

| Contract | Address |
|----------|---------|
| TokenMessenger | `0xBd3fa81B58Ba92a82136038B25aDec7066af3155` |
| MessageTransmitter | `0x0a992d191DEeC32aFe36203Ad87D7d289a738F81` |
| TokenMinter | `0xc4922d64a24675E16e1586e3e3Aa56C06fABe907` |

#### Arbitrum

| Contract | Address |
|----------|---------|
| TokenMessenger | `0x19330d10D9Cc8751218eaf51E8885D058642E08A` |
| MessageTransmitter | `0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca` |
| TokenMinter | `0xE7Ed1fa7f45D05C508232aa32649D89b73b8bA48` |

#### Base

| Contract | Address |
|----------|---------|
| TokenMessenger | `0x1682Ae6375C4E4A97e4B583BC394c861A46D8962` |
| MessageTransmitter | `0xAD09780d193884d503182aD4588450C416D6F9D4` |
| TokenMinter | `0x9b537e8C739a61d15b569E0f8D41E8FB87d0bE29` |

---

## Circle Paymaster Addresses

### Mainnet (ERC-4337)

| Blockchain | Paymaster Address | EntryPoint Version |
|------------|-------------------|-------------------|
| Ethereum | Check latest docs | v0.7, v0.8 |
| Arbitrum | Check latest docs | v0.7, v0.8 |
| Base | Check latest docs | v0.7, v0.8 |
| Optimism | Check latest docs | v0.8 |
| Polygon | Check latest docs | v0.8 |
| Avalanche | Check latest docs | v0.8 |

**Note**: Paymaster addresses are updated regularly. Check [developers.circle.com/paymaster](https://developers.circle.com/paymaster) for latest addresses.

---

## API Authentication

### API Key Header
```http
Authorization: Bearer YOUR_API_KEY
```

### Example Request
```bash
curl -X GET 'https://api.circle.com/v1/wallets' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json'
```

---

## Common API Endpoints

### Wallets API

**Create Wallet**
```http
POST /v1/w3s/wallets
```

**Get Wallet**
```http
GET /v1/w3s/wallets/:id
```

**List Wallets**
```http
GET /v1/w3s/wallets
```

**Create Transaction**
```http
POST /v1/w3s/developer/transactions/transfer
```

**Get Transaction**
```http
GET /v1/w3s/transactions/:id
```

### Contracts API

**Deploy Contract**
```http
POST /v1/w3s/developer/contracts/deploy
```

**Get Contract**
```http
GET /v1/w3s/contracts/:id
```

**Execute Contract Function**
```http
POST /v1/w3s/contracts/:id/functions/:functionName/execute
```

### CCTP Attestation API

**Get Attestation**
```http
GET https://iris-api.circle.com/v1/attestations/:messageHash
```

Response:
```json
{
  "status": "complete",
  "attestation": "0x..."
}
```

---

## Blockchain Parameters

### Network Names (for Wallet API)

| Blockchain | API Parameter |
|------------|---------------|
| Ethereum Mainnet | `ETH` |
| Ethereum Sepolia | `ETH-SEPOLIA` |
| Arbitrum | `ARB` |
| Arbitrum Sepolia | `ARB-SEPOLIA` |
| Optimism | `OPT` |
| Base | `BASE` |
| Base Sepolia | `BASE-SEPOLIA` |
| Polygon | `POLY` |
| Polygon Amoy | `POLY-AMOY` |
| Avalanche | `AVAX` |
| Avalanche Fuji | `AVAX-FUJI` |

---

## CCTP Domain IDs

| Blockchain | Domain ID |
|------------|-----------|
| Ethereum | 0 |
| Avalanche | 1 |
| Optimism | 2 |
| Arbitrum | 3 |
| Base | 6 |
| Polygon | 7 |
| Solana | 5 |

---

## Gas Station Supported Networks

Circle Gas Station supports:
- Ethereum (Mainnet & Sepolia)
- Arbitrum (One & Sepolia)
- Optimism (Mainnet & Sepolia)
- Base (Mainnet & Sepolia)
- Polygon (Mainnet & Amoy)
- Avalanche (C-Chain & Fuji)
- And 16+ more networks

Check [developers.circle.com/wallets/gas-station](https://developers.circle.com/wallets/gas-station) for complete list.

---

## SDK Installation

### TypeScript/JavaScript

```bash
# Developer-Controlled Wallets
npm install @circle-fin/developer-controlled-wallets

# User-Controlled Wallets (Web)
npm install @circle-fin/w3s-pw-web-sdk

# User-Controlled Wallets (React Native)
npm install @circle-fin/w3s-pw-react-native-sdk

# Bridge Kit
npm install @circle-fin/bridge-kit

# Circle SDK (unified)
npm install @circle-fin/circle-sdk
```

### Python

```bash
# Circle SDK
pip install circle-sdk-python
```

---

## Rate Limits

### API Rate Limits (Developer Plan)

| Endpoint Type | Limit |
|---------------|-------|
| Wallet Creation | 10/minute |
| Transactions | 100/minute |
| Read Operations | 1000/minute |
| Attestation API | Unlimited |

**Note**: Contact Circle for enterprise limits.

---

## Error Codes

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify API key |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Slow down requests |
| 500 | Server Error | Retry or contact support |

### Circle-Specific Error Codes

| Code | Description |
|------|-------------|
| `insufficient_balance` | Wallet has insufficient funds |
| `invalid_address` | Invalid blockchain address |
| `transaction_failed` | On-chain transaction reverted |
| `attestation_pending` | CCTP attestation not yet available |
| `unsupported_blockchain` | Blockchain not supported for operation |

---

## Webhook Events

### Wallet Events

- `wallet.created`
- `wallet.updated`

### Transaction Events

- `transaction.created`
- `transaction.pending`
- `transaction.complete`
- `transaction.failed`

### Contract Events

- `contract.deployed`
- `contract.event.emitted`

---

## Testing

### Testnet Faucets

**USDC Faucet**
```
https://faucet.circle.com/
```

**Native Token Faucets**
- Sepolia ETH: https://sepoliafaucet.com/
- Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
- Base Sepolia: https://faucet.quicknode.com/base/sepolia

---

## Block Explorers

| Blockchain | Explorer |
|------------|----------|
| Ethereum | https://etherscan.io |
| Arbitrum | https://arbiscan.io |
| Optimism | https://optimistic.etherscan.io |
| Base | https://basescan.org |
| Polygon | https://polygonscan.com |
| Avalanche | https://snowtrace.io |
| Solana | https://explorer.solana.com |

### Testnet Explorers

| Blockchain | Explorer |
|------------|----------|
| Sepolia | https://sepolia.etherscan.io |
| Arbitrum Sepolia | https://sepolia.arbiscan.io |
| Base Sepolia | https://sepolia.basescan.org |
| Polygon Amoy | https://amoy.polygonscan.com |

---

## Resources

- **Main Documentation**: https://developers.circle.com/
- **API Reference**: https://developers.circle.com/api-reference
- **Status Page**: https://status.circle.com/
- **GitHub**: https://github.com/circlefin
- **Support**: https://support.circle.com/
