"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw, Play, X } from "lucide-react";
import { MetricsRow } from "./_components/metrics-row";
import { PriceSpreadChart } from "./_components/price-spread-chart";
import { SessionLog } from "./_components/session-log";

interface ChainPrice {
  chain: string;
  label: string;
  price: number | null;
  tick: number | null;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
  error: string | null;
}

export interface PriceDataPoint {
  timestamp: number;
  priceA: number | null;
  priceB: number | null;
  spreadBps: number;
}

export default function DashboardPage() {
  const [chainData, setChainData] = useState<ChainPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
  const [showMockBanner, setShowMockBanner] = useState(true);
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
            className="flex items-center gap-2 border border-[#2f2f2f] bg-[#0A0A0A] px-4 py-2.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            REFRESH
          </button>
          <button className="flex items-center gap-2 bg-[#00FF88] px-4 py-2.5 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90">
            <Play size={14} />
            RUN DEMO
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
          <SessionLog />
        </div>
      </div>
    </div>
  );
}
