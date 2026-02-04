# ENS Development Skill

Comprehensive ENS (Ethereum Name Service) development support skill for Claude Code.

## Overview

This skill provides complete guidance for building applications with ENS, covering:

- ✅ Name registration and management (.eth domains)
- ✅ Name resolution (forward and reverse)
- ✅ Subdomain creation and management
- ✅ Avatar and profile records
- ✅ Smart contract integration
- ✅ Multichain resolution (L2, CCIP Read)
- ✅ Name Wrapper and permissions (fuses)
- ✅ DNS integration
- ✅ Security best practices

## Quick Start

### 1. Basic Name Resolution

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

// Resolve name to address
const address = await client.getEnsAddress({
  name: normalize('vitalik.eth')
});

// Resolve address to name
const name = await client.getEnsName({
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
});
```

### 2. Register .eth Domain

See [scripts/registration_example.ts](scripts/registration_example.ts) for complete registration flow with commit-reveal pattern.

### 3. Create Subdomains

See [scripts/subdomain_creation.ts](scripts/subdomain_creation.ts) for subdomain creation with or without Name Wrapper.

### 4. Set Profile Records

See [scripts/profile_records.ts](scripts/profile_records.ts) for managing avatars, social profiles, and contact info.

### 5. Smart Contract Integration

See [assets/contract-integration-template.sol](assets/contract-integration-template.sol) for production-ready Solidity templates.

## File Structure

```
ens-dev/
├── skill.md                          # Main skill documentation
├── README.md                         # This file
├── scripts/                          # Example scripts
│   ├── basic_resolution.ts           # Name resolution examples
│   ├── registration_example.ts       # .eth domain registration
│   ├── subdomain_creation.ts         # Subdomain management
│   ├── profile_records.ts            # Avatar and profile records
│   └── ccip_read_example.ts          # L2/offchain resolution
├── references/                       # Reference documentation
│   ├── security.md                   # Security best practices
│   ├── resolution-guide.md           # Complete resolution patterns
│   └── deployments.md                # Contract addresses
└── assets/                           # Production templates
    └── contract-integration-template.sol  # Solidity integration
```

## Key Features

### Name Resolution

- Forward resolution (name → address)
- Reverse resolution (address → name)
- Avatar resolution (NFT, IPFS, HTTP)
- Text records (social profiles, contact info)
- Content hash (decentralized websites)
- Multichain addresses (Bitcoin, Solana, etc.)

### Registration & Management

- .eth domain registration (commit-reveal)
- Subdomain creation (basic and wrapped)
- Name Wrapper with fuses (permissions)
- Batch operations
- DNS domain integration

### Developer Tools

- TypeScript/JavaScript examples (viem, ethers)
- Solidity contract templates
- React integration (wagmi)
- Testing patterns
- Error handling

### Security

- Name normalization (UTS-46)
- Homograph attack prevention
- Resolver trust verification
- Expiry validation
- CCIP Read security

## Prerequisites

### For TypeScript/JavaScript

```bash
npm install viem         # Recommended for ENSv2
# or
npm install ethers       # Alternative (v6+)
# or
npm install wagmi viem   # For React
```

### For Solidity

```bash
npm install @ensdomains/ens-contracts
# or
forge install ensdomains/ens-contracts
```

## Usage

### Invoke the Skill

```bash
# In Claude Code
/ens-dev
```

### Common Tasks

1. **"How do I resolve an ENS name?"**
   - Skill guides you through resolution with viem/ethers
   - Provides code examples from [scripts/basic_resolution.ts](scripts/basic_resolution.ts)

2. **"How do I register a .eth domain?"**
   - Explains commit-reveal process
   - Provides complete example from [scripts/registration_example.ts](scripts/registration_example.ts)

3. **"How do I create subdomains?"**
   - Shows basic and wrapped subdomain creation
   - References [scripts/subdomain_creation.ts](scripts/subdomain_creation.ts)

4. **"How do I integrate ENS in my smart contract?"**
   - Provides Solidity templates
   - References [assets/contract-integration-template.sol](assets/contract-integration-template.sol)

5. **"How do I set an avatar?"**
   - Explains NFT, IPFS, HTTP avatar formats
   - References [scripts/profile_records.ts](scripts/profile_records.ts)

## Contract Addresses

### Mainnet

- ENS Registry: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- ETH Registrar Controller: `0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547`
- Public Resolver: `0xF29100983E058B709F3D539b0c765937B804AC15`
- Universal Resolver: `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`
- Name Wrapper: `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401`

### Sepolia Testnet

- ENS Registry: `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- ETH Registrar Controller: `0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968`
- Public Resolver: `0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5`

Full list: [references/deployments.md](references/deployments.md)

## Resources

### Official Documentation

- **Main Docs**: https://docs.ens.domains/
- **Protocol**: https://docs.ens.domains/learn/protocol
- **Deployments**: https://docs.ens.domains/learn/deployments
- **FAQ**: https://docs.ens.domains/faq

### Code & Tools

- **ENS Contracts**: https://github.com/ensdomains/ens-contracts
- **ENS App**: https://ens.app
- **ENS Manager**: https://ens.domains/

### Support

- **Bug Bounty**: Immunefi (up to $250K)
- **GitHub**: https://github.com/ensdomains
- **Documentation Issues**: https://github.com/ensdomains/docs/issues

## Testing

All examples use Sepolia testnet by default. Get test ETH from:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

## Contributing

This skill is maintained as part of the Claude Code skills library. For issues or improvements:

1. Test changes on Sepolia testnet
2. Verify examples work with latest ENS contracts
3. Update documentation accordingly
4. Follow existing code style

## License

This skill documentation is provided as-is for educational purposes. ENS protocol contracts are licensed under MIT.

## Version

- **Skill Version**: 1.0.0
- **ENS Version**: ENSv2 (Universal Resolver)
- **Last Updated**: 2026-01-25
- **Compatible with**: viem 2.35.0+, ethers v6+, wagmi 2.0+

---

**Need Help?**

Use `/ens-dev` to invoke this skill and get comprehensive ENS development support!
