/**
 * ENS Basic Resolution Examples
 *
 * Demonstrates core ENS resolution patterns:
 * - Forward resolution (name → address)
 * - Reverse resolution (address → name)
 * - Avatar resolution
 * - Text record queries
 * - Multiple record batch queries
 */

import { createPublicClient, http, namehash } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// Initialize client
const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL)
});

/**
 * Forward Resolution: ENS name → Ethereum address
 */
async function resolveNameToAddress(name: string): Promise<string | null> {
  try {
    // IMPORTANT: Always normalize names before resolution
    const normalizedName = normalize(name);

    const address = await client.getEnsAddress({
      name: normalizedName
    });

    console.log(`${name} → ${address}`);
    return address;
  } catch (error) {
    console.error(`Failed to resolve ${name}:`, error);
    return null;
  }
}

/**
 * Reverse Resolution: Ethereum address → ENS name
 */
async function resolveAddressToName(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await client.getEnsName({ address });

    console.log(`${address} → ${name}`);
    return name;
  } catch (error) {
    console.error(`Failed to reverse resolve ${address}:`, error);
    return null;
  }
}

/**
 * Get ENS Avatar (supports NFTs, IPFS, HTTP)
 */
async function getAvatar(name: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name);

    const avatar = await client.getEnsAvatar({
      name: normalizedName
    });

    console.log(`${name} avatar: ${avatar}`);
    return avatar;
  } catch (error) {
    console.error(`Failed to get avatar for ${name}:`, error);
    return null;
  }
}

/**
 * Get Text Records (Twitter, GitHub, URL, etc.)
 */
async function getTextRecord(name: string, key: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name);

    const value = await client.getEnsText({
      name: normalizedName,
      key
    });

    console.log(`${name} ${key}: ${value}`);
    return value;
  } catch (error) {
    console.error(`Failed to get ${key} for ${name}:`, error);
    return null;
  }
}

/**
 * Batch Query Multiple Records
 */
async function getFullProfile(name: string) {
  const normalizedName = normalize(name);

  try {
    // Execute queries in parallel for efficiency
    const [address, avatar, twitter, github, url, email] = await Promise.all([
      client.getEnsAddress({ name: normalizedName }),
      client.getEnsAvatar({ name: normalizedName }),
      client.getEnsText({ name: normalizedName, key: 'com.twitter' }),
      client.getEnsText({ name: normalizedName, key: 'com.github' }),
      client.getEnsText({ name: normalizedName, key: 'url' }),
      client.getEnsText({ name: normalizedName, key: 'email' })
    ]);

    return {
      name: normalizedName,
      address,
      avatar,
      social: {
        twitter,
        github,
        url,
        email
      }
    };
  } catch (error) {
    console.error(`Failed to get profile for ${name}:`, error);
    return null;
  }
}

/**
 * Verify Reverse Record Matches Forward Resolution
 * SECURITY: Always verify in high-risk scenarios (payments, transfers)
 */
async function verifyENSOwnership(name: string, expectedAddress: `0x${string}`): Promise<boolean> {
  try {
    const normalizedName = normalize(name);

    // 1. Forward resolution: name → address
    const forwardAddress = await client.getEnsAddress({ name: normalizedName });

    // 2. Reverse resolution: address → name
    const reverseName = await client.getEnsName({ address: expectedAddress });

    // 3. Verify both match
    const isValid =
      forwardAddress?.toLowerCase() === expectedAddress.toLowerCase() &&
      reverseName?.toLowerCase() === normalizedName.toLowerCase();

    console.log(`Verification for ${name}:`);
    console.log(`  Forward: ${name} → ${forwardAddress}`);
    console.log(`  Reverse: ${expectedAddress} → ${reverseName}`);
    console.log(`  Valid: ${isValid}`);

    return isValid;
  } catch (error) {
    console.error(`Verification failed:`, error);
    return false;
  }
}

/**
 * Handle Name Resolution with Debouncing (for UI input fields)
 */
class ENSResolver {
  private timeout: NodeJS.Timeout | null = null;
  private readonly debounceMs = 300;

  async resolveWithDebounce(
    name: string,
    callback: (address: string | null) => void
  ): Promise<void> {
    // Clear previous timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Set new timeout
    this.timeout = setTimeout(async () => {
      const address = await resolveNameToAddress(name);
      callback(address);
    }, this.debounceMs);
  }
}

// Example usage
async function main() {
  console.log('=== ENS Resolution Examples ===\n');

  // Forward resolution
  await resolveNameToAddress('vitalik.eth');

  // Reverse resolution
  await resolveAddressToName('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');

  // Avatar
  await getAvatar('vitalik.eth');

  // Text records
  await getTextRecord('vitalik.eth', 'com.twitter');
  await getTextRecord('vitalik.eth', 'url');

  // Full profile
  console.log('\nFull profile:');
  const profile = await getFullProfile('vitalik.eth');
  console.log(JSON.stringify(profile, null, 2));

  // Verification
  console.log('\n=== Verification ===');
  await verifyENSOwnership('vitalik.eth', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
}

// Run examples if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  resolveNameToAddress,
  resolveAddressToName,
  getAvatar,
  getTextRecord,
  getFullProfile,
  verifyENSOwnership,
  ENSResolver
};
