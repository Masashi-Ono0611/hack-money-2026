import type { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { randomBytes } from "node:crypto";

type WalletChain = "ETH-SEPOLIA" | "BASE-SEPOLIA" | "AVAX-FUJI" | "ARC-TESTNET";
type Chain = "ethereum" | "base" | "avalanche" | "arc";

export type ChainConfig = {
  chainName: string;
  usdc: string;
  walletId: string;
  domain: number;
  walletChain: WalletChain;
};

// Get required wallet ID from env
function getRequiredWalletId(envKey: string) {
  const value = process.env[envKey];
  if (!value) {
    console.error(`Missing ${envKey} in .env`);
    process.exit(1);
  }
  return value;
}

// Parse chains from CLI arguments
export function parseSelectedChains() {
  const args = process.argv.slice(2).map((chain) => chain.toLowerCase());
  if (args.length === 0) return Object.keys(CHAIN_CONFIG) as Chain[];

  const selected: Chain[] = [];
  for (const arg of args) {
    if (!(arg in CHAIN_CONFIG)) {
      console.error(
        `Unsupported chain: ${arg}\n` +
          `Usage: npm run deposit -- [${Object.keys(CHAIN_CONFIG).join("] [")}]\n` +
          `Example: npm run deposit -- base avalanche`,
      );
      process.exit(1);
    }
    selected.push(arg as Chain);
  }
  return dedupe(selected);
}

// Dedupe chains from CLI arguments
function dedupe<T>(array: T[]) {
  const chains = new Set<T>();
  return array.filter((chain) =>
    chains.has(chain) ? false : (chains.add(chain), true),
  );
}

// Poll until transaction reaches terminal state
export async function waitForTxCompletion(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string,
) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  process.stdout.write(`Waiting for ${label} (txId=${txId})\n`);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    process.stdout.write(".");

    if (state && terminalStates.has(state)) {
      process.stdout.write("\n");
      console.log(`${label} final state: ${state}`);

      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(
          `${label} did not complete successfully (state=${state})`,
        );
      }
      return data.transaction;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

// Parse decimal to base units: "10.5" → 10500000n
export function parseBalance(usdcStr: string) {
  const [whole, decimal = ""] = String(usdcStr).split(".");
  const decimal6 = (decimal + "000000").slice(0, 6);
  return BigInt(whole + decimal6);
}

// チェーンのウォレットIDを環境変数から取得するユーティリティ関数
export const CHAIN_CONFIG: Record<Chain, ChainConfig> = {
  ethereum: {
    chainName: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    walletId: getRequiredWalletId("CROSSCHAIN_WALLET_ID4"),
    domain: 0,
    walletChain: "ETH-SEPOLIA",
  },
  base: {
    chainName: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    walletId: getRequiredWalletId("CROSSCHAIN_WALLET_ID3"),
    domain: 6,
    walletChain: "BASE-SEPOLIA",
  },
  avalanche: {
    chainName: "Avalanche Fuji",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    walletId: getRequiredWalletId("CROSSCHAIN_WALLET_ID2"),
    domain: 1,
    walletChain: "AVAX-FUJI",
  },
  arc: {
    chainName: "Arc Testnet",
    usdc: "0x3600000000000000000000000000000000000000",
    walletId: getRequiredWalletId("CROSSCHAIN_WALLET_ID1"),
    domain: 26,
    walletChain: "ARC-TESTNET",
  },
};

export const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";
export const GATEWAY_API = "https://gateway-api-testnet.circle.com/v1";
export const MAX_UINT256_DEC = ((1n << 256n) - 1n).toString();

/* Burn intent and EIP-712 definitions */
type BurnIntentSpec = {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  sourceContract: string;
  destinationContract: string;
  sourceToken: string;
  destinationToken: string;
  sourceDepositor: string;
  destinationRecipient: string;
  sourceSigner: string;
  destinationCaller: string;
  value: bigint;
  salt: string;
  hookData: string;
};

type BurnIntentType = {
  maxBlockHeight: string;
  maxFee: bigint;
  spec: BurnIntentSpec;
};

type EIP712DomainType = {
  name: string;
  version: string;
};

type TypedDataMessage = {
  maxBlockHeight: string;
  maxFee: bigint;
  spec: {
    version: number;
    sourceDomain: number;
    destinationDomain: number;
    sourceContract: string;
    destinationContract: string;
    sourceToken: string;
    destinationToken: string;
    sourceDepositor: string;
    destinationRecipient: string;
    sourceSigner: string;
    destinationCaller: string;
    value: bigint;
    salt: string;
    hookData: string;
  };
};

export type SignedBurnIntentRequest = {
  burnIntent: TypedDataMessage;
  signature: string | undefined;
};

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
];

const TransferSpec = [
  { name: "version", type: "uint32" },
  { name: "sourceDomain", type: "uint32" },
  { name: "destinationDomain", type: "uint32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "destinationContract", type: "bytes32" },
  { name: "sourceToken", type: "bytes32" },
  { name: "destinationToken", type: "bytes32" },
  { name: "sourceDepositor", type: "bytes32" },
  { name: "destinationRecipient", type: "bytes32" },
  { name: "sourceSigner", type: "bytes32" },
  { name: "destinationCaller", type: "bytes32" },
  { name: "value", type: "uint256" },
  { name: "salt", type: "bytes32" },
  { name: "hookData", type: "bytes" },
];

const BurnIntent = [
  { name: "maxBlockHeight", type: "uint256" },
  { name: "maxFee", type: "uint256" },
  { name: "spec", type: "TransferSpec" },
];

/**
 * Construct burn intent for a given source chainメソッド
 * @param sourceChain 
 * @returns 
 */
export function makeBurnIntent(
  sourceChain: Chain,
  destinationChain: WalletChain,
  depositorAddress: string,
  recipientAddress: string,
  transferAmountUsdc: number,
) {
  const src = CHAIN_CONFIG[sourceChain];
  const dst = getConfigByWalletChain(destinationChain);
  const value = parseBalance(String(transferAmountUsdc));
  return {
    maxBlockHeight: MAX_UINT256_DEC,
    maxFee: 2_010000n,
    spec: {
      version: 1,
      sourceDomain: src.domain,
      destinationDomain: dst.domain,
      sourceContract: GATEWAY_WALLET_ADDRESS,
      destinationContract: GATEWAY_MINTER_ADDRESS,
      sourceToken: src.usdc,
      destinationToken: dst.usdc,
      sourceDepositor: depositorAddress,
      destinationRecipient: recipientAddress,
      sourceSigner: depositorAddress,
      destinationCaller: addressToBytes32(
        "0x0000000000000000000000000000000000000000",
      ),
      value: value,
      salt: "0x" + randomBytes(32).toString("hex"),
      hookData: "0x",
    },
  };
}

// Format burn intent as EIP-712 typed data for signing
export function burnIntentTypedData(
  burnIntent: BurnIntentType,
  domain: EIP712DomainType,
) {
  return {
    types: { EIP712Domain, TransferSpec, BurnIntent },
    domain,
    primaryType: "BurnIntent",
    message: {
      ...burnIntent,
      spec: {
        ...burnIntent.spec,
        sourceContract: addressToBytes32(burnIntent.spec.sourceContract),
        destinationContract: addressToBytes32(
          burnIntent.spec.destinationContract,
        ),
        sourceToken: addressToBytes32(burnIntent.spec.sourceToken),
        destinationToken: addressToBytes32(burnIntent.spec.destinationToken),
        sourceDepositor: addressToBytes32(burnIntent.spec.sourceDepositor),
        destinationRecipient: addressToBytes32(
          burnIntent.spec.destinationRecipient,
        ),
        sourceSigner: addressToBytes32(burnIntent.spec.sourceSigner),
        destinationCaller: addressToBytes32(
          burnIntent.spec.destinationCaller ??
            addressToBytes32("0x0000000000000000000000000000000000000000"),
        ),
      },
    },
  };
}

// Look up chain configuration by wallet chain
export function getConfigByWalletChain(walletChain: WalletChain) {
  const entry = Object.values(CHAIN_CONFIG).find(
    (item) => item.walletChain === walletChain,
  );
  if (!entry) {
    throw new Error(`No config found for destination chain ${walletChain}`);
  }
  return entry;
}

/**
 * Pad address to 32 bytes
 * @param address 
 * @returns 
 */
function addressToBytes32(address: string) {
  return ("0x" +
    address
      .toLowerCase()
      .replace(/^0x/, "")
      .padStart(64, "0")) as `0x${string}`;
}

/**
 * Format base units to decimal: 10500000n → "10.5"
 * @param value 
 * @param decimals 
 * @returns 
 */
export function formatUnits(value: bigint, decimals: number) {
  let display = value.toString();

  const negative = display.startsWith("-");
  if (negative) display = display.slice(1);

  display = display.padStart(decimals, "0");

  const integer = display.slice(0, display.length - decimals);
  let fraction = display.slice(display.length - decimals);

  fraction = fraction.replace(/(0+)$/, "");
  return `${negative ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
}

/**
 * Serialize typed data (convert bigints to strings)
 * @param obj 
 * @returns 
 */
export function stringifyTypedData<T>(obj: T) {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

