"use client";

import { useState } from "react";
import { Vault, RefreshCw } from "lucide-react";

interface Props {
  onLog: (msg: string) => void;
}

interface VaultStatus {
  ok: boolean;
  balance: string | null;
  token: string | null;
  error?: string;
}

export function VaultBalanceCard({ onLog }: Props) {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    onLog("Checking Arc vault balance...");
    try {
      const res = await fetch("/api/settlement/vault-balance");
      const data = await res.json();
      setStatus(data);
      if (data.ok && data.balance) {
        onLog(`Vault: ${data.balance} ${data.token ?? "USDC"}`);
      } else {
        onLog(`Vault: ${data.error ?? "no balance data"}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      onLog(`Vault: fetch failed - ${error.message}`);
      setStatus({ ok: false, balance: null, token: null, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            ARC VAULT
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Operator vault balance
          </p>
        </div>
        <button
          onClick={fetchBalance}
          disabled={loading}
          className="flex items-center justify-center border border-[#2f2f2f] bg-[#0A0A0A] p-2 text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 border-t border-[#2f2f2f] px-6 py-5">
        {!status ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            Click refresh to check balance
          </span>
        ) : status.ok && status.balance ? (
          <div className="flex items-center gap-3">
            <Vault size={18} className="text-[#6a9fff]" />
            <div>
              <p className="font-mono text-[28px] font-bold tabular-nums text-white">
                ${status.balance}
              </p>
              <span className="inline-block bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
                {status.token ?? "USDC"}
              </span>
            </div>
          </div>
        ) : (
          <p className="break-all font-mono text-[11px] text-[#FF4444]">
            {status.error ?? "Could not fetch balance"}
          </p>
        )}
      </div>
    </div>
  );
}
