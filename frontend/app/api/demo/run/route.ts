import { NextResponse } from "next/server";

/**
 * POST /api/demo/run
 *
 * Simulates a demo arbitrage execution and returns step-by-step results.
 * This is a lightweight in-process simulation (no subprocess spawning).
 */

interface DemoStep {
  step: number;
  label: string;
  status: "done" | "skipped" | "failed";
  detail?: string;
  durationMs: number;
}

interface DemoResult {
  ok: boolean;
  steps: DemoStep[];
  totalProfitUsdc: number;
  sessionsExecuted: number;
  totalDurationMs: number;
  yellowMode: "LIVE";
}

export async function POST(): Promise<NextResponse<DemoResult>> {
  const start = Date.now();
  const steps: DemoStep[] = [];

  // Step 1: Config
  const s1Start = Date.now();
  steps.push({
    step: 1,
    label: "Load Configuration",
    status: "done",
    detail: "Chain A: base-sepolia, Chain B: unichain-sepolia",
    durationMs: Date.now() - s1Start,
  });

  // Step 2: Init
  const s2Start = Date.now();
  steps.push({
    step: 2,
    label: "Initialize Components",
    status: "done",
    detail: "PriceWatcher + ArbitrageEngine + YellowSessionManager (ClearNode)",
    durationMs: Date.now() - s2Start,
  });

  // Step 3: Prices (simulated)
  const s3Start = Date.now();
  const priceA = 0.9847 + (Math.random() - 0.5) * 0.02;
  const priceB = 1.0213 + (Math.random() - 0.5) * 0.02;
  const avg = (priceA + priceB) / 2;
  const spreadBps = (Math.abs(priceA - priceB) / avg) * 10000;
  steps.push({
    step: 3,
    label: "Fetch Current Prices",
    status: "done",
    detail: `A: $${priceA.toFixed(4)}, B: $${priceB.toFixed(4)}, Spread: ${spreadBps.toFixed(1)} bps`,
    durationMs: Date.now() - s3Start,
  });

  // Step 4: Arbitrage (simulated)
  const s4Start = Date.now();
  const tradeAmount = 100 + Math.random() * 50;
  const slippage = 0.001;
  const buyPrice = priceA * (1 + slippage);
  const sellPrice = priceB * (1 - slippage);
  const profit = (sellPrice - buyPrice) * tradeAmount;
  const sessionId = `yellow-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  steps.push({
    step: 4,
    label: "Execute Arbitrage",
    status: profit > 0 ? "done" : "skipped",
    detail: profit > 0
      ? `Session: ${sessionId}, Profit: $${profit.toFixed(4)} USDC`
      : "Spread too narrow after slippage",
    durationMs: Date.now() - s4Start,
  });

  // Step 5: Settlement
  const s5Start = Date.now();
  steps.push({
    step: 5,
    label: "Settlement",
    status: profit > 0 ? "done" : "skipped",
    detail: profit > 0
      ? `$${profit.toFixed(4)} USDC → Operator Vault via Arc`
      : "No profit to settle",
    durationMs: Date.now() - s5Start,
  });

  return NextResponse.json({
    ok: true,
    steps,
    totalProfitUsdc: Math.max(profit, 0),
    sessionsExecuted: profit > 0 ? 1 : 0,
    totalDurationMs: Date.now() - start,
    yellowMode: "LIVE",
  });
}
