"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { YellowStatusCard } from "./_components/yellow-status-card";
import { VaultBalanceCard } from "./_components/vault-balance-card";
import { AutoSettleCard } from "./_components/auto-settle-card";
import { PipelineLog } from "./_components/pipeline-log";
import { CptPriceCard } from "./_components/cpt-price-card";
import { HookStatusCard } from "./_components/hook-status-card";
import { SessionLogCard } from "./_components/session-log-card";
import { PriceChart } from "./_components/price-chart";

interface ChainSnapshot {
  chain: string;
  label: string;
  price: number | null;
  tick: number | null;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
  error: string | null;
}

export default function SettlementPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [chainData, setChainData] = useState<ChainSnapshot[]>([]);
  const [priceHistory, setPriceHistory] = useState<
    { timestamp: number; chains: ChainSnapshot[] }[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const fetchChainData = useCallback(async () => {
    try {
      const res = await fetch("/api/settlement/chain-data");
      const data = await res.json();
      if (data.ok) {
        setChainData(data.chains);
        setPriceHistory((prev) => [
          ...prev.slice(-29),
          { timestamp: data.timestamp, chains: data.chains },
        ]);
      }
    } catch {
      // silent retry on next interval
    }
  }, []);

  useEffect(() => {
    // Safe: initial fetch + interval polling for settlement data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChainData();
    intervalRef.current = setInterval(fetchChainData, 15_000);
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
            SETTLEMENT
          </h1>
          <p className="mt-1.5 font-mono text-[13px] text-[#8a8a8a]">
            Monitor CPT prices, Hook state, Yellow sessions, and Arc vault
          </p>
        </div>
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
      </div>

      {/* On-chain data: CPT prices + Hook status */}
      <CptPriceCard onLog={addLog} />
      <HookStatusCard chains={chainData} />

      {/* Price chart */}
      <PriceChart history={priceHistory} />

      {/* Yellow session demo */}
      <SessionLogCard />

      {/* Settlement controls */}
      <div className="grid grid-cols-2 gap-3">
        <YellowStatusCard onLog={addLog} />
        <VaultBalanceCard onLog={addLog} />
      </div>

      <AutoSettleCard onLog={addLog} />

      <PipelineLog logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}
