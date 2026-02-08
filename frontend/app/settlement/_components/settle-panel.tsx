"use client";

import { useState } from "react";
import { Play, Loader2, ArrowRightLeft, ExternalLink } from "lucide-react";
import { explorerTxUrl, truncateTxHash } from "@/lib/utils";

export interface SettleLogEvent {
  type: "SETTLE" | "VAULT" | "ERROR" | "INFO";
  message: string;
  txHash?: string;
  chain?: string;
}

interface Props {
  onLog: (event: SettleLogEvent) => void;
  onVaultUpdate: () => void;
}

interface SettleResult {
  ok: boolean;
  success: boolean;
  dryRun?: boolean;
  sessionId?: string;
  profit: string | null;
  transferAmount: string | null;
  transactionId: string | null;
  error?: string;
  raw?: string;
}

export function SettlePanel({ onLog, onVaultUpdate }: Props) {
  const [profitUsdc, setProfitUsdc] = useState("1");
  const [result, setResult] = useState<SettleResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSettle = async () => {
    setLoading(true);
    setResult(null);
    onLog({ type: "INFO", message: `Starting settlement — transfer: ${profitUsdc} USDC` });

    try {
      const res = await fetch("/api/settlement/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profitUsdc: parseFloat(profitUsdc) }),
      });
      const data = await res.json();
      setResult(data);

      if (data.ok && data.success) {
        onLog({
          type: "SETTLE",
          message: `Settlement completed — transferred: ${data.transferAmount ?? profitUsdc} USDC`,
          txHash: data.transactionId ?? undefined,
          chain: "arc-testnet",
        });
        onVaultUpdate();
      } else {
        onLog({ type: "ERROR", message: `Settlement failed: ${data.error ?? "unknown error"}` });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      onLog({ type: "ERROR", message: `Settlement error: ${errMsg}` });
      setResult({
        ok: false, success: false, dryRun: false, sessionId: undefined,
        profit: null, transferAmount: null, transactionId: null, error: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            SETTLE PROFIT
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Transfer arbitrage profit to Arc operator vault
          </p>
        </div>
        <ArrowRightLeft size={16} className="text-[#8a8a8a]" />
      </div>

      <div className="space-y-4 border-t border-[#2f2f2f] px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
              PROFIT (USDC)
            </span>
            <input
              type="text"
              value={profitUsdc}
              onChange={(e) => setProfitUsdc(e.target.value)}
              className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-3 py-2 font-mono text-[11px] text-white outline-none focus:border-[#00FF8860]"
              placeholder="1.5"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={runSettle}
              disabled={loading}
              className="flex items-center gap-2 bg-[#00FF88] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {loading ? "SETTLING..." : "SETTLE"}
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="h-px bg-[#2f2f2f]" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    result.success
                      ? "bg-[#00FF8820] text-[#00FF88]"
                      : "bg-[#FF444420] text-[#FF4444]"
                  }`}
                >
                  {result.success ? "SUCCESS" : "FAILED"}
                </span>
              </div>

              {result.transferAmount && (
                <div>
                  <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
                    TRANSFERRED
                  </span>
                  <p className="mt-1 font-mono text-lg font-bold text-white">
                    {result.transferAmount} USDC
                  </p>
                </div>
              )}

              {result.transactionId && (
                <div>
                  <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
                    TRANSACTION
                  </span>
                  <a
                    href={explorerTxUrl("arc-testnet", result.transactionId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#6a9fff] transition-colors hover:text-[#00FF88]"
                  >
                    <ExternalLink size={12} />
                    {truncateTxHash(result.transactionId)}
                  </a>
                </div>
              )}

              {result.error && (
                <p className="break-all font-mono text-[11px] text-[#FF4444]">
                  {result.error}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
