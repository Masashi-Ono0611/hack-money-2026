"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  // Auto-refresh chain data every 15s
  useEffect(() => {
    fetchChainData();
    intervalRef.current = setInterval(fetchChainData, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchChainData]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Settlement Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Monitor CPT prices, Hook state, Yellow sessions, and Arc vault
          balances.
        </p>
      </div>

      {/* On-chain data: CPT prices + Hook status */}
      <CptPriceCard onLog={addLog} />
      <HookStatusCard chains={chainData} />

      {/* Price chart */}
      <PriceChart history={priceHistory} />

      {/* Yellow session demo */}
      <SessionLogCard />

      {/* Settlement controls */}
      <div className="grid gap-6 sm:grid-cols-2">
        <YellowStatusCard onLog={addLog} />
        <VaultBalanceCard onLog={addLog} />
      </div>

      <AutoSettleCard onLog={addLog} />

      <PipelineLog logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}
