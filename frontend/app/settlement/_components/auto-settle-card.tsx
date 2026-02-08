"use client";

import { useState } from "react";
import { Play, Loader2, ArrowRightLeft } from "lucide-react";

interface Props {
  onLog: (msg: string) => void;
}

interface SettleResult {
  ok: boolean;
  success: boolean;
  dryRun: boolean;
  sessionId: string;
  profit: string | null;
  transferAmount: string | null;
  transactionId: string | null;
  error?: string;
  raw?: string;
}

export function AutoSettleCard({ onLog }: Props) {
  const [sessionId, setSessionId] = useState("demo-session-001");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<SettleResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSettle = async () => {
    setLoading(true);
    setResult(null);
    onLog(`Running auto-settle (session=${sessionId}, dryRun=${dryRun})...`);
    try {
      const res = await fetch("/api/settlement/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, dryRun }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok && data.success) {
        onLog(
          `Settle ${data.dryRun ? "(DRY-RUN)" : ""}: profit=${data.profit ?? "?"} USDC, transfer=${data.transferAmount ?? "?"} USDC`,
        );
      } else {
        onLog(`Settle failed: ${data.error ?? "unknown"}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      onLog(`Settle: fetch failed - ${error.message}`);
      setResult({ ok: false, success: false, dryRun, sessionId, profit: null, transferAmount: null, transactionId: null, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            AUTO-SETTLE PIPELINE
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            Fetch Yellow profit → transfer to Arc vault
          </p>
        </div>
        <ArrowRightLeft size={16} className="text-[#a0a0a0]" />
      </div>

      {/* Content */}
      <div className="space-y-4 border-t border-[#2f2f2f] px-6 py-5">
        {/* Controls */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <span className="font-mono text-[9px] font-bold tracking-wider text-[#a0a0a0]">
              SESSION ID
            </span>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-lg border border-[#2f2f2f] bg-[#0C0C0C] px-3 py-2 font-mono text-[11px] text-white outline-none transition-colors focus:border-[#00FF8860] placeholder:text-[#a0a0a0]"
              placeholder="e.g. demo-session-001"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 font-mono text-[11px] text-[#a0a0a0]">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="accent-[#00FF88]"
            />
            DRY RUN
          </label>
          <button
            onClick={runSettle}
            disabled={loading || !sessionId}
            className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00FF88] focus-visible:outline-none disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {loading ? "RUNNING..." : "RUN"}
          </button>
        </div>

        {/* Result */}
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
                {result.dryRun && (
                  <span className="bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
                    DRY-RUN
                  </span>
                )}
              </div>

              {result.profit && (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <span className="font-mono text-[9px] font-bold tracking-wider text-[#a0a0a0]">
                      NET PROFIT
                    </span>
                    <p className="mt-1 font-mono text-lg font-bold text-[#00FF88]">
                      {result.profit} USDC
                    </p>
                  </div>
                  {result.transferAmount && (
                    <div>
                      <span className="font-mono text-[9px] font-bold tracking-wider text-[#a0a0a0]">
                        TRANSFER
                      </span>
                      <p className="mt-1 font-mono text-lg font-bold text-white">
                        {result.transferAmount} USDC
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.transactionId && (
                <div>
                  <span className="font-mono text-[9px] font-bold tracking-wider text-[#a0a0a0]">
                    TRANSACTION ID
                  </span>
                  <p className="mt-1 break-all font-mono text-[11px] text-white">
                    {result.transactionId}
                  </p>
                </div>
              )}

              {result.error && (
                <p className="break-all font-mono text-[11px] text-[#FF4444]">
                  {result.error}
                </p>
              )}

              {result.raw && (
                <details className="font-mono text-[11px]">
                  <summary className="cursor-pointer text-[#a0a0a0] hover:text-white">
                    Raw output
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-[#2f2f2f] bg-[#0C0C0C] p-3 text-[10px] text-[#a0a0a0]">
                    {result.raw}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
