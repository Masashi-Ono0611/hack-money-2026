"use client";

import { useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";

interface ChainData {
  chain: string;
  label: string;
  price: number | null;
  tick: number | null;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
  error: string | null;
}

interface Props {
  onLog: (msg: string) => void;
}

export function CptPriceCard({ onLog }: Props) {
  const [chains, setChains] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    onLog("Fetching CPT prices from on-chain pools...");
    try {
      const res = await fetch("/api/settlement/chain-data");
      const data = (await res.json()) as { ok: boolean; chains: ChainData[]; error?: string };
      if (data.ok && Array.isArray(data.chains)) {
        setChains(data.chains);
        const prices = data.chains
          .filter((c) => c.price !== null)
          .map((c) => `${c.label}: ${c.price!.toFixed(6)} CPT/USDC`)
          .join(", ");
        onLog(`Prices: ${prices || "no data"}`);
      } else {
        onLog(`Chain data error: ${data.error}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      onLog(`Chain data fetch failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prices = chains.filter((c) => c.price !== null).map((c) => c.price!);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const spread = maxPrice - minPrice;

  return (
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            CPT / USDC PRICES
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Cross-chain price comparison from Uniswap v4 pools
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center justify-center border border-[#2f2f2f] bg-[#0A0A0A] p-2 text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {chains.length === 0 ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            Click refresh to load prices
          </span>
        ) : (
          <div className="space-y-4">
            {spread > 0 && (
              <div className="flex items-center gap-2 border border-[#FF880040] bg-[#FF880010] px-3 py-2">
                <TrendingUp size={14} className="text-[#FF8800]" />
                <span className="font-mono text-[11px] font-medium text-[#FF8800]">
                  ARBITRAGE OPPORTUNITY: {(spread * 100 / maxPrice).toFixed(2)}% SPREAD
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {chains.map((c) => {
                const isMax = c.price === maxPrice && prices.length > 1;
                const isMin = c.price === minPrice && prices.length > 1;
                return (
                  <div
                    key={c.chain}
                    className={`border bg-[#0A0A0A] p-4 ${
                      isMax ? "border-[#FF444440]" : isMin ? "border-[#00FF8840]" : "border-[#2f2f2f]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
                        {c.label.toUpperCase()}
                      </span>
                      {isMax && (
                        <span className="bg-[#FF444420] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF4444]">
                          HIGH
                        </span>
                      )}
                      {isMin && (
                        <span className="bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
                          LOW
                        </span>
                      )}
                    </div>
                    {c.price !== null ? (
                      <p className="mt-2 font-mono text-xl font-bold tabular-nums text-white">
                        ${c.price.toFixed(6)}
                      </p>
                    ) : (
                      <p className="mt-2 font-mono text-sm text-[#FF4444]">
                        {c.error ? "RPC error" : "No pool data"}
                      </p>
                    )}
                    {c.tick !== null && (
                      <p className="mt-1 font-mono text-[10px] text-[#8a8a8a]">
                        tick: {c.tick}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
