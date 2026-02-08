import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { defineChain } from "viem";

// Unichain Sepolia (not in viem defaults)
export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.unichain.org"] },
  },
  testnet: true,
});

// Deployed contract addresses (synced with contract/deployed-addresses.json)
export const DEPLOYED = {
  "base-sepolia": {
    cpt: "0x8845A9E68A7cac280a70aeE76d3b963FfF803aA9" as const,
    hook: "0x67AB6743B441aBDB346C9cb9C97949405c858080" as const,
    oracle: "0xF00fF91fDB4c8e7c3C352880A71B9Fa7bf1Bcb0B" as const,
    poolId: "0x11db39746a398dc60abd801cc5806cc528b3ae20ae74b6069abb648aefd53189" as const,
    poolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" as const,
    stateView: "0x571291b572ed32ce6751a2cb2486ebee8defb9b4" as const,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  },
  "unichain-sepolia": {
    cpt: "0x8845A9E68A7cac280a70aeE76d3b963FfF803aA9" as const,
    hook: "0x35E43234dB84b3a9B663fc052B4012825Bc00080" as const,
    oracle: "0xF00fF91fDB4c8e7c3C352880A71B9Fa7bf1Bcb0B" as const,
    poolId: "0xc4286263f5aab2e314f269691a15c454f3c8e1e6574f1966365e04fd202bb6d6" as const,
    poolManager: "0x00b036b58a818b1bc34d502d3fe730db729e62ac" as const,
    stateView: "0xc199f1072a74d4e905aba1a84d9a45e2546b6222" as const,
    usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F" as const,
  },
} as const;

export type ChainKey = keyof typeof DEPLOYED;

export const CHAIN_LABELS: Record<ChainKey, string> = {
  "base-sepolia": "Base Sepolia",
  "unichain-sepolia": "Unichain Sepolia",
};

// Public clients for each chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clients: Record<ChainKey, any> = {
  "base-sepolia": createPublicClient({ chain: baseSepolia, transport: http() }),
  "unichain-sepolia": createPublicClient({ chain: unichainSepolia, transport: http() }),
};
