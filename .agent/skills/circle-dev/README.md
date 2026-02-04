# Circle Development Skill

Comprehensive development support for building stablecoin-powered applications with Circle's ecosystem.

## 🚀 Quick Start

This skill provides expert guidance for:
- USDC/EURC stablecoin integration
- Programmable Wallets (Developer-Controlled, User-Controlled, Modular)
- Cross-chain transfers (CCTP, Bridge Kit, Gateway)
- Smart contract deployment
- Gas fee optimization (Gas Station, Paymaster)
- Circle Mint and payment APIs

## 📚 Contents

### Main Documentation
- **[skill.md](skill.md)** - Complete Circle development guide with quick start, workflows, and examples

### Reference Guides
- **[product-guide.md](references/product-guide.md)** - Product comparison and selection guide
- **[crosschain-guide.md](references/crosschain-guide.md)** - CCTP, Bridge Kit, and Gateway comparison
- **[security.md](references/security.md)** - Security best practices and checklist
- **[api-reference.md](references/api-reference.md)** - Contract addresses, endpoints, and API reference

### Code Examples
- **[wallet_creation_example.ts](scripts/wallet_creation_example.ts)** - Complete wallet creation and USDC transfers
- **[cctp_transfer_example.ts](scripts/cctp_transfer_example.ts)** - Native cross-chain USDC transfer with CCTP
- **[bridge_kit_example.ts](scripts/bridge_kit_example.ts)** - Simplified cross-chain transfers with Bridge Kit
- **[paymaster_example.ts](scripts/paymaster_example.ts)** - Pay gas fees in USDC using Circle Paymaster

## 🎯 When to Use This Skill

Use this skill when you need to:
- Build applications that accept or send stablecoin payments
- Implement wallet functionality (custodial or non-custodial)
- Transfer USDC across different blockchains
- Deploy and manage smart contracts
- Optimize gas fee UX for users
- Integrate institutional liquidity (Circle Mint)
- Implement global payment settlement

## 🏗️ Product Selection

**Quick Decision Matrix**:

| Use Case | Recommended Products |
|----------|---------------------|
| Accept USDC payments | USDC + Developer-Controlled Wallets |
| Consumer wallet app | User-Controlled Wallets + USDC |
| Cross-chain DeFi | CCTP + USDC |
| Simple cross-chain bridge | Bridge Kit |
| Unified multi-chain balance | Gateway |
| NFT marketplace | Circle Contracts + Wallets |
| Gasless UX | Gas Station + SCA Wallets |
| Users pay gas in USDC | Circle Paymaster |

See [product-guide.md](references/product-guide.md) for detailed comparison.

## 🛠️ Setup

### Prerequisites

```bash
# Node.js 16+ required
node --version

# Install dependencies for examples
npm install
```

### Environment Variables

Create a `.env` file:

```bash
# Circle API Keys
CIRCLE_API_KEY=your_api_key_here
ENTITY_SECRET=your_entity_secret_here

# Blockchain RPC URLs (optional)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Private Key (for signing transactions)
PRIVATE_KEY=0x...

# Bridge Kit (optional)
BRIDGE_API_KEY=your_bridge_api_key
```

### Installation

```bash
# Developer-Controlled Wallets
npm install @circle-fin/developer-controlled-wallets

# Bridge Kit
npm install @circle-fin/bridge-kit

# Other Circle SDKs
npm install @circle-fin/w3s-pw-web-sdk
npm install @circle-fin/circle-sdk
```

## 📖 Usage

### Example 1: Create Wallet and Send USDC

```typescript
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.ENTITY_SECRET!
});

// Create wallet
const wallet = await client.createWallet({
  accountType: 'SCA',
  blockchains: ['ETH-SEPOLIA']
});

// Send USDC
const transfer = await client.createTransaction({
  walletId: wallet.data.walletId,
  blockchain: 'ETH-SEPOLIA',
  tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia
  destinationAddress: '0x...',
  amount: ['10.00']
});
```

### Example 2: Cross-Chain Transfer with Bridge Kit

```typescript
import { createBridgeKit } from '@circle-fin/bridge-kit';

const kit = createBridgeKit({
  apiKey: process.env.BRIDGE_API_KEY
});

const result = await kit.bridge({
  from: { adapter: ethereumWallet, chain: 'Ethereum' },
  to: { adapter: arbitrumWallet, chain: 'Arbitrum' },
  amount: '100.00'
});

console.log('Transfer complete:', result.destTxHash);
```

### Example 3: Native CCTP Transfer

```typescript
// 1. Burn USDC on source chain
const burnTx = await tokenMessenger.depositForBurn(
  amount,
  destinationDomain,
  recipientBytes32,
  usdcAddress
);

// 2. Get attestation from Circle
const attestation = await getAttestation(messageHash);

// 3. Mint on destination chain
const mintTx = await messageTransmitter.receiveMessage(
  attestation.message,
  attestation.attestation
);
```

See complete examples in [scripts/](scripts/) directory.

## 🔐 Security

**Critical Security Practices**:

1. ✅ Store API keys in environment variables
2. ✅ Encrypt entity secrets with secure key management
3. ✅ Verify webhook signatures
4. ✅ Implement rate limiting
5. ✅ Validate all user inputs
6. ✅ Test on testnet before mainnet
7. ✅ Audit smart contracts

See [security.md](references/security.md) for complete security guide.

## 🌐 Supported Networks

### USDC Available On
- **EVM**: Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BSC
- **Non-EVM**: Solana, Sui, Algorand, Stellar, NEAR, Polkadot
- **Total**: 20+ blockchains

### CCTP Supported
- Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, Solana, Sui

### Bridge Kit Routes
- 200+ routes across dozens of blockchains

### Gas Station
- 22+ blockchains (EVM chains, Solana, Aptos)

See [api-reference.md](references/api-reference.md) for complete list.

## 📦 What's Included

### Documentation
- Complete product guide
- Cross-chain solution comparison
- Security best practices
- API reference with addresses

### Code Examples
- Wallet creation and management
- USDC transfers
- CCTP cross-chain transfers
- Bridge Kit integration
- Paymaster (USDC gas payment)

### Integration Patterns
- Developer-Controlled Wallets
- User-Controlled Wallets
- Modular Wallets (MSCA)
- Smart contract deployment
- Gas fee optimization

## 🔗 Resources

- **Documentation**: https://developers.circle.com/
- **API Reference**: https://developers.circle.com/api-reference
- **GitHub**: https://github.com/circlefin
- **Sample Projects**: https://developers.circle.com/sample-projects
- **Status Page**: https://status.circle.com/
- **MCP Server**: https://developers.circle.com/ai/mcp

## 🤝 Context7 Integration

This skill works seamlessly with Context7 for up-to-date documentation:

```
User: "How do I use the new Modular Wallets features?"
→ Use Context7: resolve-library-id("@circle-fin/modular-wallets")
→ Then query-docs with specific questions
→ Apply patterns from this skill
```

## 📄 License

This skill is provided as-is for educational and development purposes.

## 🆘 Support

- **Circle Support**: https://support.circle.com/
- **Developer Docs**: https://developers.circle.com/
- **GitHub Issues**: https://github.com/circlefin (for SDK issues)

---

Built with ❤️ for Circle developers
