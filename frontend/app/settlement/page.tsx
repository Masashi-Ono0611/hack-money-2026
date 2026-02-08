"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw, Vault } from "lucide-react";
import { SettlePanel, type SettleLogEvent } from "./_components/settle-panel";
import { SettlementActivityLog, type SettlementLogEntry } from "./_components/settlement-activity-log";
import { VaultHistoryChart, type VaultSnapshot } from "./_components/vault-history-chart";

export default function SettlementPage() {
  const [activityLogs, setActivityLogs] = useState<SettlementLogEntry[]>([]);
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const [vaultHistory, setVaultHistory] = useState<VaultSnapshot[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logCounter = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback(
    (type: SettlementLogEntry["type"], message: string, txHash?: string, chain?: string) => {
      logCounter.current += 1;
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setActivityLogs((prev) => [
        ...prev,
        { id: String(logCounter.current), timestamp, type, message, txHash, chain },
      ]);
    },
    [],
  );

  const fetchVaultBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/settlement/vault-balance");
      const data = await res.json();
      if (data.ok && data.balance) {
        setVaultBalance(data.balance);
        const bal = parseFloat(data.balance);
        if (!isNaN(bal)) {
          setVaultHistory((prev) => [
            ...prev.slice(-59),
            { timestamp: Date.now(), balance: bal },
          ]);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchVaultBalance();
    intervalRef.current = setInterval(fetchVaultBalance, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchVaultBalance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    addLog("INFO", "Refreshing vault balance...");
    await fetchVaultBalance();
    addLog("VAULT", `Vault balance: $${vaultBalance ?? "?"} USDC`);
    setIsRefreshing(false);
  };

  const handleSettleLog = (event: SettleLogEvent) => {
    addLog(event.type, event.message, event.txHash, event.chain);
  };

  const handleVaultUpdate = () => {
    addLog("VAULT", "Settlement complete — refreshing vault balance...");
    fetchVaultBalance();
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
            Settle arbitrage profit to Arc operator vault via Yellow ClearNode
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 border border-[#2f2f2f] bg-[#0A0A0A] px-4 py-2.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {/* Vault Balance */}
      <div className="flex items-center gap-4 border border-[#2f2f2f] bg-[#0A0A0A] px-6 py-5">
        <Vault size={24} className="text-[#6a9fff]" />
        <div>
          <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
            VAULT BALANCE
          </span>
          <p className="font-mono text-2xl font-bold tabular-nums text-white">
            {vaultBalance ? `$${vaultBalance}` : "—"}
          </p>
          <span className="font-mono text-[10px] text-[#8a8a8a]">USDC (Arc Operator Vault)</span>
        </div>
      </div>

      {/* Vault Balance History Chart */}
      <VaultHistoryChart history={vaultHistory} />

      {/* Settlement Execution */}
      <SettlePanel onLog={handleSettleLog} onVaultUpdate={handleVaultUpdate} />

      {/* Activity Log */}
      <SettlementActivityLog logs={activityLogs} />
    </div>
  );
}
