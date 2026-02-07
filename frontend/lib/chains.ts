import { createPublicClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
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

// Deployed contract addresses
export const DEPLOYED = {
  sepolia: {
    cpt: "0x7BED4A835afd83BEf0F959780eDAE8Da4c22Bd11" as const,
    hook: "0x50Df7B29fAA6C61BeC5288BF763bA4196DbE0080" as const,
    oracle: "0xa1BbAFF1cC20A12eBB1B50D515373ABAa6a476DA" as const,
    poolId: "0x86809c5e48e6ae0650da53da398de7e7af09f7bdec35e50de88d895b3462f5b3" as const,
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543" as const,
    stateView: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c" as const,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const,
  },
  "base-sepolia": {
    cpt: "0x68eBAd847A016bB830B3607e0eEeA516A09EA5e6" as const,
    hook: "0x038f554A1b854F68b3BB46125ea1947ffbf94080" as const,
    oracle: "0xe6230b8D99491dAd48e1de70156b4fd8b7b66b6f" as const,
    poolId: "0x9c725b90d40af5c223a697bb4a489afe5ba1dd48ad0f95ee83344e3ea9505c26" as const,
    poolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" as const,
    stateView: "0x571291b572ed32ce6751a2cb2486ebee8defb9b4" as const,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const,
  },
  "unichain-sepolia": {
    cpt: "0x67ADc29278d87D87b212C59fDffd2749fe7418c4" as const,
    hook: "0x079eC9842F78E5431F11AdD4a53d442192978080" as const,
    oracle: "0x9eCE03F901dFC53544E4abf610b6813c6305f262" as const,
    poolId: "0x380b282aa0aee86e8a7ad653de14ff9eb087dcecde018f5d172ff192ed588082" as const,
    poolManager: "0x00b036b58a818b1bc34d502d3fe730db729e62ac" as const,
    stateView: "0xc199f1072a74d4e905aba1a84d9a45e2546b6222" as const,
    usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F" as const,
  },
} as const;

export type ChainKey = keyof typeof DEPLOYED;

export const CHAIN_LABELS: Record<ChainKey, string> = {
  sepolia: "Sepolia",
  "base-sepolia": "Base Sepolia",
  "unichain-sepolia": "Unichain Sepolia",
};

// Public clients for each chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clients: Record<ChainKey, any> = {
  sepolia: createPublicClient({ chain: sepolia, transport: http() }),
  "base-sepolia": createPublicClient({ chain: baseSepolia, transport: http() }),
  "unichain-sepolia": createPublicClient({ chain: unichainSepolia, transport: http() }),
};
