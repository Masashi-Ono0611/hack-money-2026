# Uniswap Version Selection Guide

## Quick Decision Matrix

| Use Case | Recommended Version | Reason |
|----------|-------------------|---------|
| New project with custom logic | **v4** | Hooks system, gas efficiency, latest features |
| Production DeFi integration | **v3** | Battle-tested, extensive tooling, concentrated liquidity |
| Simple swaps, legacy support | **v2** | Simple, stable, wide compatibility |
| MEV-protected trading | **UniswapX** | Intent-based, better execution |

## Version Comparison

### Uniswap v4 (Latest - 2024)

**Status**: Production ready, actively developed

**Key Features**:
- **Hooks**: Custom logic at 14 lifecycle points (beforeSwap, afterSwap, etc.)
- **Singleton Architecture**: Single contract for all pools (massive gas savings)
- **Flash Accounting**: Temporary balance transfers, settle at end
- **Custom Pools**: Configurable fee structures, curve types
- **Native ETH**: Direct ETH support without WETH wrapping

**When to Use**:
- Building innovative AMM features (dynamic fees, oracle integration, custom curves)
- Gas optimization is critical (high-frequency trading, arbitrage)
- Need lifecycle hooks for custom logic
- Starting new DeFi projects

**SDK**: `@uniswap/v4-sdk`
**Contracts**: `@uniswap/v4-core`, `@uniswap/v4-periphery`

**Example Use Cases**:
- TWAMM (Time-Weighted Average Market Maker)
- Limit orders via hooks
- Custom oracle integration
- Geofencing / compliance logic

### Uniswap v3 (Mature - 2021)

**Status**: Production, widely adopted, mature ecosystem

**Key Features**:
- **Concentrated Liquidity**: Provide liquidity in specific price ranges
- **Multiple Fee Tiers**: 0.01%, 0.05%, 0.3%, 1%
- **Non-Fungible Positions**: Each LP position is unique NFT
- **Capital Efficiency**: 4000x improvement over v2
- **Oracle**: Time-Weighted Average Price (TWAP) built-in

**When to Use**:
- Production applications requiring stability
- Concentrated liquidity strategies
- Extensive analytics and tooling needed
- Battle-tested security is priority

**SDK**: `@uniswap/v3-sdk`
**Contracts**: `@uniswap/v3-core`, `@uniswap/v3-periphery`

**Best Practices**:
- Use position managers for complex strategies
- Monitor and rebalance ranges regularly
- Consider impermanent loss in concentrated ranges

### Uniswap v2 (Legacy - 2020)

**Status**: Legacy, still functional, not recommended for new projects

**Key Features**:
- **Simple AMM**: Constant product formula (x * y = k)
- **Fungible LP Tokens**: Standard ERC-20 tokens
- **Fixed Fee**: 0.3% on all pools
- **Full Range Liquidity**: Liquidity across entire price curve

**When to Use**:
- Legacy system maintenance
- Educational purposes
- Extreme simplicity required
- Integration with v2-only protocols

**SDK**: `@uniswap/v2-sdk`

### UniswapX (Intent-Based Trading)

**Status**: Production

**Key Features**:
- **Intent-Based**: Submit desired outcome, not transaction
- **MEV Protection**: Fillers compete for best execution
- **Gasless Swaps**: Fillers pay gas
- **Cross-Chain**: Unified liquidity across chains

**When to Use**:
- Trading interface for end users
- MEV protection needed
- Cross-chain swaps
- Gasless UX desired

## Migration Paths

### v2 → v3
**Difficulty**: Medium

Key Changes:
- Replace full-range positions with concentrated ranges
- Handle NFT positions instead of fungible tokens
- Select appropriate fee tier
- Implement range management/rebalancing

### v3 → v4
**Difficulty**: High (if using hooks), Low (basic swaps)

Key Changes:
- Update to singleton architecture
- Migrate to flash accounting model
- Optional: Implement hooks for custom logic
- Gas savings automatically apply

### v2/v3 → UniswapX
**Difficulty**: Low

Key Changes:
- Integrate intent submission API
- Handle asynchronous execution
- Update UX for intent-based flow

## Development Resources by Version

### v4 Resources
- Docs: https://docs.uniswap.org/contracts/v4/
- SDK: https://docs.uniswap.org/sdk/v4/
- Hooks Examples: https://github.com/Uniswap/v4-periphery/tree/main/src/hooks
- Template: https://github.com/Uniswap/v4-template

### v3 Resources
- Docs: https://docs.uniswap.org/contracts/v3/
- SDK: https://docs.uniswap.org/sdk/v3/
- Examples: https://github.com/Uniswap/examples
- Subgraph: https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3

### v2 Resources
- Docs: https://docs.uniswap.org/contracts/v2/
- SDK: https://docs.uniswap.org/sdk/v2/

## Recommendation Logic

Ask these questions:

1. **Do you need custom AMM logic?** → v4 (use hooks)
2. **Is gas optimization critical?** → v4 (singleton + flash accounting)
3. **Need battle-tested stability?** → v3 (2+ years production)
4. **Building end-user trading interface?** → UniswapX (best UX)
5. **Just need basic swaps?** → v3 (mature tooling) or v4 (gas savings)
6. **Legacy integration?** → Match the version of existing system

**Default for new projects**: Start with v4 unless you need v3's mature ecosystem or have specific constraints.
