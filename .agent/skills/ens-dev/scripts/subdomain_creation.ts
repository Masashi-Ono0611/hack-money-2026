/**
 * ENS Subdomain Creation and Management
 *
 * Demonstrates:
 * - Creating subdomains under owned .eth name
 * - Setting resolver for subdomains
 * - Configuring address and text records
 * - Using Name Wrapper for permission management
 * - Batch subdomain creation
 */

import { createPublicClient, createWalletClient, http, namehash, keccak256, toBytes, getContract } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { normalize } from 'viem/ens';

// Contract addresses (Sepolia testnet)
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const PUBLIC_RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5';
const NAME_WRAPPER = '0x0635513f179D50A207757E05759CbD106d7dFcE8';

// ABI fragments
const REGISTRY_ABI = [
  {
    name: 'setSubnodeOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'setResolver',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'resolver', type: 'address' }
    ]
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

const RESOLVER_ABI = [
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
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ]
  }
] as const;

const NAME_WRAPPER_ABI = [
  {
    name: 'setSubnodeOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' }
    ],
    outputs: [{ name: 'node', type: 'bytes32' }]
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' }
    ]
  }
] as const;

/**
 * Subdomain configuration
 */
interface SubdomainConfig {
  label: string;           // Subdomain label (e.g., "api" for api.mydomain.eth)
  owner: `0x${string}`;    // Owner address
  targetAddress?: `0x${string}`; // Address to resolve to
  textRecords?: Record<string, string>; // Text records (url, description, etc.)
}

/**
 * Create a basic subdomain without Name Wrapper
 */
async function createBasicSubdomain(
  publicClient: any,
  walletClient: any,
  parentDomain: string,
  config: SubdomainConfig
): Promise<void> {
  console.log(`\n=== Creating Subdomain: ${config.label}.${parentDomain} ===`);

  const parentNode = namehash(parentDomain);
  const labelHash = keccak256(toBytes(config.label));
  const subdomainNode = namehash(`${config.label}.${parentDomain}`);

  // Step 1: Create subdomain in registry
  console.log('Step 1: Creating subdomain in registry...');
  const setSubnodeHash = await walletClient.writeContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'setSubnodeOwner',
    args: [parentNode, labelHash, config.owner]
  });

  await publicClient.waitForTransactionReceipt({ hash: setSubnodeHash });
  console.log('✓ Subdomain created');

  // Step 2: Set resolver
  console.log('Step 2: Setting resolver...');
  const setResolverHash = await walletClient.writeContract({
    address: ENS_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'setResolver',
    args: [subdomainNode, PUBLIC_RESOLVER]
  });

  await publicClient.waitForTransactionReceipt({ hash: setResolverHash });
  console.log('✓ Resolver set');

  // Step 3: Set address record (if provided)
  if (config.targetAddress) {
    console.log('Step 3: Setting address record...');
    const setAddrHash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [subdomainNode, config.targetAddress]
    });

    await publicClient.waitForTransactionReceipt({ hash: setAddrHash });
    console.log(`✓ Address set to ${config.targetAddress}`);
  }

  // Step 4: Set text records (if provided)
  if (config.textRecords) {
    console.log('Step 4: Setting text records...');
    for (const [key, value] of Object.entries(config.textRecords)) {
      const setTextHash = await walletClient.writeContract({
        address: PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [subdomainNode, key, value]
      });

      await publicClient.waitForTransactionReceipt({ hash: setTextHash });
      console.log(`✓ Set ${key}: ${value}`);
    }
  }

  console.log(`\n✅ Subdomain ${config.label}.${parentDomain} created successfully!`);
}

/**
 * Fuse constants for Name Wrapper
 */
const FUSES = {
  // Parent-controlled fuses
  PARENT_CANNOT_CONTROL: 1 << 16,    // Parent loses control (emancipation)
  CAN_EXTEND_EXPIRY: 1 << 18,        // Owner can extend expiry

  // Owner-controlled fuses
  CANNOT_UNWRAP: 1 << 0,             // Cannot unwrap name
  CANNOT_BURN_FUSES: 1 << 1,         // Cannot burn more fuses
  CANNOT_TRANSFER: 1 << 2,           // Cannot transfer name
  CANNOT_SET_RESOLVER: 1 << 3,       // Cannot change resolver
  CANNOT_SET_TTL: 1 << 4,            // Cannot change TTL
  CANNOT_CREATE_SUBDOMAIN: 1 << 5,   // Cannot create subdomains
  CANNOT_APPROVE: 1 << 6             // Cannot approve transfers
};

/**
 * Create subdomain with Name Wrapper (advanced permissions)
 */
async function createWrappedSubdomain(
  publicClient: any,
  walletClient: any,
  parentDomain: string,
  config: SubdomainConfig,
  fuses: number = 0,
  expiry?: number
): Promise<void> {
  console.log(`\n=== Creating Wrapped Subdomain: ${config.label}.${parentDomain} ===`);

  const parentNode = namehash(parentDomain);

  // Calculate expiry (default: 1 year from now)
  const expiryTimestamp = expiry || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

  console.log('Creating subdomain with Name Wrapper...');
  console.log(`Fuses: ${fuses.toString(2).padStart(32, '0')}`);
  console.log(`Expiry: ${new Date(expiryTimestamp * 1000).toISOString()}`);

  const createHash = await walletClient.writeContract({
    address: NAME_WRAPPER,
    abi: NAME_WRAPPER_ABI,
    functionName: 'setSubnodeRecord',
    args: [
      parentNode,
      config.label,
      config.owner,
      PUBLIC_RESOLVER,
      BigInt(0), // TTL
      fuses,
      BigInt(expiryTimestamp)
    ]
  });

  await publicClient.waitForTransactionReceipt({ hash: createHash });
  console.log('✓ Wrapped subdomain created');

  // Set records if needed
  const subdomainNode = namehash(`${config.label}.${parentDomain}`);

  if (config.targetAddress) {
    console.log('Setting address record...');
    const setAddrHash = await walletClient.writeContract({
      address: PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [subdomainNode, config.targetAddress]
    });

    await publicClient.waitForTransactionReceipt({ hash: setAddrHash });
    console.log(`✓ Address set to ${config.targetAddress}`);
  }

  console.log(`\n✅ Wrapped subdomain ${config.label}.${parentDomain} created!`);
}

/**
 * Batch create multiple subdomains
 */
async function batchCreateSubdomains(
  publicClient: any,
  walletClient: any,
  parentDomain: string,
  configs: SubdomainConfig[]
): Promise<void> {
  console.log(`\n=== Batch Creating ${configs.length} Subdomains ===`);

  for (const config of configs) {
    try {
      await createBasicSubdomain(publicClient, walletClient, parentDomain, config);
    } catch (error) {
      console.error(`Failed to create ${config.label}.${parentDomain}:`, error);
    }
  }

  console.log('\n✅ Batch subdomain creation complete!');
}

/**
 * Common subdomain patterns
 */
const SUBDOMAIN_PATTERNS = {
  // API endpoint
  api: (apiUrl: string, address: `0x${string}`): SubdomainConfig => ({
    label: 'api',
    owner: address,
    targetAddress: address,
    textRecords: {
      url: apiUrl,
      description: 'API endpoint'
    }
  }),

  // Website/docs
  www: (websiteUrl: string, address: `0x${string}`): SubdomainConfig => ({
    label: 'www',
    owner: address,
    targetAddress: address,
    textRecords: {
      url: websiteUrl,
      description: 'Website'
    }
  }),

  // Team member
  teamMember: (name: string, address: `0x${string}`, email?: string): SubdomainConfig => ({
    label: name.toLowerCase(),
    owner: address,
    targetAddress: address,
    textRecords: {
      description: `Team member: ${name}`,
      ...(email && { email })
    }
  }),

  // Service
  service: (serviceName: string, serviceUrl: string, address: `0x${string}`): SubdomainConfig => ({
    label: serviceName,
    owner: address,
    targetAddress: address,
    textRecords: {
      url: serviceUrl,
      description: `${serviceName} service`
    }
  })
};

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

  const parentDomain = 'mydomain.eth'; // Replace with your domain

  // Example 1: Create basic subdomain
  await createBasicSubdomain(publicClient, walletClient, parentDomain, {
    label: 'test',
    owner: account.address,
    targetAddress: account.address,
    textRecords: {
      description: 'Test subdomain',
      url: 'https://test.example.com'
    }
  });

  // Example 2: Create wrapped subdomain with permissions
  await createWrappedSubdomain(
    publicClient,
    walletClient,
    parentDomain,
    {
      label: 'locked',
      owner: account.address,
      targetAddress: account.address
    },
    FUSES.PARENT_CANNOT_CONTROL | FUSES.CANNOT_TRANSFER, // Emancipated and non-transferable
    Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year expiry
  );

  // Example 3: Batch create team subdomains
  const teamMembers = [
    SUBDOMAIN_PATTERNS.teamMember('alice', '0x1234...', 'alice@example.com'),
    SUBDOMAIN_PATTERNS.teamMember('bob', '0x5678...', 'bob@example.com'),
    SUBDOMAIN_PATTERNS.api('https://api.example.com', account.address)
  ];

  await batchCreateSubdomains(publicClient, walletClient, parentDomain, teamMembers);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  createBasicSubdomain,
  createWrappedSubdomain,
  batchCreateSubdomains,
  SUBDOMAIN_PATTERNS,
  FUSES
};
