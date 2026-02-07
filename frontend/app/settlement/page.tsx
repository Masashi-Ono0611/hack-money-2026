"use client";

import { useState } from "react";
import { YellowStatusCard } from "./_components/yellow-status-card";
import { VaultBalanceCard } from "./_components/vault-balance-card";
import { AutoSettleCard } from "./_components/auto-settle-card";
import { PipelineLog } from "./_components/pipeline-log";

export default function SettlementPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Settlement Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Monitor Yellow state channels, Arc vault balances, and run the
          auto-settle pipeline.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <YellowStatusCard onLog={addLog} />
        <VaultBalanceCard onLog={addLog} />
      </div>

      <AutoSettleCard onLog={addLog} />

      <PipelineLog logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}
