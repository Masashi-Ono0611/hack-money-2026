// ---------------------------------------------------------------------------
// Settlement types shared across the settlement pipeline
// ---------------------------------------------------------------------------

export interface SessionResult {
  sessionId: string;
  chainA: string;
  chainB: string;
  netProfitUsdc: string;
  timestamp: number;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface SettlementRecord {
  sessionId: string;
  netProfitUsdc: string;
  settled: boolean;
  transactionId?: string;
  txHash?: string;
  vaultBalanceBefore?: string;
  vaultBalanceAfter?: string;
  error?: string;
  settledAt?: number;
}
