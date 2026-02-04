# Cross-Chain Transfer Guide

Complete guide to moving USDC across blockchains using Circle's cross-chain solutions.

## Overview

Circle offers three main cross-chain solutions:

1. **CCTP** (Cross-Chain Transfer Protocol) - Native burn/mint protocol
2. **Bridge Kit** - Simplified SDK built on CCTP
3. **Gateway** - Unified balance across chains

## Comparison Matrix

| Feature | CCTP | Bridge Kit | Gateway |
|---------|------|------------|---------|
| **Transfer Type** | Point-to-point | Point-to-point | Unified balance |
| **Integration Complexity** | Medium-High | Low | Medium |
| **Speed** | 15 sec (fast) / 20 min (standard) | Same as CCTP | <500ms (after deposit) |
| **Permissionless** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Supported Chains** | 8+ chains | 200+ routes | Major EVM + Solana |
| **Native USDC** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Programmability** | ✅ Hooks | Limited | Limited |
| **Best For** | Advanced DeFi | Simple transfers | Unified UX |

---

## 1. CCTP (Cross-Chain Transfer Protocol)

### How CCTP Works

```
Source Chain (e.g., Ethereum)
  ↓
1. User approves USDC to TokenMessenger
2. TokenMessenger burns USDC on source chain
3. MessageTransmitter emits event
  ↓
Circle Attestation Service
  ↓
4. Circle monitors and signs the burn event
5. Attestation available via API
  ↓
Destination Chain (e.g., Arbitrum)
  ↓
6. User submits message + attestation
7. MessageTransmitter verifies attestation
8. TokenMinter mints USDC to recipient
```

### CCTP Architecture

**Key Contracts**:
- `TokenMessenger`: Entry point for cross-chain transfers
- `MessageTransmitter`: Handles cross-chain messages
- `TokenMinter`: Mints USDC on destination chain

**Supported Chains**:
- Ethereum
- Arbitrum
- Optimism
- Base
- Polygon
- Avalanche
- Solana
- Sui

### Transfer Modes

**Fast Transfer** (~15 seconds):
- Uses Circle's fast attestation service
- Optimized for user-facing applications
- Slightly higher gas costs

**Standard Transfer** (~20 minutes):
- Waits for blockchain finality
- Lower cost
- More secure for high-value transfers

### CCTP Implementation

See [cctp_transfer_example.ts](../scripts/cctp_transfer_example.ts) for complete code.

**Basic Flow**:

```typescript
import { ethers } from 'ethers';

// 1. Burn USDC on source chain
const tokenMessenger = new ethers.Contract(
  TOKEN_MESSENGER_ADDRESS,
  TOKEN_MESSENGER_ABI,
  signer
);

const burnTx = await tokenMessenger.depositForBurn(
  amount,                    // Amount in USDC base units
  destinationDomain,         // Domain ID of destination chain
  destinationRecipient,      // Recipient address (bytes32)
  usdcAddress               // USDC token address
);

await burnTx.wait();

// 2. Get attestation from Circle
const messageHash = ethers.utils.keccak256(burnTx.logs[0].data);

// Poll Circle Attestation API
let attestationResponse;
while (!attestationResponse.attestation) {
  await new Promise(resolve => setTimeout(resolve, 5000));

  attestationResponse = await fetch(
    `https://iris-api.circle.com/attestations/${messageHash}`
  ).then(res => res.json());
}

// 3. Mint on destination chain
const messageTransmitter = new ethers.Contract(
  MESSAGE_TRANSMITTER_ADDRESS,
  MESSAGE_TRANSMITTER_ABI,
  destSigner
);

const mintTx = await messageTransmitter.receiveMessage(
  attestationResponse.message,
  attestationResponse.attestation
);

await mintTx.wait();
```

### Domain IDs

| Blockchain | Domain ID |
|------------|-----------|
| Ethereum | 0 |
| Avalanche | 1 |
| Optimism | 2 |
| Arbitrum | 3 |
| Base | 6 |
| Polygon | 7 |
| Solana | 5 |

### Programmable Transfers

CCTP supports hooks that execute on the destination chain:

```solidity
contract AutoSwapReceiver {
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external {
        // CCTP mints USDC here
        // Automatically execute swap logic
        executeSwap();
    }

    function executeSwap() internal {
        // Swap USDC for another token on destination chain
    }
}
```

**Use Cases**:
- Automatic token swaps on arrival
- Liquidity provision after transfer
- NFT minting with cross-chain payment
- Automated staking

---

## 2. Bridge Kit

### Overview

Bridge Kit is a simplified SDK that abstracts CCTP complexity.

**Benefits**:
- Minimal code (few lines)
- Handles attestation automatically
- Progress tracking built-in
- Fee collection support
- Retry logic included

### Bridge Kit Implementation

See [bridge_kit_example.ts](../scripts/bridge_kit_example.ts) for complete code.

**Basic Usage**:

```typescript
import { createBridgeKit } from '@circle-fin/bridge-kit';
import { createWalletClient, http } from 'viem';

// 1. Setup wallet adapters
const ethereumWallet = createWalletClient({
  chain: mainnet,
  transport: http()
});

const solanaWallet = /* Solana wallet setup */;

// 2. Initialize Bridge Kit
const kit = createBridgeKit({
  apiKey: process.env.BRIDGE_API_KEY
});

// 3. Execute transfer
const result = await kit.bridge({
  from: {
    adapter: ethereumWallet,
    chain: 'Ethereum'
  },
  to: {
    adapter: solanaWallet,
    chain: 'Solana'
  },
  amount: '100.00'
});

console.log('Transfer status:', result.status);
console.log('Transaction hash:', result.txHash);
```

### Advanced Features

**Fee Collection**:
```typescript
const result = await kit.bridge({
  from: { adapter: viemAdapter, chain: 'Ethereum' },
  to: { adapter: solanaAdapter, chain: 'Solana' },
  amount: '100.00',
  fee: {
    amount: '0.50',    // Collect 0.50 USDC as fee
    recipient: '0x...' // Your fee collection address
  }
});
```

**Custom RPC Endpoints**:
```typescript
const kit = createBridgeKit({
  apiKey: process.env.BRIDGE_API_KEY,
  customRpcUrls: {
    'Ethereum': 'https://your-rpc-url.com',
    'Arbitrum': 'https://your-arb-rpc.com'
  }
});
```

**Progress Tracking**:
```typescript
kit.on('progress', (event) => {
  console.log('Progress:', event.stage);
  // Stages: 'approving', 'burning', 'waiting_attestation', 'minting', 'complete'
});

kit.on('error', (error) => {
  console.error('Transfer error:', error);
});
```

### Supported Routes

Bridge Kit supports 200+ routes across:
- All CCTP-supported chains
- Additional DEX integrations
- L2 rollups
- Alt L1s

Query available routes:
```typescript
const routes = await kit.getAvailableRoutes();

routes.forEach(route => {
  console.log(`${route.from} → ${route.to}: ${route.estimatedTime}s`);
});
```

---

## 3. Gateway

### Overview

Gateway provides a unified USDC balance across multiple chains. Users deposit once and can withdraw on any supported chain instantly.

**Architecture**:

```
User deposits USDC → Gateway Wallet Contract (any chain)
                            ↓
                    Balance pooled in system
                            ↓
        Gateway API issues attestation (<500ms)
                            ↓
User withdraws USDC ← Gateway Minter Contract (any chain)
```

### How Gateway Differs

| Feature | CCTP/Bridge Kit | Gateway |
|---------|-----------------|---------|
| Model | Point-to-point transfer | Unified balance pool |
| Speed | 15 sec - 20 min | <500ms (after initial deposit) |
| UX | User initiates each transfer | User sees single balance |
| Withdrawal | Immediate | 7-day delay for trustless exit |

### Gateway Use Cases

**Best For**:
- Multi-chain applications with single balance UX
- Instant cross-chain availability
- Chain abstraction (hide chains from users)
- Frequent cross-chain operations

**Not Ideal For**:
- One-time transfers (use CCTP/Bridge Kit)
- Instant withdrawals to external wallets (7-day delay)

### Gateway Implementation

```typescript
// 1. Deposit USDC to Gateway
const gatewayWalletAddress = await getGatewayWalletAddress(userAddress);

const depositTx = await usdcContract.transfer(
  gatewayWalletAddress,
  amount
);

await depositTx.wait();

// 2. Wait for balance confirmation
let balance = 0;
while (balance < amount) {
  balance = await fetchGatewayBalance(userAddress);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// 3. Request transfer to destination chain
const transferIntent = await signTransferIntent({
  destinationChain: 'Arbitrum',
  amount: amount
});

// 4. Get attestation from Gateway API
const attestation = await fetch('https://gateway-api.circle.com/attestations', {
  method: 'POST',
  body: JSON.stringify(transferIntent)
}).then(res => res.json());

// 5. Submit attestation to Gateway Minter on destination chain
const mintTx = await gatewayMinter.mint(
  attestation.message,
  attestation.signature
);

await mintTx.wait();
// USDC appears instantly on destination chain
```

### Gateway Withdrawal

**Instant Exit (via transfer to another chain)**: <500ms

**Trustless Exit (withdraw to external wallet)**: 7 days

```typescript
// Initiate trustless withdrawal
const withdrawalTx = await gatewayWallet.initiateWithdrawal(amount);

// Wait 7 days
await new Promise(resolve => setTimeout(resolve, 7 * 24 * 60 * 60 * 1000));

// Complete withdrawal
const completeTx = await gatewayWallet.completeWithdrawal();
```

---

## When to Use Which Solution

### Use CCTP When:
- You need native USDC on both chains
- Building composable DeFi (programmable hooks)
- Integrating into smart contracts
- Want maximum decentralization
- One-time or infrequent transfers

### Use Bridge Kit When:
- You want simple integration (minimal code)
- Building user-facing transfer UI
- Need progress tracking and retry logic
- Want to collect transfer fees
- Prefer high-level abstraction

### Use Gateway When:
- Building multi-chain app with unified balance
- Need instant cross-chain availability (<500ms)
- Want to abstract chains from users
- Frequent cross-chain operations
- Can accept 7-day withdrawal delay

---

## Cost Comparison

| Solution | Gas Cost | Speed | Complexity |
|----------|----------|-------|------------|
| **CCTP Fast** | High | ~15 sec | Medium |
| **CCTP Standard** | Low | ~20 min | Medium |
| **Bridge Kit** | Medium | ~15 sec - 20 min | Low |
| **Gateway** | Very Low (after deposit) | <500ms | Medium |

**Optimization Tips**:
- Use Standard CCTP for large transfers (lower gas)
- Use Fast CCTP/Bridge Kit for user-facing flows
- Use Gateway for frequent operations (amortize deposit cost)

---

## Security Considerations

### CCTP Security

✅ **Do**:
- Verify attestations from Circle API
- Use official TokenMessenger contracts
- Validate destination addresses
- Monitor for failed burns/mints

❌ **Don't**:
- Trust unverified attestations
- Skip finality checks for high-value transfers
- Ignore burn events

### Bridge Kit Security

✅ **Do**:
- Validate wallet adapter configurations
- Set appropriate slippage tolerance
- Monitor transfer progress
- Handle errors gracefully

❌ **Don't**:
- Use untrusted RPC endpoints
- Skip transaction confirmations
- Ignore retry limits

### Gateway Security

✅ **Do**:
- Verify Gateway wallet contract addresses
- Monitor balance updates
- Validate attestation signatures
- Use trustless withdrawal for large amounts

❌ **Don't**:
- Deposit to unverified contracts
- Trust balance without confirmation
- Skip signature verification

---

## Testing

### Testnet Chains

- Ethereum Sepolia
- Arbitrum Sepolia
- Base Sepolia
- Polygon Amoy
- Avalanche Fuji
- Solana Devnet

### Test Procedure

1. **Acquire Test USDC**:
   - Use Circle faucet: https://faucet.circle.com/
   - Or mint via testnet faucets

2. **Test CCTP Flow**:
   ```bash
   # Burn on Sepolia
   # Wait for attestation
   # Mint on Arbitrum Sepolia
   ```

3. **Verify Endpoints**:
   - Testnet Attestation API: `https://iris-api-sandbox.circle.com/`
   - Mainnet Attestation API: `https://iris-api.circle.com/`

---

## Resources

- **CCTP Docs**: https://developers.circle.com/cctp
- **Bridge Kit Docs**: https://developers.circle.com/bridge-kit
- **Gateway Docs**: https://developers.circle.com/gateway
- **CCTP Contracts**: https://github.com/circlefin/evm-cctp-contracts
- **Sample Apps**: https://developers.circle.com/sample-projects
