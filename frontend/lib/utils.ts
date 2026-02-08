import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EXPLORER_BASE: Record<string, string> = {
  "base-sepolia": "https://sepolia.basescan.org",
  "unichain-sepolia": "https://sepolia.uniscan.xyz",
  sepolia: "https://sepolia.etherscan.io",
  "arc-testnet": "https://testnet.arcscan.app",
};

export function explorerTxUrl(chain: string, txHash: string): string {
  const base = EXPLORER_BASE[chain] ?? EXPLORER_BASE["sepolia"];
  return `${base}/tx/${txHash}`;
}

export function explorerAddressUrl(chain: string, address: string): string {
  const base = EXPLORER_BASE[chain] ?? EXPLORER_BASE["sepolia"];
  return `${base}/address/${address}`;
}

export function truncateTxHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}
