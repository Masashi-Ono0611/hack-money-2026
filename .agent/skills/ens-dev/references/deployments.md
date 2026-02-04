# ENS Contract Deployments

Complete list of ENS contract addresses across all supported networks.

## Ethereum Mainnet

### Core Contracts

**ENS Registry**:
- Address: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- Purpose: Central registry mapping names to owners and resolvers
- Deployment: Genesis of ENSv2

**Base Registrar (.eth)**:
- Address: `0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85`
- Purpose: Manages .eth second-level domain registrations
- Standard: ERC-721 (NFT)

**ETH Registrar Controller**:
- Address: `0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547`
- Purpose: Handles .eth registration with commit-reveal
- Features: Anti-front-running, pricing oracle

**Public Resolver**:
- Address: `0xF29100983E058B709F3D539b0c765937B804AC15`
- Purpose: Default resolver for address, text, and content records
- Interfaces: addr, text, contenthash, pubkey, name

**Universal Resolver**:
- Address: `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`
- Purpose: Unified resolution supporting CCIP Read (ERC-3668)
- Features: Wildcard, L2, offchain resolution

**Name Wrapper**:
- Address: `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401`
- Purpose: Converts ENS names to ERC-1155 NFTs with permissions
- Features: Fuses, expiry management, subdomain control

**Reverse Registrar**:
- Address: `0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb`
- Purpose: Manages reverse resolution (.addr.reverse)
- Function: Claim reverse record for your address

### DNS Integration

**DNSSEC Oracle**:
- Address: `0xB32cB5677a7C971689228EC835800432B339bA2B`
- Purpose: Verifies DNSSEC proofs for DNS domain imports
- Supported: 200+ TLDs (.com, .org, .io, .app, etc.)

**DNS Registrar**:
- Address: `0xB939dC81fCEbd0407c4C64034e30b30B856a8B68`
- Purpose: Allows importing DNS domains into ENS
- Process: DNSSEC verification → ENS registration

### Legacy Contracts

**Legacy Registrar (Auction-based)**:
- Address: `0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef`
- Status: Deprecated (replaced by ETH Registrar Controller)
- Note: No longer accepts new registrations

**Old Public Resolver**:
- Address: `0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41`
- Status: Deprecated
- Migration: Update to new Public Resolver

## Sepolia Testnet

### Core Contracts

**ENS Registry**:
- Address: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- Same address as mainnet

**Base Registrar (.eth)**:
- Address: `0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85`
- Same address as mainnet

**ETH Registrar Controller**:
- Address: `0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968`
- Different from mainnet

**Public Resolver**:
- Address: `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5`
- Different from mainnet

**Universal Resolver**:
- Address: `0xc8Af999e38273D658BE1b921b88A9Ddf005769cC`
- Different from mainnet

**Name Wrapper**:
- Address: `0x0635513f179D50A207757E05759CbD106d7dFcE8`
- Different from mainnet

**Reverse Registrar**:
- Address: `0x132AC0B116a2A12a6c788C45893A9f8e6F0B163B`
- Different from mainnet

### Testnet Faucets

Get Sepolia ETH from:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

## Other Networks

### Layer 2 Networks

ENS is primarily deployed on Ethereum mainnet. L2 resolution is handled via:
- **CCIP Read (ERC-3668)**: Offchain resolution with onchain verification
- **Universal Resolver**: Automatically routes to appropriate resolver

**Supported L2s**:
- Optimism
- Arbitrum
- Base
- Polygon
- zkSync Era
- (via CCIP Read gateways)

### Alternative Chains

ENS contracts are NOT deployed on other chains. For multichain support:
- Use **CCIP Read** for offchain resolution
- Set **coin type addresses** in resolver (SLIP-44)
- Display Ethereum ENS names in your app UI

## Contract ABIs

### ENS Registry ABI

```json
[
  {
    "name": "owner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "name": "resolver",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "name": "ttl",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "uint64"}]
  },
  {
    "name": "setOwner",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "owner", "type": "address"}
    ]
  },
  {
    "name": "setSubnodeOwner",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "label", "type": "bytes32"},
      {"name": "owner", "type": "address"}
    ]
  },
  {
    "name": "setResolver",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "resolver", "type": "address"}
    ]
  }
]
```

### Public Resolver ABI (Minimal)

```json
[
  {
    "name": "addr",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "address"}]
  },
  {
    "name": "addr",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "coinType", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bytes"}]
  },
  {
    "name": "text",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "key", "type": "string"}
    ],
    "outputs": [{"name": "", "type": "string"}]
  },
  {
    "name": "contenthash",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"name": "node", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "bytes"}]
  },
  {
    "name": "setAddr",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "addr", "type": "address"}
    ]
  },
  {
    "name": "setText",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "node", "type": "bytes32"},
      {"name": "key", "type": "string"},
      {"name": "value", "type": "string"}
    ]
  }
]
```

## NPM Package

Get full ABIs from official package:

```bash
npm install @ensdomains/ens-contracts
```

**Usage**:
```typescript
import {
  ENSRegistry__factory,
  PublicResolver__factory,
  ETHRegistrarController__factory
} from '@ensdomains/ens-contracts';

const registry = ENSRegistry__factory.connect(
  '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  provider
);
```

## Verified Contracts

All ENS contracts are verified on Etherscan:
- **Mainnet**: https://etherscan.io/
- **Sepolia**: https://sepolia.etherscan.io/

Search by address to view source code, ABIs, and transactions.

## Contract Upgrades

ENS uses immutable contracts where possible. Updates are via:
- **New deployments**: New contracts with migration path
- **Resolver upgrades**: Users can switch resolvers
- **Registry stability**: Core registry never changes

## Network Configuration

### Hardhat Config

```typescript
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      chainId: 1,
      ens: {
        registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
      }
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
      ens: {
        registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
      }
    }
  }
};

export default config;
```

### Wagmi Config

```typescript
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http()
  }
});
```

## Resources

- **Official Deployments**: https://docs.ens.domains/learn/deployments
- **Contract Source**: https://github.com/ensdomains/ens-contracts
- **Etherscan**: https://etherscan.io/enslookup
- **ENS App**: https://ens.app
