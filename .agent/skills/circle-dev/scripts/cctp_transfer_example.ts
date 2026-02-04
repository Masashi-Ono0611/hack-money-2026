/**
 * CCTP (Cross-Chain Transfer Protocol) Complete Example
 *
 * Demonstrates native USDC cross-chain transfer using CCTP:
 * - Burn USDC on source chain
 * - Get attestation from Circle
 * - Mint USDC on destination chain
 *
 * Supports both Fast (15 sec) and Standard (20 min) modes
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const SOURCE_RPC = process.env.SOURCE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/your-key';
const DEST_RPC = process.env.DEST_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/your-key';
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable required');
}

// ============================================================================
// Contract Addresses (Testnet - Sepolia to Arbitrum Sepolia)
// ============================================================================

const TESTNET_ADDRESSES = {
  // Ethereum Sepolia
  'ETH-SEPOLIA': {
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD'
  },
  // Arbitrum Sepolia
  'ARB-SEPOLIA': {
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872'
  }
};

// Mainnet addresses (for reference)
const MAINNET_ADDRESSES = {
  'ETHEREUM': {
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    tokenMessenger: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    messageTransmitter: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81'
  },
  'ARBITRUM': {
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca'
  }
};

// Domain IDs for CCTP
const DOMAIN_IDS: Record<string, number> = {
  'ETHEREUM': 0,
  'AVALANCHE': 1,
  'OPTIMISM': 2,
  'ARBITRUM': 3,
  'BASE': 6,
  'POLYGON': 7
};

// ============================================================================
// ABIs (Minimal required functions)
// ============================================================================

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64)',
  'function depositForBurnWithCaller(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller) returns (uint64)'
];

const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes calldata message, bytes calldata attestation) returns (bool)',
  'event MessageReceived(address indexed caller, uint32 sourceDomain, uint64 indexed nonce, bytes32 sender, bytes messageBody)'
];

// ============================================================================
// Helper Functions
// ============================================================================

function addressToBytes32(address: string): string {
  return '0x' + '0'.repeat(24) + address.slice(2).toLowerCase();
}

function formatAmount(amount: string, decimals: number = 6): ethers.BigNumber {
  return ethers.utils.parseUnits(amount, decimals);
}

// ============================================================================
// 1. Burn USDC on Source Chain
// ============================================================================

async function burnUSDC(
  provider: ethers.providers.Provider,
  signer: ethers.Signer,
  addresses: any,
  destinationDomain: number,
  recipient: string,
  amount: string
) {
  console.log('\n=== Step 1: Burning USDC on Source Chain ===\n');

  const usdc = new ethers.Contract(addresses.usdc, ERC20_ABI, signer);
  const tokenMessenger = new ethers.Contract(
    addresses.tokenMessenger,
    TOKEN_MESSENGER_ABI,
    signer
  );

  const signerAddress = await signer.getAddress();
  const amountBN = formatAmount(amount);

  // Check balance
  const balance = await usdc.balanceOf(signerAddress);
  console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6), 'USDC');

  if (balance.lt(amountBN)) {
    throw new Error('Insufficient USDC balance');
  }

  // Check and approve if needed
  const allowance = await usdc.allowance(signerAddress, addresses.tokenMessenger);
  if (allowance.lt(amountBN)) {
    console.log('Approving USDC...');
    const approveTx = await usdc.approve(addresses.tokenMessenger, amountBN);
    await approveTx.wait();
    console.log('✅ USDC approved');
  }

  // Burn USDC
  console.log('\nBurning', amount, 'USDC...');
  console.log('  Destination Domain:', destinationDomain);
  console.log('  Recipient:', recipient);

  const burnTx = await tokenMessenger.depositForBurn(
    amountBN,
    destinationDomain,
    addressToBytes32(recipient),
    addresses.usdc
  );

  console.log('  Transaction submitted:', burnTx.hash);
  console.log('  Waiting for confirmation...');

  const receipt = await burnTx.wait();
  console.log('✅ Burn successful! Block:', receipt.blockNumber);

  // Extract message hash from event
  const eventTopic = ethers.utils.id('MessageSent(bytes)');
  const log = receipt.logs.find((l: any) => l.topics[0] === eventTopic);

  if (!log) {
    throw new Error('MessageSent event not found in logs');
  }

  const messageBytes = ethers.utils.defaultAbiCoder.decode(['bytes'], log.data)[0];
  const messageHash = ethers.utils.keccak256(messageBytes);

  console.log('  Message Hash:', messageHash);

  return {
    txHash: burnTx.hash,
    messageHash: messageHash,
    messageBytes: messageBytes
  };
}

// ============================================================================
// 2. Get Attestation from Circle
// ============================================================================

async function getAttestation(messageHash: string, useFastMode: boolean = true) {
  console.log('\n=== Step 2: Getting Attestation from Circle ===\n');

  const apiUrl = useFastMode
    ? 'https://iris-api-sandbox.circle.com'  // Testnet
    : 'https://iris-api.circle.com';         // Mainnet

  const endpoint = `${apiUrl}/v1/attestations/${messageHash}`;

  console.log('Polling Circle Attestation Service...');
  console.log('  Mode:', useFastMode ? 'Fast (~15 sec)' : 'Standard (~20 min)');
  console.log('  Message Hash:', messageHash);

  const maxAttempts = useFastMode ? 60 : 400; // 5 min or 33 min
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.status === 'complete' && data.attestation) {
        console.log('\n✅ Attestation received!');
        console.log('  Attempts:', attempts + 1);
        console.log('  Time elapsed:', Math.floor((attempts * 5) / 60), 'minutes');

        return {
          message: messageBytes,
          attestation: data.attestation
        };
      }

      if (data.status === 'pending_confirmations') {
        process.stdout.write('.');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

    } catch (error: any) {
      console.error('Error fetching attestation:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error('Attestation timeout - try again later');
}

// ============================================================================
// 3. Mint USDC on Destination Chain
// ============================================================================

async function mintUSDC(
  provider: ethers.providers.Provider,
  signer: ethers.Signer,
  addresses: any,
  message: string,
  attestation: string
) {
  console.log('\n=== Step 3: Minting USDC on Destination Chain ===\n');

  const messageTransmitter = new ethers.Contract(
    addresses.messageTransmitter,
    MESSAGE_TRANSMITTER_ABI,
    signer
  );

  const signerAddress = await signer.getAddress();
  const usdc = new ethers.Contract(addresses.usdc, ERC20_ABI, provider);

  // Check balance before
  const balanceBefore = await usdc.balanceOf(signerAddress);
  console.log('USDC Balance (before):', ethers.utils.formatUnits(balanceBefore, 6), 'USDC');

  // Submit message and attestation
  console.log('\nMinting USDC...');
  const mintTx = await messageTransmitter.receiveMessage(
    message,
    attestation
  );

  console.log('  Transaction submitted:', mintTx.hash);
  console.log('  Waiting for confirmation...');

  const receipt = await mintTx.wait();
  console.log('✅ Mint successful! Block:', receipt.blockNumber);

  // Check balance after
  const balanceAfter = await usdc.balanceOf(signerAddress);
  const received = balanceAfter.sub(balanceBefore);

  console.log('USDC Balance (after):', ethers.utils.formatUnits(balanceAfter, 6), 'USDC');
  console.log('USDC Received:', ethers.utils.formatUnits(received, 6), 'USDC');

  return {
    txHash: mintTx.hash,
    amountReceived: ethers.utils.formatUnits(received, 6)
  };
}

// ============================================================================
// Main Transfer Function
// ============================================================================

interface TransferParams {
  amount: string;
  recipient?: string; // Defaults to sender
  useFastMode?: boolean; // Default true
}

async function transferUSDCCrossChain(params: TransferParams) {
  console.log('🚀 CCTP Cross-Chain USDC Transfer\n');
  console.log('Source: Ethereum Sepolia');
  console.log('Destination: Arbitrum Sepolia');
  console.log('Amount:', params.amount, 'USDC');
  console.log('Mode:', params.useFastMode !== false ? 'Fast' : 'Standard');

  try {
    // Setup providers and signers
    const sourceProvider = new ethers.providers.JsonRpcProvider(SOURCE_RPC);
    const destProvider = new ethers.providers.JsonRpcProvider(DEST_RPC);

    const sourceSigner = new ethers.Wallet(PRIVATE_KEY, sourceProvider);
    const destSigner = new ethers.Wallet(PRIVATE_KEY, destProvider);

    const recipient = params.recipient || await sourceSigner.getAddress();

    // Step 1: Burn on source chain
    const burnResult = await burnUSDC(
      sourceProvider,
      sourceSigner,
      TESTNET_ADDRESSES['ETH-SEPOLIA'],
      DOMAIN_IDS['ARBITRUM'],
      recipient,
      params.amount
    );

    // Step 2: Get attestation
    let messageBytes: string;
    try {
      // Try to get message bytes from burn result
      messageBytes = burnResult.messageBytes;
    } catch {
      throw new Error('Failed to extract message bytes from burn transaction');
    }

    const attestationData = await getAttestation(
      burnResult.messageHash,
      params.useFastMode !== false
    );

    // Step 3: Mint on destination chain
    const mintResult = await mintUSDC(
      destProvider,
      destSigner,
      TESTNET_ADDRESSES['ARB-SEPOLIA'],
      messageBytes,
      attestationData.attestation
    );

    console.log('\n🎉 Transfer Complete!\n');
    console.log('Summary:');
    console.log('  Amount:', params.amount, 'USDC');
    console.log('  Source TX:', burnResult.txHash);
    console.log('  Dest TX:', mintResult.txHash);
    console.log('  Received:', mintResult.amountReceived, 'USDC');

    return {
      success: true,
      burnTxHash: burnResult.txHash,
      mintTxHash: mintResult.txHash,
      amount: params.amount,
      received: mintResult.amountReceived
    };

  } catch (error: any) {
    console.error('\n❌ Transfer failed:', error.message);
    throw error;
  }
}

// ============================================================================
// Usage Example
// ============================================================================

async function main() {
  // Example: Transfer 1 USDC from Sepolia to Arbitrum Sepolia
  await transferUSDCCrossChain({
    amount: '1.00',
    useFastMode: true
    // recipient: '0x...' // Optional, defaults to sender
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

// Export for use in other modules
export {
  transferUSDCCrossChain,
  burnUSDC,
  getAttestation,
  mintUSDC,
  TESTNET_ADDRESSES,
  MAINNET_ADDRESSES,
  DOMAIN_IDS
};
