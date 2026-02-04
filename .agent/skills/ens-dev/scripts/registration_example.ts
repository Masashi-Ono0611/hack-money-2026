/**
 * ENS .eth Domain Registration Example
 *
 * Demonstrates the commit-reveal registration process:
 * 1. Check availability
 * 2. Make commitment (anti-front-running)
 * 3. Wait minimum 60 seconds
 * 4. Register name with payment
 * 5. Configure resolver and records
 */

import { createPublicClient, createWalletClient, http, parseEther, namehash, keccak256, toBytes } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { normalize } from 'viem/ens';

// Contract addresses (Sepolia testnet for safe testing)
const ETH_REGISTRAR_CONTROLLER = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';
const PUBLIC_RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5';

// ABI fragments (minimal required functions)
const REGISTRAR_ABI = [
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'rentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' }
    ],
    outputs: [
      { name: 'base', type: 'uint256' },
      { name: 'premium', type: 'uint256' }
    ]
  },
  {
    name: 'makeCommitment',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: []
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' }
    ],
    outputs: []
  }
] as const;

/**
 * Registration Configuration
 */
interface RegistrationConfig {
  name: string;              // Name to register (without .eth)
  duration: bigint;          // Registration duration in seconds
  secret: `0x${string}`;     // Random secret for commitment
  reverseRecord?: boolean;   // Set reverse record
  ownerControlledFuses?: number; // Name Wrapper fuses
}

/**
 * Check if name is available for registration
 */
async function checkAvailability(
  publicClient: any,
  name: string
): Promise<boolean> {
  const available = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: REGISTRAR_ABI,
    functionName: 'available',
    args: [name]
  });

  console.log(`${name}.eth availability: ${available ? '✓ Available' : '✗ Not available'}`);
  return available;
}

/**
 * Get registration price
 */
async function getPrice(
  publicClient: any,
  name: string,
  duration: bigint
): Promise<{ base: bigint; premium: bigint; total: bigint }> {
  const price = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: REGISTRAR_ABI,
    functionName: 'rentPrice',
    args: [name, duration]
  });

  const total = price.base + price.premium;

  console.log(`Registration price for ${name}.eth:`);
  console.log(`  Base: ${price.base} wei`);
  console.log(`  Premium: ${price.premium} wei`);
  console.log(`  Total: ${total} wei (~${Number(total) / 1e18} ETH)`);

  return {
    base: price.base,
    premium: price.premium,
    total
  };
}

/**
 * Step 1: Make commitment (anti-front-running protection)
 */
async function makeCommitment(
  publicClient: any,
  walletClient: any,
  config: RegistrationConfig,
  ownerAddress: `0x${string}`
): Promise<`0x${string}`> {
  console.log('\n=== Step 1: Making Commitment ===');

  // Generate commitment hash
  const commitment = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: REGISTRAR_ABI,
    functionName: 'makeCommitment',
    args: [
      config.name,
      ownerAddress,
      config.duration,
      config.secret,
      PUBLIC_RESOLVER,
      [],
      config.reverseRecord ?? true,
      config.ownerControlledFuses ?? 0
    ]
  });

  console.log(`Commitment hash: ${commitment}`);

  // Submit commitment
  const hash = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: REGISTRAR_ABI,
    functionName: 'commit',
    args: [commitment]
  });

  console.log(`Commitment transaction: ${hash}`);

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('✓ Commitment confirmed');

  return hash;
}

/**
 * Step 2: Wait minimum 60 seconds (anti-front-running delay)
 */
async function waitForCommitmentAge(seconds: number = 60): Promise<void> {
  console.log(`\n=== Step 2: Waiting ${seconds} seconds ===`);
  console.log('This delay prevents front-running attacks');

  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\rWaiting: ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✓ Wait period completed');
}

/**
 * Step 3: Register name
 */
async function registerName(
  publicClient: any,
  walletClient: any,
  config: RegistrationConfig,
  ownerAddress: `0x${string}`
): Promise<`0x${string}`> {
  console.log('\n=== Step 3: Registering Name ===');

  // Get current price (include 10% buffer for price fluctuations)
  const price = await getPrice(publicClient, config.name, config.duration);
  const valueToSend = (price.total * 110n) / 100n;

  console.log(`Sending ${valueToSend} wei (10% buffer)`);

  // Register name
  const hash = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: REGISTRAR_ABI,
    functionName: 'register',
    args: [
      config.name,
      ownerAddress,
      config.duration,
      config.secret,
      PUBLIC_RESOLVER,
      [],
      config.reverseRecord ?? true,
      config.ownerControlledFuses ?? 0
    ],
    value: valueToSend
  });

  console.log(`Registration transaction: ${hash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('✓ Registration confirmed');

  return hash;
}

/**
 * Complete registration flow
 */
async function completeRegistration(
  config: RegistrationConfig,
  privateKey: `0x${string}`
): Promise<void> {
  // Initialize clients
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: sepolia, // Use Sepolia testnet for testing
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });

  console.log('=== ENS Registration Flow ===');
  console.log(`Name: ${config.name}.eth`);
  console.log(`Owner: ${account.address}`);
  console.log(`Duration: ${Number(config.duration) / (365 * 24 * 60 * 60)} years`);

  try {
    // Step 0: Check availability
    const available = await checkAvailability(publicClient, config.name);
    if (!available) {
      throw new Error('Name is not available');
    }

    // Step 1: Make commitment
    await makeCommitment(publicClient, walletClient, config, account.address);

    // Step 2: Wait minimum delay
    await waitForCommitmentAge(60);

    // Step 3: Register name
    await registerName(publicClient, walletClient, config, account.address);

    console.log('\n✅ Registration Complete!');
    console.log(`Your name ${config.name}.eth is now registered.`);
    console.log(`Visit https://ens.app to manage your name.`);
  } catch (error) {
    console.error('\n❌ Registration failed:', error);
    throw error;
  }
}

/**
 * Helper: Generate random secret
 */
function generateSecret(): `0x${string}` {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Example usage
 */
async function main() {
  // IMPORTANT: Use Sepolia testnet for testing
  // Get Sepolia ETH from faucet: https://sepoliafaucet.com/

  const config: RegistrationConfig = {
    name: 'mytestname123',  // Your desired name (without .eth)
    duration: BigInt(365 * 24 * 60 * 60), // 1 year in seconds
    secret: generateSecret(),
    reverseRecord: true,    // Set reverse record
    ownerControlledFuses: 0 // No fuses (can be set later)
  };

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }

  await completeRegistration(config, privateKey);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  checkAvailability,
  getPrice,
  makeCommitment,
  registerName,
  completeRegistration,
  generateSecret
};
