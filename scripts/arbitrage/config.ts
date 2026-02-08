import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArbitrageConfig, ChainConfig, LogLevel } from './types.js';
import { BASE_SEPOLIA_FUNCTIONS_DEFAULTS } from './functions/config.js';

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

function optionalEnvFrom(name: string, defaultValue: string, env: NodeJS.ProcessEnv): string {
  return env[name] ?? defaultValue;
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

export interface ChainOracleConfig {
  chainId: number;
  chainName: string;
  oracleAddress: `0x${string}`;
  primaryRpc: string;
  fallbackRpc: string;
  emaWindow: number;
  botUpdateInterval: number;
  functionsEnabled: boolean;
  functionsVerifyInterval: number;
  divergenceThreshold: number;
  staleTtl: number;
}

export interface ChainlinkConfig {
  routerAddress: `0x${string}`;
  subscriptionId: bigint;
  donId: string;
  callbackGasLimit: number;
}

export interface OracleConfig {
  chains: Record<string, ChainOracleConfig>;
  chainlink: Record<string, ChainlinkConfig>;
  deployerPrivateKey: string;
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
    logLevel: optionalEnv('LOG_LEVEL', 'INFO') as LogLevel,
  };

  return config;
}

function getOracleAddress(
  deployed: DeployedAddresses,
  chainName: string,
): `0x${string}` {
  const oracle = deployed[chainName]?.oracle;
  if (!oracle) {
    throw new Error(`No oracle address found for chain: ${chainName}`);
  }
  return oracle as `0x${string}`;
}

export function loadOracleConfig(env: NodeJS.ProcessEnv = process.env): OracleConfig {
  const deployed = readJsonFile<DeployedAddresses>(
    resolve(CONTRACT_DIR, 'deployed-addresses.json'),
  );

  const baseChainName = optionalEnvFrom('ORACLE_BASE_CHAIN_NAME', 'base-sepolia', env);
  const unichainName = optionalEnvFrom('ORACLE_UNICHAIN_CHAIN_NAME', 'unichain-sepolia', env);

  const baseRpcPrimary = optionalEnvFrom('ORACLE_BASE_PRIMARY_RPC', '', env);
  const baseRpcFallback = optionalEnvFrom('ORACLE_BASE_FALLBACK_RPC', baseRpcPrimary, env);
  const unichainRpcPrimary = optionalEnvFrom('ORACLE_UNICHAIN_PRIMARY_RPC', '', env);
  const unichainRpcFallback = optionalEnvFrom('ORACLE_UNICHAIN_FALLBACK_RPC', unichainRpcPrimary, env);

  if (!baseRpcPrimary) {
    throw new Error('Missing ORACLE_BASE_PRIMARY_RPC');
  }
  if (!unichainRpcPrimary) {
    throw new Error('Missing ORACLE_UNICHAIN_PRIMARY_RPC');
  }

  const baseEmaWindow = Number(optionalEnvFrom('ORACLE_BASE_EMA_WINDOW', '60', env));
  const unichainEmaWindow = Number(optionalEnvFrom('ORACLE_UNICHAIN_EMA_WINDOW', '60', env));
  const botInterval = Number(optionalEnvFrom('ORACLE_BOT_INTERVAL_MS', '60000', env));
  const verifyInterval = Number(optionalEnvFrom('ORACLE_FUNCTIONS_VERIFY_INTERVAL_MS', '900000', env));
  const divergenceThreshold = Number(optionalEnvFrom('ORACLE_DIVERGENCE_THRESHOLD', '15', env));
  const staleTtl = Number(optionalEnvFrom('ORACLE_STALE_TTL_SECONDS', '1200', env));

  const config: OracleConfig = {
    chains: {
      [baseChainName]: {
        chainId: Number(optionalEnvFrom('ORACLE_BASE_CHAIN_ID', '84532', env)),
        chainName: baseChainName,
        oracleAddress: getOracleAddress(deployed, baseChainName),
        primaryRpc: baseRpcPrimary,
        fallbackRpc: baseRpcFallback,
        emaWindow: baseEmaWindow,
        botUpdateInterval: botInterval,
        functionsEnabled: optionalEnvFrom('ORACLE_BASE_FUNCTIONS_ENABLED', 'true', env) === 'true',
        functionsVerifyInterval: verifyInterval,
        divergenceThreshold,
        staleTtl,
      },
      [unichainName]: {
        chainId: Number(optionalEnvFrom('ORACLE_UNICHAIN_CHAIN_ID', '1301', env)),
        chainName: unichainName,
        oracleAddress: getOracleAddress(deployed, unichainName),
        primaryRpc: unichainRpcPrimary,
        fallbackRpc: unichainRpcFallback,
        emaWindow: unichainEmaWindow,
        botUpdateInterval: botInterval,
        // Unichain Sepolia is fixed to disabled for Functions in this phase.
        functionsEnabled: false,
        functionsVerifyInterval: verifyInterval,
        divergenceThreshold,
        staleTtl,
      },
    },
    chainlink: {
      [baseChainName]: {
        routerAddress: optionalEnvFrom(
          'ORACLE_BASE_FUNCTIONS_ROUTER',
          BASE_SEPOLIA_FUNCTIONS_DEFAULTS.router,
          env,
        ) as `0x${string}`,
        subscriptionId: BigInt(optionalEnvFrom('ORACLE_BASE_FUNCTIONS_SUBSCRIPTION_ID', '0', env)),
        donId: optionalEnvFrom('ORACLE_BASE_FUNCTIONS_DON_ID', BASE_SEPOLIA_FUNCTIONS_DEFAULTS.donId, env),
        callbackGasLimit: Number(optionalEnvFrom('ORACLE_BASE_FUNCTIONS_CALLBACK_GAS_LIMIT', '300000', env)),
      },
    },
    deployerPrivateKey: optionalEnvFrom('DEPLOYER_PRIVATE_KEY', '', env),
  };

  return config;
}
