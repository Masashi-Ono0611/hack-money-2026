import { BASE_SEPOLIA_FUNCTIONS_DEFAULTS, buildFunctionsRequestArgs } from '../config.js';

export interface BaseSepoliaDeployParams {
  rpcPrimary: string;
  rpcFallback: string;
  blockWindow?: number;
  subscriptionId: bigint;
}

export function buildBaseSepoliaFunctionsDeployConfig(params: BaseSepoliaDeployParams) {
  const blockWindow = params.blockWindow ?? 60;
  const args = buildFunctionsRequestArgs({
    chainId: BASE_SEPOLIA_FUNCTIONS_DEFAULTS.chainId,
    blockWindow,
    rpcPrimary: params.rpcPrimary,
    rpcFallback: params.rpcFallback,
  });

  return {
    chainId: BASE_SEPOLIA_FUNCTIONS_DEFAULTS.chainId,
    router: BASE_SEPOLIA_FUNCTIONS_DEFAULTS.router,
    donId: BASE_SEPOLIA_FUNCTIONS_DEFAULTS.donId,
    callbackGasLimit: BASE_SEPOLIA_FUNCTIONS_DEFAULTS.callbackGasLimit,
    subscriptionId: params.subscriptionId,
    args,
  };
}
