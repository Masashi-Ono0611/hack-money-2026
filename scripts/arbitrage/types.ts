// Shared type definitions and interfaces for Offchain Arbitrage Engine

// ─── Log Types ───

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ILogger {
  debug(component: string, message: string, context?: Record<string, unknown>): void;
  info(component: string, message: string, context?: Record<string, unknown>): void;
  warn(component: string, message: string, context?: Record<string, unknown>): void;
  error(component: string, message: string, context?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
}

// ─── Retry Types ───

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ─── Chain & Config Types ───

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  cptAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  poolManagerAddress: `0x${string}`;
  stateViewAddress: `0x${string}`;
  hookAddress: `0x${string}`;
  oracleAddress: `0x${string}`;
  poolId: `0x${string}`;
  cptDecimals: number;
  usdcDecimals: number;
}

export interface ArbitrageConfig {
  chainA: ChainConfig;
  chainB: ChainConfig;
  pollIntervalMs: number;
  thresholdBps: number;
  maxTradeAmountUSDC: bigint;
  minProfitUSDC: bigint;
  logLevel: LogLevel;
}

// ─── Price Domain Types ───

export interface ChainPrice {
  sqrtPriceX96: bigint;
  tick: number;
  priceUsdcPerCpt: number;
  timestamp: number;
}

export interface PriceSnapshot {
  chainA: ChainPrice;
  chainB: ChainPrice;
  spreadBps: number;
}

export interface PriceDiscrepancy {
  snapshot: PriceSnapshot;
  direction: 'A_CHEAPER' | 'B_CHEAPER';
  timestamp: number;
}

export type DiscrepancyCallback = (discrepancy: PriceDiscrepancy) => void;

export interface IPriceWatcher {
  start(): void;
  stop(): void;
  onDiscrepancy(callback: DiscrepancyCallback): void;
  getLatestSnapshot(): PriceSnapshot | null;
}

// ─── Strategy Domain Types ───

export type TradeDirection = 'BUY_A_SELL_B' | 'BUY_B_SELL_A';

export interface ArbitrageStrategy {
  direction: TradeDirection;
  buyChain: 'A' | 'B';
  sellChain: 'A' | 'B';
  amountCpt: bigint;
  expectedProfitUsdc: bigint;
  spreadBps: number;
  timestamp: number;
}

export interface ArbitrageResult {
  success: boolean;
  strategy: ArbitrageStrategy;
  sessionId: string;
  actualProfitUsdc: bigint;
  ordersExecuted: number;
  error?: string;
}

export interface RiskConfig {
  maxTradeAmountUsdc: bigint;
  minProfitUsdc: bigint;
  maxConcurrentSessions: number;
  cooldownMs: number;
}

export interface IArbitrageEngine {
  handleDiscrepancy(discrepancy: PriceDiscrepancy): Promise<ArbitrageResult | null>;
  getActiveSessionCount(): number;
}

// ─── Execution Domain Types ───

export interface SessionInfo {
  sessionId: string;
  createdAt: number;
  status: 'ACTIVE' | 'CLOSED' | 'ERROR';
}

export interface TradeOrder {
  type: 'BUY' | 'SELL';
  token: 'CPT_A' | 'CPT_B';
  amountCpt: bigint;
  priceUsdc: number;
}

export interface TradeResult {
  orderId: string;
  executedAmountCpt: bigint;
  executedPriceUsdc: number;
  timestamp: number;
}

export interface SessionResult {
  sessionId: string;
  orders: TradeResult[];
  netProfitUsdc: bigint;
  duration: number;
}

export interface IYellowSession {
  createSession(strategy: ArbitrageStrategy): Promise<SessionInfo>;
  placeOrder(sessionId: string, order: TradeOrder): Promise<TradeResult>;
  closeSession(sessionId: string): Promise<SessionResult>;
}

export interface IYellowSessionManager {
  executeArbitrage(strategy: ArbitrageStrategy): Promise<SessionResult>;
}
