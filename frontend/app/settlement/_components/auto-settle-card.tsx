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
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            AUTO-SETTLE PIPELINE
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Fetch Yellow profit → transfer to Arc vault
          </p>
        </div>
        <ArrowRightLeft size={16} className="text-[#8a8a8a]" />
      </div>

      {/* Content */}
      <div className="space-y-4 border-t border-[#2f2f2f] px-6 py-5">
        {/* Controls */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
              SESSION ID
            </span>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-3 py-2 font-mono text-[11px] text-white outline-none transition-colors focus:border-[#00FF8860] placeholder:text-[#8a8a8a]"
              placeholder="e.g. demo-session-001"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 font-mono text-[11px] text-[#8a8a8a]">
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
            className="flex items-center gap-2 bg-[#00FF88] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-60"
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
                      NET PROFIT
                    </span>
                    <p className="mt-1 font-mono text-lg font-bold text-[#00FF88]">
                      {result.profit} USDC
                    </p>
                  </div>
                  {result.transferAmount && (
                    <div>
                      <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
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
                  <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
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
                  <summary className="cursor-pointer text-[#8a8a8a] hover:text-white">
                    Raw output
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto border border-[#2f2f2f] bg-[#0C0C0C] p-3 text-[10px] text-[#8a8a8a]">
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
