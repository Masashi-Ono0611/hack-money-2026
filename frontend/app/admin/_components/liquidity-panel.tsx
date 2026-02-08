"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";

export interface LiquidityLogEvent {
  type: "LIQUIDITY" | "ERROR";
  chain: string;
  message: string;
  txHash?: string;
}

interface LiquidityPanelProps {
  chain: string;
  label: string;
  onSuccess: () => void;
  onLog?: (event: LiquidityLogEvent) => void;
}

export function LiquidityPanel({ chain, label, onSuccess, onLog }: LiquidityPanelProps) {
  const [liquidityDelta, setLiquidityDelta] = useState("100000000000000");
  const [tickLower, setTickLower] = useState("276240");
  const [tickUpper, setTickUpper] = useState("276420");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const handleAddLiquidity = async () => {
    setIsSubmitting(true);
    setResult("");
    onLog?.({ type: "LIQUIDITY", chain, message: `Adding liquidity (delta: ${liquidityDelta}, ticks: ${tickLower}-${tickUpper})...` });
    try {
      const res = await fetch("/api/admin/add-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain,
          liquidityDelta,
          tickLower: parseInt(tickLower),
          tickUpper: parseInt(tickUpper),
        }),
      });
      const data = await res.json();
      if (data.ok && data.success) {
        const txLabel = data.txHash ? ` (tx: ${data.txHash.slice(0, 14)}...)` : "";
        setResult(`✅ Liquidity added${txLabel}`);
        onLog?.({
          type: "LIQUIDITY",
          chain,
          message: `[${label}] Added liquidity — delta: ${liquidityDelta}, ticks: ${tickLower}-${tickUpper}`,
          txHash: data.txHash ?? undefined,
        });
        onSuccess();
      } else {
        const errMsg = data.error ?? "Unknown error";
        setResult(`Error: ${errMsg}`);
        onLog?.({ type: "ERROR", chain, message: `Add liquidity failed: ${errMsg}` });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setResult(`Error: ${errMsg}`);
      onLog?.({ type: "ERROR", chain, message: `Add liquidity error: ${errMsg}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[#1f1f1f] bg-[#080808] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Droplets size={14} className="text-[#00FF88]" />
        <span className="font-mono text-[11px] font-semibold tracking-wider text-[#8a8a8a]">
          ADD LIQUIDITY
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
            LIQUIDITY DELTA
          </label>
          <input
            type="text"
            value={liquidityDelta}
            onChange={(e) => setLiquidityDelta(e.target.value)}
            className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1.5 font-mono text-[11px] text-white placeholder:text-[#555] focus:border-[#00FF88] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
            TICK LOWER
          </label>
          <input
            type="number"
            value={tickLower}
            onChange={(e) => setTickLower(e.target.value)}
            className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1.5 font-mono text-[11px] text-white focus:border-[#00FF88] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
            TICK UPPER
          </label>
          <input
            type="number"
            value={tickUpper}
            onChange={(e) => setTickUpper(e.target.value)}
            className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-2 py-1.5 font-mono text-[11px] text-white focus:border-[#00FF88] focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleAddLiquidity}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 bg-[#00FF88] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "ADDING..." : "ADD LIQUIDITY"}
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
