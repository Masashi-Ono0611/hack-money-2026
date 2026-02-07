export interface FunctionsRequestArgInput {
  chainId: number;
  blockWindow: number;
  rpcPrimary: string;
  rpcFallback: string;
}

export const BASE_SEPOLIA_FUNCTIONS_DEFAULTS = {
  chainId: 84532,
  router: '0xf9B8fc078197181C841c296C876945aaa425B278',
  donId: 'fun-base-sepolia-1',
  callbackGasLimit: 300_000,
} as const;

export function buildFunctionsRequestArgs(input: FunctionsRequestArgInput): string[] {
  return [
    String(input.chainId),
    String(input.blockWindow),
    input.rpcPrimary,
    input.rpcFallback,
  ];
}
