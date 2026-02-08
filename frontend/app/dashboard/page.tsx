"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw, Play, Square } from "lucide-react";
import { MetricsRow } from "./_components/metrics-row";
import { PriceSpreadChart } from "./_components/price-spread-chart";
import { SessionLog } from "./_components/session-log";
import type { LogEntry } from "./_components/session-log";
import type { ChainPrice, PriceDataPoint } from "./_types";

function now(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DashboardPage() {
  const [chainData, setChainData] = useState<ChainPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<LogEntry[]>([]);
  const [thresholdBps, setThresholdBps] = useState(10);
  const [tradeAmountUsdc, setTradeAmountUsdc] = useState(1000);
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCounter = useRef(0);

  const addLog = useCallback(
    (type: LogEntry["type"], message: string, detail?: string) => {
      logCounter.current += 1;
      setSessionLogs((prev) => [
        ...prev,
        { id: String(logCounter.current), timestamp: now(), type, message, detail },
      ]);
    },
    [],
  );

  const fetchChainData = useCallback(async () => {
    try {
      const res = await fetch("/api/settlement/chain-data");
      const data = await res.json();
      if (data.ok) {
        setChainData(data.chains);
        const priceA = data.chains[0]?.price ?? null;
        const priceB = data.chains[1]?.price ?? null;
        const avg = priceA && priceB ? (priceA + priceB) / 2 : 0;
        const spreadBps =
          priceA && priceB && avg > 0
            ? (Math.abs(priceA - priceB) / avg) * 10000
            : 0;
        setPriceHistory((prev) => [
          ...prev.slice(-59),
          { timestamp: data.timestamp, priceA, priceB, spreadBps },
        ]);
      }
    } catch {
      // silent retry on next interval
    }
  }, []);

  const fetchVaultBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/settlement/vault-balance");
      const data = await res.json();
      if (data.ok && data.balance) setVaultBalance(data.balance);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // Safe: fetch once on mount then interval; state updates are expected
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChainData();
    fetchVaultBalance();
    intervalRef.current = setInterval(fetchChainData, 5_000);
    const vaultInterval = setInterval(fetchVaultBalance, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(vaultInterval);
    };
  }, [fetchChainData, fetchVaultBalance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchChainData(), fetchVaultBalance()]);
    setIsRefreshing(false);
  };

  const currentSpreadBps = (() => {
    const priceA = chainData[0]?.price ?? null;
    const priceB = chainData[1]?.price ?? null;
    if (!priceA || !priceB) return 0;
    const avg = (priceA + priceB) / 2;
    return avg > 0 ? (Math.abs(priceA - priceB) / avg) * 10000 : 0;
  })();

  const hasOpportunity = currentSpreadBps >= thresholdBps;

  const handleExecuteArbitrage = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setSessionLogs([]);

    addLog("INFO", `Executing arbitrage (spread: ${currentSpreadBps.toFixed(1)} bps, threshold: ${thresholdBps} bps, amount: ${tradeAmountUsdc} USDC)...`);
    addLog("INFO", "Connecting to on-chain pools + Yellow ClearNode + Arc...");

    try {
      const res = await fetch("/api/arbitrage/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeAmountUsdc }),
      });
      const data = await res.json();

      if (!data.ok) {
        addLog("INFO", `Pipeline failed: ${data.error ?? "unknown"}`);
        setIsExecuting(false);
        return;
      }

      // Step-by-step display
      for (const step of data.steps ?? []) {
        await new Promise((r) => setTimeout(r, 300));
        const icon = step.status === "done" ? "✅" : step.status === "skipped" ? "⏭️" : "❌";
        addLog("STEP", `${icon} Step ${step.step}: ${step.label}`, step.detail);
      }

      // Price info
      if (data.priceA && data.priceB) {
        await new Promise((r) => setTimeout(r, 200));
        addLog("INFO", `Prices: A=$${data.priceA.toFixed(6)}, B=$${data.priceB.toFixed(6)}`);
      }
      if (data.spreadBps) {
        addLog("INFO", `Spread: ${data.spreadBps.toFixed(2)} bps (${data.direction})`);
      }

      // Session & trade details
      if (data.sessionId) {
        await new Promise((r) => setTimeout(r, 200));
        addLog("SESSION", "Yellow session created", data.sessionId);
        await new Promise((r) => setTimeout(r, 200));
        addLog("BUY", "BUY CPT on cheaper chain", "via Yellow ClearNode");
        await new Promise((r) => setTimeout(r, 200));
        addLog("SELL", "SELL CPT on expensive chain", "via Yellow ClearNode");
      }

      // Profit
      if (data.profit) {
        await new Promise((r) => setTimeout(r, 200));
        addLog("PROFIT", `Net P&L: $${data.profit.toFixed(6)} USDC`);
      }

      // Settlement
      if (data.txHash) {
        await new Promise((r) => setTimeout(r, 200));
        addLog("INFO", `Arc Settlement: ${data.txHash.slice(0, 18)}...`);
        if (data.vaultBefore && data.vaultAfter) {
          addLog("INFO", `Vault: ${data.vaultBefore} → ${data.vaultAfter} USDC`);
        }
      }

      addLog("INFO", `Pipeline complete — profit: $${(data.profit ?? 0).toFixed(4)} USDC`);
      fetchVaultBalance();
    } catch (err) {
      addLog("INFO", `Pipeline error: ${err instanceof Error ? err.message : String(err)}`);
    }

    setIsExecuting(false);
  };

  return (
    <div className="flex flex-col gap-6 p-8 px-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-white">
            OVERVIEW
          </h1>
          <p className="mt-1.5 font-mono text-[13px] text-[#8a8a8a]">
            Monitor cross-chain CPT arbitrage in real-time
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 border border-[#2f2f2f] bg-[#0A0A0A] px-3 py-2 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {/* Arbitrage Controls */}
      <div className="flex items-center gap-3 border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-3">
        {/* Threshold */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#8a8a8a]">THRESHOLD</span>
          <input
            type="number"
            min={1}
            max={500}
            value={thresholdBps}
            onChange={(e) => setThresholdBps(Math.max(1, Math.min(500, parseInt(e.target.value) || 10)))}
            className="w-14 border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1 text-center font-mono text-[12px] font-bold text-white focus:border-[#00FF88] focus:outline-none"
          />
          <span className="font-mono text-[10px] text-[#8a8a8a]">bps</span>
        </div>

        <div className="h-6 w-px bg-[#2f2f2f]" />

        {/* Trade Amount */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#8a8a8a]">AMOUNT</span>
          <input
            type="number"
            min={1}
            max={100000}
            value={tradeAmountUsdc}
            onChange={(e) => setTradeAmountUsdc(Math.max(1, Math.min(100000, parseInt(e.target.value) || 1000)))}
            className="w-20 border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1 text-center font-mono text-[12px] font-bold text-white focus:border-[#00FF88] focus:outline-none"
          />
          <span className="font-mono text-[10px] text-[#8a8a8a]">USDC</span>
        </div>

        <div className="h-6 w-px bg-[#2f2f2f]" />

        {/* Spread indicator */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#8a8a8a]">SPREAD</span>
          <span className={`font-mono text-[12px] font-bold ${hasOpportunity ? "text-[#00FF88]" : "text-[#8a8a8a]"}`}>
            {currentSpreadBps.toFixed(1)} bps
          </span>
          {hasOpportunity && (
            <span className="bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
              OPPORTUNITY
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Execute button */}
        <button
          onClick={handleExecuteArbitrage}
          disabled={isExecuting || !hasOpportunity}
          title={!hasOpportunity ? `Spread (${currentSpreadBps.toFixed(1)} bps) below threshold (${thresholdBps} bps)` : `Execute arbitrage with ${tradeAmountUsdc} USDC`}
          className={`flex items-center gap-2 px-5 py-2 font-mono text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40 ${
            isExecuting
              ? "bg-[#FF8800] text-[#0C0C0C]"
              : hasOpportunity
                ? "bg-[#00FF88] text-[#0C0C0C]"
                : "bg-[#333] text-[#888]"
          }`}
        >
          {isExecuting ? <Square size={14} /> : <Play size={14} />}
          {isExecuting ? "EXECUTING..." : "EXECUTE ARBITRAGE"}
        </button>
      </div>

      {/* Metrics Row */}
      <MetricsRow chainData={chainData} priceHistory={priceHistory} thresholdBps={thresholdBps} vaultBalance={vaultBalance} />

      {/* Middle Row: Chart + Session Log */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3">
          <PriceSpreadChart priceHistory={priceHistory} thresholdBps={thresholdBps} />
        </div>
        <div className="col-span-2">
          <SessionLog logs={sessionLogs} isRunning={isExecuting} />
        </div>
      </div>
    </div>
  );
}
