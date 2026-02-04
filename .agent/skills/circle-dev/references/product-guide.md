# Circle Product Selection Guide

Complete guide to choosing the right Circle products for your application needs.

## Product Categories

### 1. Stablecoins (Digital Assets)

#### USDC (USD Coin)
**What**: Digital dollar stablecoin pegged 1:1 to USD
- **Backing**: Highly liquid cash and cash-equivalent assets
- **Networks**: 20+ blockchains (Ethereum, Arbitrum, Optimism, Base, Polygon, Solana, etc.)
- **Use Cases**: Payments, DeFi, treasury management, cross-border transfers
- **Integration**: Permissionless - interact directly with smart contracts
- **Best For**: Any USD-denominated payment or DeFi application

#### EURC (EUR Coin)
**What**: Digital euro stablecoin pegged 1:1 to EUR
- **Backing**: 100% euro-denominated reserves
- **Compliance**: MiCA-compliant (EU regulation)
- **Networks**: Major EVM chains + Solana
- **Use Cases**: European payments, EU market integration, euro-denominated DeFi
- **Best For**: Applications targeting European markets

#### xReserve
**What**: Stablecoins backed 1:1 by USDC reserves
- **Reserve Model**: Each xReserve coin backed by USDC
- **Purpose**: Enhanced stablecoin ecosystem with guaranteed stability
- **Integration**: Permissionless
- **Best For**: Projects requiring additional stability layer

#### USYC (US Yield Coin)
**What**: Tokenized yield-bearing US Treasury product
- **Type**: Permissioned asset (requires Circle authentication)
- **Yield**: Generates returns through US Treasury instruments
- **Use Cases**: Institutional yield generation, treasury management
- **Best For**: Institutional clients seeking on-chain yield

---

### 2. Wallet Solutions

#### Developer-Controlled Wallets
**What**: Backend-managed programmable wallets
- **Custody**: Developer/application controls private keys
- **Account Types**: EOA (Externally Owned Account) or SCA (Smart Contract Account)
- **Management**: Server-side SDK
- **Gas Options**: Compatible with Gas Station (developer-sponsored fees)

**Use Cases**:
- Custodial wallets for users
- Backend payment processing
- Automated treasury management
- Gaming asset management
- Batch transaction operations

**Best For**:
- Applications where you manage user funds
- High-volume automated operations
- Telegram bots, Discord bots
- Backend services

**Integration Complexity**: Low (backend SDK)

#### User-Controlled Wallets
**What**: User-custodied wallets with MPC security
- **Custody**: User owns keys (multi-party computation)
- **Authentication**: Social login (Google, Apple, Email, SMS)
- **Recovery**: PIN-based recovery mechanism
- **Experience**: Web2-like UX for Web3 wallets

**Use Cases**:
- Consumer-facing applications
- Self-custody requirements
- Social login onboarding
- Mobile apps (iOS, Android)
- Web applications

**Best For**:
- Consumer apps prioritizing UX
- Applications requiring user custody
- Social-first onboarding experiences

**Integration Complexity**: Medium (client SDK + backend)

#### Modular Wallets (MSCA)
**What**: Flexible smart contract accounts with customizable modules
- **Architecture**: Modular Smart Contract Accounts (ERC-4337)
- **Customization**: Add/remove modules for business logic
- **Standards**: ERC-4337 compliant (Account Abstraction)
- **Modules**: Session keys, spending limits, multi-sig, custom logic

**Use Cases**:
- Advanced business logic requirements
- Custom transaction validation
- Programmable spending policies
- Multi-signature requirements
- Delegated operations (session keys)

**Best For**:
- Complex applications with custom wallet logic
- Enterprise use cases
- Advanced DeFi integrations

**Integration Complexity**: High (requires smart contract knowledge)

---

### 3. Cross-Chain Solutions

#### CCTP (Cross-Chain Transfer Protocol)
**What**: Permissionless native USDC cross-chain transfer
- **Mechanism**: Burn on source chain → Mint on destination chain
- **Speed**: Fast mode (~15 sec) or Standard (~20 min with attestation)
- **Routes**: Ethereum ↔ Arbitrum, Optimism, Base, Polygon, Avalanche, Solana, Sui
- **Programmability**: Hooks for automated actions on arrival

**Use Cases**:
- Native USDC transfers across chains
- DeFi strategies across multiple chains
- Cross-chain payments
- Liquidity management
- Composable cross-chain applications

**Best For**:
- Applications requiring native USDC (no wrapped tokens)
- DeFi protocols with multi-chain strategies
- Advanced developers comfortable with attestation flow

**Integration Complexity**: Medium-High (handle burn/mint + attestation)

#### Bridge Kit
**What**: Simplified SDK for cross-chain USDC transfers
- **Built On**: Uses CCTP as underlying protocol
- **Simplicity**: Minimal code (few lines)
- **Routes**: 200+ bridge routes across dozens of blockchains
- **Features**: Fee collection, retry logic, progress tracking

**Use Cases**:
- Simple cross-chain transfers
- User-facing bridge interfaces
- Multi-chain wallet applications

**Best For**:
- Applications needing quick cross-chain integration
- Teams wanting abstraction over CCTP complexity
- Frontend-heavy applications

**Integration Complexity**: Low (high-level SDK)

#### Gateway
**What**: Unified USDC balance across multiple chains
- **Model**: Single balance accessible on any supported chain
- **Speed**: Instant transfers (<500ms) after initial deposit
- **Custody**: Non-custodial (user-owned smart contracts)
- **Liquidity**: No external liquidity pools needed
- **Withdrawal**: Trustless 7-day delay

**Use Cases**:
- Chain abstraction for users
- Unified balance applications
- Instant multi-chain access
- Reduced fragmentation UX

**Best For**:
- Applications wanting to hide chain complexity from users
- Instant cross-chain requirements
- Unified balance user experience

**Integration Complexity**: Medium (API attestation flow)

---

### 4. Gas Fee Management

#### Gas Station
**What**: Developer-sponsored gas fees for user transactions
- **Payment**: Developer pays via credit card (5% fee on gas)
- **Supported**: 22 blockchains (EVM + Solana + Aptos)
- **Mechanism**: Paymaster (EVM) / Fee-Payer (Solana)
- **Requirements**: Must use Circle Wallets (SCA type for EVM)

**Use Cases**:
- Gasless user experience
- Onboarding new users (no need for native tokens)
- Sponsored transaction campaigns

**Best For**:
- Applications wanting to abstract gas from users entirely
- User acquisition campaigns
- Consumer apps prioritizing UX

**Integration Complexity**: Low (enable on wallet creation)

#### Circle Paymaster
**What**: Users pay gas fees in USDC instead of native tokens
- **Payment**: User-funded (paid in USDC)
- **Supported**: ERC-4337 chains (Ethereum, Arbitrum, Base, Optimism, Polygon, Avalanche, Unichain)
- **Fee**: 10% surcharge on Arbitrum and Base
- **Permissionless**: No API key or Circle account required
- **Compatibility**: Any ERC-4337 wallet

**Use Cases**:
- Simplified gas payment for users
- USDC-native applications
- Reducing friction for users holding only USDC

**Best For**:
- Applications where users already hold USDC
- Permissionless integrations
- Multi-wallet support (not locked to Circle Wallets)

**Integration Complexity**: Medium (ERC-4337 integration)

---

### 5. Smart Contracts

#### Circle Contracts
**What**: Deploy and manage smart contracts via Console or API
- **Deployment**: No-code (Console) or programmatic (API)
- **Templates**: Pre-audited ERC-20, ERC-721, ERC-1155, Airdrop contracts
- **Custom**: Deploy custom contracts via bytecode + ABI
- **Management**: Transaction analytics, admin functions, event monitoring

**Use Cases**:
- Token deployment (fungible, NFT, multi-token)
- Airdrops and distribution campaigns
- DeFi contract deployment
- CCTP-enabled cross-chain contracts

**Best For**:
- Rapid smart contract deployment without Solidity expertise
- Pre-audited standard token contracts
- Integration with Circle Wallets for deployment

**Integration Complexity**: Low (Console) or Medium (API)

---

### 6. Payments & Liquidity

#### Circle Mint
**What**: Institutional fiat ↔ USDC/EURC conversion
- **Target**: Institutional customers (exchanges, banks, wallets, traders)
- **Fees**: Zero fees for mint/redeem
- **Settlement**: Near-instant with partner banks
- **Coverage**: 200+ countries

**Use Cases**:
- Exchange liquidity management
- Institutional treasury operations
- Payment processor integration
- Global remittances

**Best For**:
- Institutional customers needing direct fiat access
- High-volume fiat/crypto conversion
- Treasury management

**Access**: Contact Circle for account setup

#### Circle Payments Network (CPN)
**What**: Real-time global settlement network for financial institutions
- **Target**: Originating Financial Institutions (OFIs)
- **Features**: Real-time FX, smart routing, USDC transfers, compliance
- **Settlement**: End-to-end encrypted, webhook-monitored

**Use Cases**:
- Cross-border payments for banks
- Real-time settlement networks
- Institutional payment routing

**Best For**: Financial institutions offering cross-border payment services

**Access**: Contact Circle for integration

#### StableFX
**What**: FX operations using stablecoins
- **Capabilities**: Multi-currency FX integration via stablecoins
- **Use Cases**: Foreign exchange operations in applications

**Best For**: Applications requiring integrated FX functionality

**Access**: Contact Circle for API access

---

## Decision Matrix

### By Use Case

| Use Case | Recommended Products |
|----------|---------------------|
| Accept USDC payments | USDC + Developer-Controlled Wallets |
| Consumer wallet app | User-Controlled Wallets + USDC |
| Cross-chain DeFi | CCTP + USDC |
| Simple cross-chain bridge | Bridge Kit |
| Unified multi-chain balance | Gateway |
| NFT marketplace | Circle Contracts + Developer-Controlled Wallets |
| Gasless user experience | Gas Station + Developer-Controlled Wallets (SCA) |
| Users pay gas in USDC | Circle Paymaster (permissionless) |
| Institutional liquidity | Circle Mint |
| Banking cross-border payments | Circle Payments Network |
| European payments | EURC |

### By Technical Complexity

| Complexity | Products |
|------------|----------|
| **Low** | USDC/EURC (direct contract), Bridge Kit, Gas Station, Circle Contracts (Console) |
| **Medium** | Developer-Controlled Wallets, User-Controlled Wallets, CCTP, Gateway, Paymaster |
| **High** | Modular Wallets, Custom CCTP integrations, Circle Payments Network |

### By Custody Model

| Custody Model | Products |
|---------------|----------|
| **Developer-Custodial** | Developer-Controlled Wallets |
| **User-Custodial** | User-Controlled Wallets |
| **Non-Custodial** | Direct USDC/EURC smart contract interaction, Gateway |
| **Smart Contract** | Modular Wallets (MSCA) |

---

## Integration Path Examples

### Example 1: Payment App
**Goal**: Accept and send USDC payments with gasless UX

**Stack**:
- USDC (stablecoin)
- Developer-Controlled Wallets (SCA)
- Gas Station (sponsor fees)

**Flow**:
1. Create wallets for users via Developer-Controlled SDK
2. Enable Gas Station on wallet creation
3. Accept USDC deposits to wallet addresses
4. Send USDC payments without users needing ETH/native tokens

---

### Example 2: Cross-Chain DeFi Protocol
**Goal**: Allow users to move liquidity across chains for yield farming

**Stack**:
- USDC
- CCTP (cross-chain transfers)
- User-Controlled Wallets (user custody)

**Flow**:
1. User creates wallet via social login (User-Controlled)
2. User deposits USDC on Ethereum
3. Use CCTP to transfer USDC to Arbitrum for farming
4. User maintains custody throughout

---

### Example 3: Consumer NFT App
**Goal**: Mint and trade NFTs with great UX

**Stack**:
- Circle Contracts (NFT deployment)
- Developer-Controlled Wallets
- Gas Station
- USDC (payment)

**Flow**:
1. Deploy NFT contract via Circle Contracts Console
2. Create wallets for users (Developer-Controlled)
3. Enable Gas Station for gasless minting
4. Users pay in USDC for NFTs

---

### Example 4: Multi-Chain Wallet
**Goal**: Unified balance across multiple chains

**Stack**:
- Gateway (unified balance)
- User-Controlled Wallets
- USDC

**Flow**:
1. User creates wallet via social login
2. Deposit USDC to Gateway on any chain
3. Instantly access balance on any other supported chain
4. Users experience single USDC balance regardless of chain

---

## FAQ

**Q: What's the difference between CCTP and Bridge Kit?**
A: CCTP is the underlying protocol (burn/mint + attestation). Bridge Kit is a simplified SDK that uses CCTP internally but handles complexity for you.

**Q: When should I use Developer-Controlled vs User-Controlled Wallets?**
A: Developer-Controlled when you need backend management and custody. User-Controlled when users need self-custody with social login UX.

**Q: Can I use Gas Station with User-Controlled Wallets?**
A: No, Gas Station requires Circle Wallets and works with Developer-Controlled or Modular Wallets.

**Q: What's the difference between Gas Station and Paymaster?**
A: Gas Station is developer-sponsored (you pay). Paymaster is user-funded (they pay in USDC). Gas Station requires Circle Wallets; Paymaster works with any ERC-4337 wallet.

**Q: Do I need Circle Mint to use USDC?**
A: No. Circle Mint is for institutional customers to mint/redeem USDC. You can acquire USDC via exchanges, DEXs, or other methods.

**Q: Which chains support USDC?**
A: 20+ chains including Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, Solana, Sui, and more. Check Circle documentation for latest list.

**Q: Is CCTP permissionless?**
A: Yes, CCTP is a permissionless onchain utility. No API keys or Circle accounts needed.

**Q: Can I use Gateway and CCTP together?**
A: They serve different purposes. Gateway is for unified balance; CCTP is for point-to-point transfers. Choose based on your UX requirements.
