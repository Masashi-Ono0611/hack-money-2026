"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import type { ChainPrice, PriceDataPoint } from "../_types";
import { StatsSummary } from "./_components/stats-summary";
import { ProfitHistoryChart } from "./_components/profit-history-chart";
import { UtilizationChart } from "./_components/utilization-chart";

interface DemoHistoryEntry {
  timestamp: number;
  profit: number;
  sessions: number;
  durationMs: number;
}

export default function AnalyticsPage() {
  const [chainData, setChainData] = useState<ChainPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [demoHistory, setDemoHistory] = useState<DemoHistoryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          ...prev.slice(-29),
          { timestamp: data.timestamp, priceA, priceB, spreadBps },
        ]);
      }
    } catch {
      // silent retry
    }
  }, []);

  useEffect(() => {
    fetchChainData();
    intervalRef.current = setInterval(fetchChainData, 5_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchChainData]);

  // Load demo history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ghost-yield-demo-history");
      if (stored) setDemoHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchChainData();
    setIsRefreshing(false);
  };

  // Compute summary stats
  const totalProfit = demoHistory.reduce((sum, d) => sum + d.profit, 0);
  const sessionCount = demoHistory.reduce((sum, d) => sum + d.sessions, 0);
  const avgSpreadBps =
    priceHistory.length > 0
      ? priceHistory.reduce((sum, p) => sum + p.spreadBps, 0) /
        priceHistory.length
      : 0;
  const avgUtilization =
    chainData.length > 0
      ? chainData.reduce((sum, c) => sum + (c.utilization ?? 0), 0) /
        chainData.length
      : 0;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl sm:text-4xl font-bold tracking-tight text-white">
            ANALYTICS
          </h1>
          <p className="mt-1.5 font-mono text-[13px] text-[#a0a0a0]">
            Cross-chain arbitrage performance metrics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-[#2f2f2f] bg-[#0A0A0A] px-4 py-2.5 font-mono text-[11px] font-semibold text-white transition-all duration-200 hover:bg-[#1a1a1a] hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00FF88] focus-visible:outline-none disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? "animate-spin" : ""}
          />
          REFRESH
        </button>
      </div>

      {/* Stats Summary */}
      <StatsSummary
        totalProfit={totalProfit}
        sessionCount={sessionCount}
        avgSpreadBps={avgSpreadBps}
        avgUtilization={avgUtilization}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-3">
          <ProfitHistoryChart priceHistory={priceHistory} />
        </div>
        <div className="col-span-1 md:col-span-3 lg:col-span-2">
          <UtilizationChart chainData={chainData} />
        </div>
      </div>

      {/* Profit History Table */}
      <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
        <div className="px-6 py-4">
          <span className="font-sans text-base font-semibold text-white">
            DEMO EXECUTION HISTORY
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            Past demo run results (stored locally)
          </p>
        </div>
        <div className="border-t border-[#2f2f2f]">
          {demoHistory.length === 0 ? (
            <div className="flex h-[120px] items-center justify-center">
              <span className="font-mono text-xs text-[#a0a0a0]">
                No demo history yet — run a demo from the Demo page
              </span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2f2f2f]">
                  <th className="px-6 py-3 text-left font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    TIMESTAMP
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    PROFIT (USDC)
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    SESSIONS
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    DURATION
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...demoHistory].reverse().map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#2f2f2f] last:border-b-0"
                  >
                    <td className="px-6 py-3 font-mono text-[11px] text-white">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] font-semibold text-[#00FF88]">
                      +${entry.profit.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] text-white">
                      {entry.sessions}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] text-[#a0a0a0]">
                      {entry.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
