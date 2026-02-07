import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArbitrageConfig, ChainConfig, LogLevel } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_DIR = resolve(__dirname, '../../contract');

function readJsonFile<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

interface DeployedAddresses {
  [chain: string]: {
    cpt?: string;
    oracle?: string;
    hook?: string;
    poolId?: string;
    vault?: string;
  };
}

interface UniswapAddresses {
  [chain: string]: string;
}

interface UsdcAddresses {
  [chain: string]: string;
}

// StateView addresses per chain (from Uniswap v4 periphery deployments)
const STATE_VIEW_ADDRESSES: Record<string, `0x${string}`> = {
  'base-sepolia': '0x571291B572ED32Ce6751A2cb2F1CFeeD1E09a81D',
  'unichain-sepolia': '0x75f7Ab88D2f27386c1e5C304eBBBA84D3BfF0adF',
  'sepolia': '0x75f7Ab88D2f27386c1e5C304eBBBA84D3BfF0adF',
};

function buildChainConfig(
  chainKey: string,
  chainId: number,
  rpcUrl: string,
  deployed: DeployedAddresses,
  uniswapAddresses: UniswapAddresses,
  usdcAddresses: UsdcAddresses,
): ChainConfig {
  const chainDeployed = deployed[chainKey];
  if (!chainDeployed) {
    throw new Error(`No deployed addresses found for chain: ${chainKey}`);
  }

  const poolManager = uniswapAddresses[chainKey];
  if (!poolManager) {
    throw new Error(`No PoolManager address found for chain: ${chainKey}`);
  }

  const usdc = usdcAddresses[chainKey];
  if (!usdc) {
    throw new Error(`No USDC address found for chain: ${chainKey}`);
  }

  const stateView = STATE_VIEW_ADDRESSES[chainKey];
  if (!stateView) {
    throw new Error(`No StateView address found for chain: ${chainKey}`);
  }

  return {
    name: chainKey,
    chainId,
    rpcUrl,
    cptAddress: (chainDeployed.cpt ?? '0x0') as `0x${string}`,
    usdcAddress: usdc as `0x${string}`,
    poolManagerAddress: poolManager as `0x${string}`,
    stateViewAddress: stateView,
    hookAddress: (chainDeployed.hook ?? '0x0') as `0x${string}`,
    oracleAddress: (chainDeployed.oracle ?? '0x0') as `0x${string}`,
    poolId: (chainDeployed.poolId ?? '0x0') as `0x${string}`,
    cptDecimals: 18,
    usdcDecimals: 6,
  };
}

export function loadConfig(): ArbitrageConfig {
  const deployed = readJsonFile<DeployedAddresses>(
    resolve(CONTRACT_DIR, 'deployed-addresses.json'),
  );
  const uniswapAddresses = readJsonFile<UniswapAddresses>(
    resolve(CONTRACT_DIR, 'uniswap-v4-addresses.json'),
  );
  const usdcAddresses = readJsonFile<UsdcAddresses>(
    resolve(CONTRACT_DIR, 'usdc-addresses.json'),
  );

  const chainARpcUrl = requireEnv('CHAIN_A_RPC_URL');
  const chainBRpcUrl = requireEnv('CHAIN_B_RPC_URL');

  const chainAKey = optionalEnv('CHAIN_A_NAME', 'base-sepolia');
  const chainBKey = optionalEnv('CHAIN_B_NAME', 'unichain-sepolia');

  const chainAId = Number(optionalEnv('CHAIN_A_ID', '84532'));
  const chainBId = Number(optionalEnv('CHAIN_B_ID', '1301'));

  const chainA = buildChainConfig(
    chainAKey, chainAId, chainARpcUrl,
    deployed, uniswapAddresses, usdcAddresses,
  );
  const chainB = buildChainConfig(
    chainBKey, chainBId, chainBRpcUrl,
    deployed, uniswapAddresses, usdcAddresses,
  );

  const config: ArbitrageConfig = {
    chainA,
    chainB,
    pollIntervalMs: Number(optionalEnv('POLL_INTERVAL_MS', '5000')),
    thresholdBps: Number(optionalEnv('THRESHOLD_BPS', '50')),
    maxTradeAmountUSDC: BigInt(optionalEnv('MAX_TRADE_AMOUNT_USDC', '100000000')),
    minProfitUSDC: BigInt(optionalEnv('MIN_PROFIT_USDC', '1000000')),
    useYellowMock: optionalEnv('USE_YELLOW_MOCK', 'true') === 'true',
    logLevel: optionalEnv('LOG_LEVEL', 'INFO') as LogLevel,
  };

  return config;
}
