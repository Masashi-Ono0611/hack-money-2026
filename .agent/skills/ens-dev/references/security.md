# ENS Security Best Practices

Security considerations for building ENS-integrated applications.

## Critical Security Requirements

### 1. Name Normalization

**Always normalize names before processing**:

```typescript
import { normalize } from 'viem/ens';

// ✅ Correct
const address = await client.getEnsAddress({
  name: normalize(userInput)
});

// ❌ Wrong - vulnerable to homograph attacks
const address = await client.getEnsAddress({
  name: userInput
});
```

**Why**: Prevents homograph attacks where visually similar characters (е vs e) create fake names.

### 2. Display Both Name and Address

**In transaction UIs, always show both**:

```typescript
// ✅ Correct UI
<div>
  <div>Sending to: vitalik.eth</div>
  <div className="text-sm text-gray-500">
    Address: 0xd8dA...96045
  </div>
</div>

// ❌ Wrong - only showing name
<div>Sending to: vitalik.eth</div>
```

**Why**: User can verify the resolved address matches expectation.

### 3. Verify Reverse Records

**For high-value transactions, verify bidirectional resolution**:

```typescript
async function verifyENS(name: string, address: `0x${string}`): Promise<boolean> {
  // Forward: name → address
  const forwardAddr = await client.getEnsAddress({ name: normalize(name) });

  // Reverse: address → name
  const reverseName = await client.getEnsName({ address });

  // Both must match
  return (
    forwardAddr?.toLowerCase() === address.toLowerCase() &&
    reverseName?.toLowerCase() === normalize(name).toLowerCase()
  );
}
```

**Why**: Prevents attacks where attacker registers name pointing to their address but victim doesn't have reverse record set.

### 4. Resolver Trust

**Verify resolver is trusted before using data**:

```typescript
const TRUSTED_RESOLVERS = [
  '0xF29100983E058B709F3D539b0c765937B804AC15', // Public Resolver
  // Add your trusted resolvers
];

async function isTrustedResolver(name: string): Promise<boolean> {
  const registry = getContract({
    address: ENS_REGISTRY,
    abi: registryAbi,
    publicClient
  });

  const resolver = await registry.read.resolver([namehash(name)]);

  return TRUSTED_RESOLVERS.includes(resolver.toLowerCase());
}
```

**Why**: Malicious resolvers can return arbitrary data.

### 5. Expiry Validation

**Check name hasn't expired before critical operations**:

```typescript
import { getContract } from 'viem';

async function isNameExpired(name: string): Promise<boolean> {
  const baseRegistrar = getContract({
    address: BASE_REGISTRAR,
    abi: baseRegistrarAbi,
    publicClient
  });

  // Get name expiry
  const labelHash = keccak256(toBytes(name.split('.')[0]));
  const expiry = await baseRegistrar.read.nameExpires([BigInt(labelHash)]);

  // Check if expired (with 30 day warning buffer)
  const now = Math.floor(Date.now() / 1000);
  const warningPeriod = 30 * 24 * 60 * 60; // 30 days

  return Number(expiry) < (now + warningPeriod);
}
```

**Why**: Expired names can be re-registered by anyone.

### 6. Input Validation

**Validate ENS name format**:

```typescript
function isValidENSName(name: string): boolean {
  // Basic checks
  if (!name || !name.includes('.')) return false;

  // Must end with valid TLD
  const validTLDs = ['.eth', '.xyz', '.com', '.org', /* ... */];
  if (!validTLDs.some(tld => name.endsWith(tld))) return false;

  // Check for suspicious patterns
  if (/[\u200B-\u200D\uFEFF]/.test(name)) return false; // Zero-width chars

  // Try normalization
  try {
    normalize(name);
    return true;
  } catch {
    return false;
  }
}
```

### 7. Rate Limiting

**Implement rate limiting for resolution queries**:

```typescript
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'second'
});

async function rateLimitedResolve(name: string) {
  await limiter.removeTokens(1);
  return await client.getEnsAddress({ name: normalize(name) });
}
```

**Why**: Prevents DoS attacks and excessive RPC costs.

### 8. Private Key Security

**Never expose private keys in frontend**:

```typescript
// ✅ Correct - use wallet connection
import { useAccount, useWalletClient } from 'wagmi';

function Component() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Wallet signs, private key stays in user's wallet
  const setRecord = async () => {
    await walletClient.writeContract({...});
  };
}

// ❌ Wrong - private key in frontend
const privateKey = '0x...'; // NEVER DO THIS
```

## Common Vulnerabilities

### Homograph Attacks

**Attack**: Registering visually similar names using Unicode lookalikes.

**Example**:
- Real: `vitalik.eth`
- Fake: `vіtalik.eth` (Cyrillic 'і' instead of Latin 'i')

**Defense**:
```typescript
// Always normalize
const normalized = normalize(userInput);

// Show punycode representation for non-ASCII
if (/[^\x00-\x7F]/.test(normalized)) {
  console.log('Warning: Non-ASCII characters detected');
  console.log('Normalized:', normalized);
}
```

### Front-Running Registration

**Attack**: Watching mempool for registration transactions and front-running with higher gas.

**Defense**: Commit-reveal pattern (built into ENS registrar).

```typescript
// Step 1: Commit (hides name being registered)
await commit(commitment);

// Step 2: Wait 60+ seconds (required delay)
await sleep(60000);

// Step 3: Reveal and register
await register(name, secret);
```

### Resolver Spoofing

**Attack**: Malicious resolver returns wrong addresses.

**Defense**:
```typescript
// Whitelist trusted resolvers
const trustedResolvers = new Set([
  '0xF29100983E058B709F3D539b0c765937B804AC15'
]);

const resolver = await registry.read.resolver([node]);
if (!trustedResolvers.has(resolver)) {
  throw new Error('Untrusted resolver');
}
```

### Expired Name Confusion

**Attack**: User sends funds to expired name that was re-registered by attacker.

**Defense**:
```typescript
// Check expiry before showing name in UI
const expiry = await getExpiry(name);
if (expiry < Date.now() / 1000) {
  return null; // Don't show expired name
}
```

## CCIP Read Security

### Gateway Verification

**Always verify offchain data signatures**:

```solidity
function resolveWithProof(
    bytes calldata response,
    bytes calldata extraData
) external view returns (bytes memory) {
    // 1. Decode response
    (bytes memory data, bytes memory signature) = abi.decode(response, (bytes, bytes));

    // 2. Verify signature from trusted gateway
    bytes32 hash = keccak256(data);
    address signer = ECDSA.recover(hash, signature);

    require(signer == trustedGateway, "Invalid signature");

    // 3. Return verified data
    return data;
}
```

### Gateway Availability

**Implement fallback for gateway failures**:

```typescript
async function resolveWithFallback(name: string): Promise<string | null> {
  try {
    // Try CCIP Read
    return await client.getEnsAddress({ name: normalize(name) });
  } catch (error) {
    if (error.name === 'OffchainLookupError') {
      // CCIP Read failed, try onchain-only resolution
      return await resolveOnchainOnly(name);
    }
    throw error;
  }
}
```

## Smart Contract Integration

### Gas Limit Attacks

**Defense against unbounded loops**:

```solidity
// ❌ Vulnerable
function resolveMultiple(bytes32[] calldata nodes) external view returns (address[] memory) {
    address[] memory results = new address[](nodes.length);
    for (uint i = 0; i < nodes.length; i++) {
        results[i] = resolve(nodes[i]);
    }
    return results;
}

// ✅ Safe with limit
function resolveMultiple(bytes32[] calldata nodes) external view returns (address[] memory) {
    require(nodes.length <= 50, "Too many nodes");
    // ...
}
```

### Reentrancy Protection

**Use checks-effects-interactions pattern**:

```solidity
function setRecordAndTransfer(bytes32 node, address newAddr) external {
    // Checks
    require(msg.sender == owner, "Not owner");

    // Effects
    resolver.setAddr(node, newAddr);

    // Interactions (external calls last)
    (bool success, ) = newAddr.call{value: 1 ether}("");
    require(success);
}
```

## Audit Checklist

Before deploying ENS-integrated application:

- [ ] All user inputs are normalized
- [ ] Both name and address displayed in transaction UIs
- [ ] Reverse record verification for high-value operations
- [ ] Resolver trust validation
- [ ] Expiry checks implemented
- [ ] Rate limiting on resolution queries
- [ ] No private keys in frontend code
- [ ] CCIP Read signature verification
- [ ] Gas limits on batch operations
- [ ] Reentrancy protection in contracts
- [ ] Frontend input validation
- [ ] Error handling for resolution failures
- [ ] Testnet testing completed
- [ ] Security audit for custom resolvers

## Security Resources

- **ENS Security Best Practices**: https://docs.ens.domains/
- **EIP-3668 (CCIP Read)**: https://eips.ethereum.org/EIPS/eip-3668
- **Bug Bounty**: Immunefi (up to $250K for critical bugs)
- **Security Audits**: Required for custom resolvers handling funds

## Incident Response

If security issue discovered:

1. **Immediate**: Pause affected functionality
2. **Assess**: Determine scope and impact
3. **Notify**: Contact ENS team and affected users
4. **Fix**: Deploy patched version
5. **Audit**: Third-party security review
6. **Monitor**: Watch for similar attacks

## Contact

- **Security Issues**: Report to ENS Labs via Immunefi
- **Bug Bounty**: https://immunefi.com/bounty/ens/
