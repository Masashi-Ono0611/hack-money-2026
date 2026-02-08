"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

export interface SwapLogEvent {
  type: "SWAP" | "ERROR";
  chain: string;
  message: string;
  txHash?: string;
}

interface SwapPanelProps {
  chain: string;
  label: string;
  onSuccess: () => void;
  onLog?: (event: SwapLogEvent) => void;
}

const DEFAULTS = {
  usdc: { raw: "10000", label: "0.01 USDC ≈ 8-10 bps" },
  cpt: { raw: "5000000000000000", label: "0.005 CPT ≈ 5 bps" },
};

export function SwapPanel({ chain, label, onSuccess, onLog }: SwapPanelProps) {
  const [zeroForOne, setZeroForOne] = useState(true);
  const [swapAmount, setSwapAmount] = useState(DEFAULTS.usdc.raw);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const handleSwap = async () => {
    setIsSubmitting(true);
    setResult("");
    onLog?.({ type: "SWAP", chain, message: `Swapping ${directionLabel} (amount: ${swapAmount})...` });
    try {
      const res = await fetch("/api/admin/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, zeroForOne, swapAmount }),
      });
      const data = await res.json();
      if (data.ok && data.success) {
        const tickInfo =
          data.beforeTick != null && data.afterTick != null
            ? ` tick: ${data.beforeTick} → ${data.afterTick}`
            : "";
        const txLabel = data.txHash ? ` (tx: ${data.txHash.slice(0, 14)}...)` : "";
        setResult(`✅ Swap executed${tickInfo}${txLabel}`);
        onLog?.({
          type: "SWAP",
          chain,
          message: `[${label}] ${directionLabel} — amount: ${swapAmount}${tickInfo}`,
          txHash: data.txHash ?? undefined,
        });
        onSuccess();
      } else {
        const errMsg = data.error ?? "Unknown error";
        setResult(`Error: ${errMsg}`);
        onLog?.({ type: "ERROR", chain, message: `Swap failed: ${errMsg}` });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setResult(`Error: ${errMsg}`);
      onLog?.({ type: "ERROR", chain, message: `Swap error: ${errMsg}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const directionLabel = zeroForOne ? "USDC → CPT" : "CPT → USDC";

  return (
    <div className="border border-[#1f1f1f] bg-[#080808] p-4">
      <div className="mb-3 flex items-center gap-2">
        <ArrowLeftRight size={14} className="text-[#FF8800]" />
        <span className="font-mono text-[11px] font-semibold tracking-wider text-[#8a8a8a]">
          SWAP
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
            DIRECTION
          </label>
          <button
            onClick={() => {
              setZeroForOne((p) => {
                const next = !p;
                setSwapAmount(next ? DEFAULTS.usdc.raw : DEFAULTS.cpt.raw);
                return next;
              });
            }}
            className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1.5 font-mono text-[11px] font-bold text-white transition-colors hover:border-[#00FF88]"
          >
            {directionLabel}
          </button>
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
            AMOUNT (raw) — {zeroForOne ? "USDC 6dec" : "CPT 18dec"}
          </label>
          <input
            type="text"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1.5 font-mono text-[11px] text-white focus:border-[#00FF88] focus:outline-none"
            placeholder={zeroForOne ? DEFAULTS.usdc.label : DEFAULTS.cpt.label}
          />
        </div>
      </div>

      <button
        onClick={handleSwap}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 bg-[#FF8800] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "SWAPPING..." : `SWAP ${directionLabel}`}
      </button>

      {result && (
        <p
          className={`mt-2 font-mono text-[11px] ${
            result.startsWith("Error") ? "text-[#FF4444]" : "text-[#00FF88]"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
