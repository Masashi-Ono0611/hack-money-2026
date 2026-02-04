# ENS Resolution Guide

Complete guide to resolving ENS names in various scenarios.

## Resolution Types

### 1. Forward Resolution (Name → Address)

Convert ENS name to Ethereum address.

**Using viem (recommended)**:
```typescript
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

const address = await client.getEnsAddress({
  name: normalize('vitalik.eth')
});
// Returns: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Using ethers.js**:
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY');
const address = await provider.resolveName('vitalik.eth');
```

### 2. Reverse Resolution (Address → Name)

Convert Ethereum address to ENS name.

**Using viem**:
```typescript
const name = await client.getEnsName({
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
});
// Returns: vitalik.eth
```

**Using ethers.js**:
```typescript
const name = await provider.lookupAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
```

**Important**: Reverse resolution requires the address owner to set a reverse record. If not set, returns `null`.

### 3. Avatar Resolution

Get avatar image URL (supports NFTs, IPFS, HTTP).

**Using viem**:
```typescript
const avatar = await client.getEnsAvatar({
  name: normalize('vitalik.eth')
});
// Returns: https://... or ipfs://... or data:...
```

**Avatar Formats**:
- **NFT**: `eip155:1/erc721:0xcontract/tokenId`
- **IPFS**: `ipfs://Qm...`
- **HTTP**: `https://...`
- **Data URI**: `data:image/svg+xml;base64,...`

### 4. Text Records

Get social profiles, URLs, and metadata.

**Common text record keys**:
- `com.twitter` - Twitter handle
- `com.github` - GitHub username
- `com.discord` - Discord username
- `url` - Website URL
- `email` - Email address
- `description` - Bio/description
- `avatar` - Avatar URL
- `notice` - Legal notice

**Using viem**:
```typescript
const twitter = await client.getEnsText({
  name: normalize('vitalik.eth'),
  key: 'com.twitter'
});
// Returns: vitalikbuterin

const url = await client.getEnsText({
  name: normalize('vitalik.eth'),
  key: 'url'
});
// Returns: https://vitalik.eth.limo
```

### 5. Content Hash

Get IPFS/Swarm content hash for decentralized websites.

**Using ethers.js**:
```typescript
const resolver = await provider.getResolver('vitalik.eth');
const contentHash = await resolver.getContentHash();
// Returns: ipfs://Qm... or /ipfs/Qm...
```

### 6. Multichain Addresses

Resolve addresses for non-Ethereum chains.

**Using viem**:
```typescript
// Bitcoin address (coinType: 0)
const btcAddr = await publicClient.readContract({
  address: resolverAddress,
  abi: resolverAbi,
  functionName: 'addr',
  args: [namehash('name.eth'), 0]
});

// Common coin types (SLIP-44):
// 0 - Bitcoin
// 60 - Ethereum
// 118 - Cosmos
// 144 - Ripple
// 501 - Solana
```

## Advanced Resolution Patterns

### Batch Resolution

Resolve multiple names efficiently:

```typescript
async function batchResolve(names: string[]): Promise<Map<string, string | null>> {
  const results = new Map();

  const promises = names.map(async (name) => {
    const address = await client.getEnsAddress({
      name: normalize(name)
    }).catch(() => null);
    return { name, address };
  });

  const resolved = await Promise.all(promises);

  resolved.forEach(({ name, address }) => {
    results.set(name, address);
  });

  return results;
}

// Usage
const names = ['vitalik.eth', 'nick.eth', 'brantly.eth'];
const addresses = await batchResolve(names);
```

### Resolution with Timeout

Prevent hanging on slow CCIP Read resolvers:

```typescript
async function resolveWithTimeout(
  name: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  const timeoutPromise = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );

  const resolvePromise = client.getEnsAddress({
    name: normalize(name)
  });

  try {
    return await Promise.race([resolvePromise, timeoutPromise]);
  } catch (error) {
    console.error(`Resolution timeout for ${name}`);
    return null;
  }
}
```

### Cached Resolution

Implement caching to reduce RPC calls:

```typescript
class ENSCache {
  private cache = new Map<string, { address: string | null; timestamp: number }>();
  private ttl = 300000; // 5 minutes

  async resolve(name: string): Promise<string | null> {
    const cached = this.cache.get(name);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.address;
    }

    const address = await client.getEnsAddress({
      name: normalize(name)
    }).catch(() => null);

    this.cache.set(name, { address, timestamp: Date.now() });
    return address;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Resolution with Fallback

Handle resolution failures gracefully:

```typescript
async function resolveWithFallback(nameOrAddress: string): Promise<string> {
  // Check if already an address
  if (/^0x[a-fA-F0-9]{40}$/.test(nameOrAddress)) {
    return nameOrAddress as `0x${string}`;
  }

  // Try ENS resolution
  try {
    const address = await client.getEnsAddress({
      name: normalize(nameOrAddress)
    });

    if (address) return address;
  } catch (error) {
    console.warn(`ENS resolution failed for ${nameOrAddress}`);
  }

  // Fallback: return original input or throw
  throw new Error(`Cannot resolve: ${nameOrAddress}`);
}
```

## Universal Resolver

The Universal Resolver (0xeEeEEEeE...) handles all resolution types automatically:

**Benefits**:
- Supports CCIP Read (ERC-3668) for L2/offchain resolution
- Handles wildcard resolution
- Automatic fallback mechanisms
- Future-proof for new resolver types

**Using Universal Resolver directly**:
```typescript
const UNIVERSAL_RESOLVER = '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe';

const resolved = await publicClient.readContract({
  address: UNIVERSAL_RESOLVER,
  abi: universalResolverAbi,
  functionName: 'resolve',
  args: [dnsEncode(normalize('name.eth')), resolveCalldata]
});
```

**Note**: Modern libraries (viem 2.35.0+, ethers v6+) use Universal Resolver automatically.

## CCIP Read (ERC-3668)

For L2 and offchain resolution:

**How it works**:
1. Client queries resolver contract
2. Resolver reverts with `OffchainLookup` error containing gateway URL
3. Client fetches data from gateway
4. Client calls resolver again with gateway response
5. Resolver verifies and returns data

**Testing CCIP Read**:
```typescript
// This should resolve via CCIP Read
const address = await client.getEnsAddress({
  name: normalize('test.offchaindemo.eth')
});
// Should return: 0x779981590E7Ccc0CFAe8040Ce7151324747cDb97
```

**Timeout handling**:
```typescript
const resolved = await client.getEnsAddress({
  name: normalize('l2name.eth')
}).catch((error) => {
  if (error.name === 'OffchainLookupError') {
    console.log('CCIP Read failed, using fallback');
    return null;
  }
  throw error;
});
```

## Name Normalization

**Always normalize before resolution**:

```typescript
import { normalize } from 'viem/ens';

// Handles:
// - Unicode normalization
// - Lowercase conversion
// - Invalid character detection
// - Emoji support

const normalized = normalize('VitaLik.eTh');
// Returns: vitalik.eth

// Will throw on invalid names
try {
  normalize('invalid..eth'); // Double dots not allowed
} catch (error) {
  console.error('Invalid ENS name');
}
```

## Error Handling

**Common errors and solutions**:

```typescript
async function safeResolve(name: string): Promise<string | null> {
  try {
    return await client.getEnsAddress({
      name: normalize(name)
    });
  } catch (error: any) {
    // No resolver set
    if (error.message.includes('resolver')) {
      console.log('No resolver configured');
      return null;
    }

    // Invalid name format
    if (error.message.includes('normalize')) {
      console.log('Invalid ENS name format');
      return null;
    }

    // CCIP Read timeout
    if (error.name === 'OffchainLookupError') {
      console.log('Offchain resolution failed');
      return null;
    }

    // RPC error
    if (error.message.includes('RPC')) {
      console.log('RPC connection failed');
      return null;
    }

    throw error; // Unknown error
  }
}
```

## Performance Optimization

### 1. Batch Queries

Use `multicall` for multiple resolutions:

```typescript
import { multicall } from 'viem/actions';

const results = await multicall(publicClient, {
  contracts: names.map(name => ({
    address: UNIVERSAL_RESOLVER,
    abi: universalResolverAbi,
    functionName: 'resolve',
    args: [dnsEncode(normalize(name)), addrCalldata]
  }))
});
```

### 2. Parallel Resolution

Resolve independent names in parallel:

```typescript
const [addr1, addr2, addr3] = await Promise.all([
  client.getEnsAddress({ name: normalize('name1.eth') }),
  client.getEnsAddress({ name: normalize('name2.eth') }),
  client.getEnsAddress({ name: normalize('name3.eth') })
]);
```

### 3. Smart Caching

Cache by TTL from registry:

```typescript
const ttl = await publicClient.readContract({
  address: ENS_REGISTRY,
  abi: registryAbi,
  functionName: 'ttl',
  args: [namehash('name.eth')]
});

// Cache for TTL duration
cache.set(name, address, Number(ttl) * 1000);
```

## Testing

**Mock resolution for tests**:

```typescript
import { http } from 'viem';
import { createPublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { MockProvider } from 'viem/test';

const mockClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Mock response
vi.spyOn(mockClient, 'getEnsAddress').mockResolvedValue(
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
);
```

## Resources

- **Universal Resolver**: https://docs.ens.domains/resolvers/universal
- **CCIP Read Spec**: https://eips.ethereum.org/EIPS/eip-3668
- **Name Normalization**: https://docs.ens.domains/resolution/names#normalisation
- **Resolver Interface**: https://docs.ens.domains/resolvers/interfaces
