/**
 * ENS CCIP Read (ERC-3668) Example
 *
 * Demonstrates:
 * - Resolving L2 and offchain ENS names
 * - Custom CCIP Read resolver implementation
 * - Gateway interaction
 * - Signature verification
 * - Fallback handling
 */

import { createPublicClient, http, namehash, encodeFunctionData, decodeFunctionResult } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';

/**
 * CCIP Read (ERC-3668) allows ENS names to resolve data stored on L2 or offchain
 *
 * How it works:
 * 1. Client queries resolver
 * 2. Resolver reverts with OffchainLookup error containing gateway URLs
 * 3. Client fetches data from gateway
 * 4. Client calls resolver again with gateway response
 * 5. Resolver verifies and returns data
 */

/**
 * Test CCIP Read resolution
 */
async function testCCIPRead(): Promise<void> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  console.log('=== Testing CCIP Read Resolution ===\n');

  // Official test name that uses CCIP Read
  const testName = 'test.offchaindemo.eth';
  const expectedAddress = '0x779981590E7Ccc0CFAe8040Ce7151324747cDb97';

  console.log(`Resolving: ${testName}`);
  console.log('This uses CCIP Read to fetch data from offchain gateway...\n');

  try {
    const address = await client.getEnsAddress({
      name: normalize(testName)
    });

    console.log(`✅ Resolved: ${address}`);
    console.log(`Expected: ${expectedAddress}`);
    console.log(`Match: ${address?.toLowerCase() === expectedAddress.toLowerCase()}`);

    return;
  } catch (error: any) {
    console.error('❌ CCIP Read failed:', error.message);
  }
}

/**
 * Resolve with CCIP Read timeout handling
 */
async function resolveWithTimeout(
  name: string,
  timeoutMs: number = 10000
): Promise<string | null> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  console.log(`\nResolving ${name} with ${timeoutMs}ms timeout...`);

  const timeoutPromise = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error('CCIP Read timeout')), timeoutMs)
  );

  const resolvePromise = client.getEnsAddress({
    name: normalize(name)
  });

  try {
    const address = await Promise.race([resolvePromise, timeoutPromise]);
    console.log(`✅ Resolved: ${address}`);
    return address;
  } catch (error: any) {
    if (error.message.includes('timeout')) {
      console.log('⏱️  CCIP Read timed out');
      return null;
    }

    console.error('❌ Resolution failed:', error.message);
    return null;
  }
}

/**
 * CCIP Read Resolver Interface (for custom implementation)
 */
const CCIP_READ_RESOLVER_ABI = [
  {
    name: 'resolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'bytes' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes' }],
    // Can revert with OffchainLookup error
  },
  {
    name: 'resolveWithProof',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'response', type: 'bytes' },
      { name: 'extraData', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes' }]
  }
] as const;

/**
 * Example: Custom CCIP Read client
 */
class CCIPReadClient {
  private maxRedirects = 4;

  /**
   * Resolve name with CCIP Read support
   */
  async resolve(name: string, publicClient: any): Promise<string | null> {
    const node = namehash(normalize(name));

    try {
      // Try to get resolver
      const resolverAddress = await publicClient.readContract({
        address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Registry
        abi: [
          {
            name: 'resolver',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'node', type: 'bytes32' }],
            outputs: [{ name: '', type: 'address' }]
          }
        ],
        functionName: 'resolver',
        args: [node]
      });

      if (!resolverAddress || resolverAddress === '0x0000000000000000000000000000000000000000') {
        console.log('No resolver set');
        return null;
      }

      // Try to resolve address
      const address = await publicClient.readContract({
        address: resolverAddress,
        abi: [
          {
            name: 'addr',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'node', type: 'bytes32' }],
            outputs: [{ name: '', type: 'address' }]
          }
        ],
        functionName: 'addr',
        args: [node]
      });

      return address;
    } catch (error: any) {
      // Check if it's an OffchainLookup error (CCIP Read)
      if (error.message?.includes('OffchainLookup')) {
        console.log('⚡ CCIP Read triggered - fetching offchain data...');
        // In production, you would:
        // 1. Parse OffchainLookup error for gateway URLs
        // 2. Fetch data from gateway
        // 3. Call resolveWithProof with gateway response
        return null;
      }

      throw error;
    }
  }
}

/**
 * Example CCIP Read Resolver Contract (Solidity reference)
 */
const EXAMPLE_CCIP_RESOLVER_SOLIDITY = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOffchainResolver {
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );
}

contract MyCCIPReadResolver is IOffchainResolver {
    string[] public urls;
    address public signer;

    constructor(string[] memory _urls, address _signer) {
        urls = _urls;
        signer = _signer;
    }

    /**
     * Initial resolve call - reverts with OffchainLookup
     */
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        returns (bytes memory)
    {
        // Revert with gateway URLs
        revert OffchainLookup(
            address(this),
            urls,
            data,
            this.resolveWithProof.selector,
            abi.encode(name, data)
        );
    }

    /**
     * Second call with gateway response
     */
    function resolveWithProof(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        // Decode response from gateway
        (bytes memory result, bytes memory signature) = abi.decode(
            response,
            (bytes, bytes)
        );

        // Verify signature from trusted gateway
        bytes32 hash = keccak256(result);
        address recovered = recoverSigner(hash, signature);
        require(recovered == signer, "Invalid signature");

        // Return verified result
        return result;
    }

    function recoverSigner(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        // ECDSA signature recovery
        // Simplified - use OpenZeppelin ECDSA in production
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(hash, v, r, s);
    }
}
`;

/**
 * Test different CCIP Read scenarios
 */
async function testCCIPReadScenarios(): Promise<void> {
  console.log('\n=== CCIP Read Scenarios ===\n');

  // Scenario 1: Successful CCIP Read
  console.log('1. Testing official CCIP Read demo:');
  await testCCIPRead();

  // Scenario 2: Timeout handling
  console.log('\n2. Testing with timeout:');
  await resolveWithTimeout('test.offchaindemo.eth', 5000);

  // Scenario 3: Fallback to onchain
  console.log('\n3. Regular onchain resolution (for comparison):');
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  const normalAddress = await client.getEnsAddress({
    name: normalize('vitalik.eth')
  });
  console.log(`vitalik.eth (onchain): ${normalAddress}`);

  console.log('\n✅ CCIP Read scenarios complete!');
}

/**
 * Gateway URL patterns for CCIP Read
 */
const GATEWAY_PATTERNS = {
  // Standard HTTP gateway
  http: (domain: string) => `https://gateway.${domain}/lookup/{sender}/{data}.json`,

  // IPFS gateway
  ipfs: (cid: string) => `https://ipfs.io/ipfs/${cid}/{sender}/{data}.json`,

  // Custom API
  api: (endpoint: string) => `${endpoint}/ens-resolve?sender={sender}&data={data}`
};

/**
 * Example usage
 */
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ENS CCIP Read (ERC-3668) Example  ║');
  console.log('╚══════════════════════════════════════╝\n');

  await testCCIPReadScenarios();

  console.log('\n=== Custom CCIP Read Client ===');
  const client = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  const ccipClient = new CCIPReadClient();
  const address = await ccipClient.resolve('vitalik.eth', client);
  console.log(`Resolved vitalik.eth: ${address}`);

  console.log('\n=== Solidity Example ===');
  console.log('See below for example CCIP Read resolver contract:\n');
  console.log(EXAMPLE_CCIP_RESOLVER_SOLIDITY);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  testCCIPRead,
  resolveWithTimeout,
  CCIPReadClient,
  GATEWAY_PATTERNS
};
