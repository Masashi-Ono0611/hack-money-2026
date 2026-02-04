/**
 * ENS Profile Records Management
 *
 * Demonstrates:
 * - Setting avatar (NFT, IPFS, HTTP, data URI)
 * - Managing social profiles (Twitter, GitHub, Discord)
 * - Setting contact information (email, URL)
 * - Content hash for decentralized websites
 * - Multichain addresses (Bitcoin, Solana, etc.)
 * - Batch record updates
 */

import { createPublicClient, createWalletClient, http, namehash } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { normalize } from 'viem/ens';

// Contract addresses (Sepolia testnet)
const PUBLIC_RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5';

// Resolver ABI
const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ]
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'a', type: 'address' }
    ]
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
      { name: 'a', type: 'bytes' }
    ]
  },
  {
    name: 'setContenthash',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'hash', type: 'bytes' }
    ]
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;

/**
 * Standard text record keys
 */
const TEXT_RECORD_KEYS = {
  // Social profiles
  TWITTER: 'com.twitter',
  GITHUB: 'com.github',
  DISCORD: 'com.discord',
  TELEGRAM: 'org.telegram',
  REDDIT: 'com.reddit',

  // Contact
  EMAIL: 'email',
  URL: 'url',

  // Profile
  AVATAR: 'avatar',
  DESCRIPTION: 'description',
  KEYWORDS: 'keywords',
  NOTICE: 'notice',

  // Custom
  LOCATION: 'location',
  TIMEZONE: 'timezone'
} as const;

/**
 * SLIP-44 coin types for multichain addresses
 */
const COIN_TYPES = {
  BITCOIN: 0,
  LITECOIN: 2,
  DOGECOIN: 3,
  ETHEREUM: 60,
  COSMOS: 118,
  BINANCE: 714,
  SOLANA: 501,
  POLKADOT: 354
} as const;

/**
 * Profile configuration
 */
interface ProfileConfig {
  name: string;
  avatar?: AvatarConfig;
  social?: SocialConfig;
  contact?: ContactConfig;
  multichain?: MultichainConfig;
  custom?: Record<string, string>;
}

interface AvatarConfig {
  type: 'nft' | 'ipfs' | 'http' | 'data';
  value: string;
}

interface SocialConfig {
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
  reddit?: string;
}

interface ContactConfig {
  email?: string;
  url?: string;
  description?: string;
}

interface MultichainConfig {
  bitcoin?: string;
  solana?: string;
  cosmos?: string;
}

/**
 * Set avatar record
 */
async function setAvatar(
  walletClient: any,
  publicClient: any,
  name: string,
  avatarConfig: AvatarConfig
): Promise<void> {
  const node = namehash(normalize(name));
  let avatarValue: string;

  switch (avatarConfig.type) {
    case 'nft':
      // Format: eip155:1/erc721:0xcontract/tokenId
      // Example: eip155:1/erc721:0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6/2430
      avatarValue = avatarConfig.value;
      break;

    case 'ipfs':
      // Format: ipfs://Qm... or /ipfs/Qm...
      avatarValue = avatarConfig.value.startsWith('ipfs://')
        ? avatarConfig.value
        : `ipfs://${avatarConfig.value}`;
      break;

    case 'http':
      // Standard HTTP(S) URL
      avatarValue = avatarConfig.value;
      break;

    case 'data':
      // Data URI (e.g., data:image/svg+xml;base64,...)
      avatarValue = avatarConfig.value;
      break;
  }

  console.log(`Setting avatar for ${name}: ${avatarValue}`);

  const hash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: 'setText',
    args: [node, TEXT_RECORD_KEYS.AVATAR, avatarValue]
  });

  await publicClient.waitForTransactionReceipt({ hash });
  console.log('✓ Avatar set');
}

/**
 * Set social media records
 */
async function setSocialRecords(
  walletClient: any,
  publicClient: any,
  name: string,
  social: SocialConfig
): Promise<void> {
  const node = namehash(normalize(name));

  console.log(`\n=== Setting Social Records for ${name} ===`);

  const records = [
    { key: TEXT_RECORD_KEYS.TWITTER, value: social.twitter },
    { key: TEXT_RECORD_KEYS.GITHUB, value: social.github },
    { key: TEXT_RECORD_KEYS.DISCORD, value: social.discord },
    { key: TEXT_RECORD_KEYS.TELEGRAM, value: social.telegram },
    { key: TEXT_RECORD_KEYS.REDDIT, value: social.reddit }
  ];

  for (const record of records) {
    if (record.value) {
      console.log(`Setting ${record.key}: ${record.value}`);

      const hash = await walletClient.writeContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [node, record.key, record.value]
      });

      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✓ ${record.key} set`);
    }
  }

  console.log('✓ Social records updated');
}

/**
 * Set contact information
 */
async function setContactInfo(
  walletClient: any,
  publicClient: any,
  name: string,
  contact: ContactConfig
): Promise<void> {
  const node = namehash(normalize(name));

  console.log(`\n=== Setting Contact Info for ${name} ===`);

  const records = [
    { key: TEXT_RECORD_KEYS.EMAIL, value: contact.email },
    { key: TEXT_RECORD_KEYS.URL, value: contact.url },
    { key: TEXT_RECORD_KEYS.DESCRIPTION, value: contact.description }
  ];

  for (const record of records) {
    if (record.value) {
      console.log(`Setting ${record.key}: ${record.value}`);

      const hash = await walletClient.writeContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [node, record.key, record.value]
      });

      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✓ ${record.key} set`);
    }
  }

  console.log('✓ Contact info updated');
}

/**
 * Set multichain addresses
 */
async function setMultichainAddresses(
  walletClient: any,
  publicClient: any,
  name: string,
  multichain: MultichainConfig
): Promise<void> {
  const node = namehash(normalize(name));

  console.log(`\n=== Setting Multichain Addresses for ${name} ===`);

  // Bitcoin address
  if (multichain.bitcoin) {
    console.log(`Setting Bitcoin address: ${multichain.bitcoin}`);
    // Note: Bitcoin addresses need to be encoded as bytes
    // This is a simplified example - use proper address encoding library
    const btcBytes = `0x${Buffer.from(multichain.bitcoin).toString('hex')}`;

    const hash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, COIN_TYPES.BITCOIN, btcBytes as `0x${string}`]
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log('✓ Bitcoin address set');
  }

  // Solana address
  if (multichain.solana) {
    console.log(`Setting Solana address: ${multichain.solana}`);
    const solBytes = `0x${Buffer.from(multichain.solana).toString('hex')}`;

    const hash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, COIN_TYPES.SOLANA, solBytes as `0x${string}`]
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log('✓ Solana address set');
  }

  // Cosmos address
  if (multichain.cosmos) {
    console.log(`Setting Cosmos address: ${multichain.cosmos}`);
    const cosmosBytes = `0x${Buffer.from(multichain.cosmos).toString('hex')}`;

    const hash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, COIN_TYPES.COSMOS, cosmosBytes as `0x${string}`]
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log('✓ Cosmos address set');
  }

  console.log('✓ Multichain addresses updated');
}

/**
 * Set complete profile (batch update)
 */
async function setCompleteProfile(
  walletClient: any,
  publicClient: any,
  profile: ProfileConfig
): Promise<void> {
  console.log(`\n=== Setting Complete Profile for ${profile.name} ===`);

  // Set avatar
  if (profile.avatar) {
    await setAvatar(walletClient, publicClient, profile.name, profile.avatar);
  }

  // Set social records
  if (profile.social) {
    await setSocialRecords(walletClient, publicClient, profile.name, profile.social);
  }

  // Set contact info
  if (profile.contact) {
    await setContactInfo(walletClient, publicClient, profile.name, profile.contact);
  }

  // Set multichain addresses
  if (profile.multichain) {
    await setMultichainAddresses(walletClient, publicClient, profile.name, profile.multichain);
  }

  // Set custom records
  if (profile.custom) {
    const node = namehash(normalize(profile.name));

    console.log('\n=== Setting Custom Records ===');
    for (const [key, value] of Object.entries(profile.custom)) {
      console.log(`Setting ${key}: ${value}`);

      const hash = await walletClient.writeContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [node, key, value]
      });

      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✓ ${key} set`);
    }
  }

  console.log(`\n✅ Complete profile set for ${profile.name}!`);
}

/**
 * Read and display profile
 */
async function readProfile(
  publicClient: any,
  name: string
): Promise<void> {
  const node = namehash(normalize(name));

  console.log(`\n=== Profile for ${name} ===\n`);

  // Read standard text records
  const keys = Object.values(TEXT_RECORD_KEYS);

  for (const key of keys) {
    try {
      const value = await publicClient.readContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'text',
        args: [node, key]
      });

      if (value) {
        console.log(`${key}: ${value}`);
      }
    } catch (error) {
      // Record not set, skip
    }
  }
}

/**
 * Example usage
 */
async function main() {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });

  // Example: Set complete profile
  const profile: ProfileConfig = {
    name: 'myname.eth',
    avatar: {
      type: 'nft',
      value: 'eip155:1/erc721:0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6/2430'
    },
    social: {
      twitter: 'myhandle',
      github: 'myusername',
      discord: 'myuser#1234'
    },
    contact: {
      email: 'me@example.com',
      url: 'https://mywebsite.com',
      description: 'Web3 developer and ENS enthusiast'
    },
    multichain: {
      bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      solana: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'
    },
    custom: {
      location: 'San Francisco, CA',
      timezone: 'America/Los_Angeles'
    }
  };

  await setCompleteProfile(walletClient, publicClient, profile);

  // Read back the profile
  await readProfile(publicClient, 'myname.eth');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  setAvatar,
  setSocialRecords,
  setContactInfo,
  setMultichainAddresses,
  setCompleteProfile,
  readProfile,
  TEXT_RECORD_KEYS,
  COIN_TYPES
};
