"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw, Play, Square, X } from "lucide-react";
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
  const [showMockBanner, setShowMockBanner] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<LogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  let logCounter = useRef(0);

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

  useEffect(() => {
    fetchChainData();
    intervalRef.current = setInterval(fetchChainData, 5_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchChainData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchChainData();
    setIsRefreshing(false);
  };

  const handleRunDemo = async () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setSessionLogs([]);

    addLog("INFO", "Starting demo...");

    try {
      const res = await fetch("/api/demo/run", { method: "POST" });
      const data = await res.json();

      if (!data.ok) {
        addLog("INFO", "Demo failed to start");
        setIsDemoRunning(false);
        return;
      }

      for (const step of data.steps) {
        await new Promise((r) => setTimeout(r, 400));
        const icon = step.status === "done" ? "✅" : step.status === "skipped" ? "⏭️" : "❌";
        addLog("STEP", `${icon} Step ${step.step}: ${step.label}`, step.detail);

        if (step.step === 4 && step.status === "done") {
          const detail = step.detail ?? "";
          const sessionMatch = detail.match(/Session: (mock-session-[\w-]+)/);
          const profitMatch = detail.match(/Profit: \$([\d.]+)/);
          if (sessionMatch) {
            await new Promise((r) => setTimeout(r, 200));
            addLog("SESSION", "Session created", sessionMatch[1]);
          }
          await new Promise((r) => setTimeout(r, 200));
          addLog("BUY", `BUY CPT-A @ simulated price`, "Base Sepolia");
          await new Promise((r) => setTimeout(r, 200));
          addLog("SELL", `SELL CPT-B @ simulated price`, "Unichain Sepolia");
          if (profitMatch) {
            await new Promise((r) => setTimeout(r, 200));
            addLog("PROFIT", `Net P&L: +$${profitMatch[1]} USDC`, `${data.totalDurationMs}ms`);
          }
        }
      }

      addLog("INFO", `Demo complete — ${data.sessionsExecuted} session(s), $${data.totalProfitUsdc.toFixed(4)} USDC profit`);
    } catch (err) {
      addLog("INFO", `Demo error: ${err instanceof Error ? err.message : String(err)}`);
    }

    setIsDemoRunning(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 border border-[#2f2f2f] bg-[#0A0A0A] px-4 py-2.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            REFRESH
          </button>
          <button
            onClick={handleRunDemo}
            disabled={isDemoRunning}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60 ${
              isDemoRunning
                ? "bg-[#FF8800] text-[#0C0C0C]"
                : "bg-[#00FF88] text-[#0C0C0C]"
            }`}
          >
            {isDemoRunning ? <Square size={14} /> : <Play size={14} />}
            {isDemoRunning ? "RUNNING..." : "RUN DEMO"}
          </button>
        </div>
      </div>

      {/* Mock Banner */}
      {showMockBanner && (
        <div className="flex items-center justify-between border border-[#FF880040] bg-[#0A0A0A] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="bg-[#FF8800] px-2 py-1 font-mono text-[9px] font-bold text-[#0C0C0C]">
              MOCK
            </span>
            <span className="font-mono text-xs text-[#8a8a8a]">
              Yellow SDK running in mock mode — USE_YELLOW_MOCK=true
            </span>
          </div>
          <button
            onClick={() => setShowMockBanner(false)}
            className="font-mono text-xs font-semibold text-[#7a7a7a] hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <MetricsRow chainData={chainData} priceHistory={priceHistory} />

      {/* Middle Row: Chart + Session Log */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3">
          <PriceSpreadChart priceHistory={priceHistory} />
        </div>
        <div className="col-span-2">
          <SessionLog logs={sessionLogs} isRunning={isDemoRunning} />
        </div>
      </div>
    </div>
  );
}
