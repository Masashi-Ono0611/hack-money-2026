"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
      const data = await res.json();
      if (data.ok) {
        setChains(data.chains);
        const prices = data.chains
          .filter((c: ChainData) => c.price !== null)
          .map((c: ChainData) => `${c.label}: ${c.price!.toFixed(6)} CPT/USDC`)
          .join(", ");
        onLog(`Prices: ${prices || "no data"}`);
      } else {
        onLog(`Chain data error: ${data.error}`);
      }
    } catch (err: any) {
      onLog(`Chain data fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prices = chains.filter((c) => c.price !== null).map((c) => c.price!);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const spread = maxPrice - minPrice;

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">CPT / USDC Prices</CardTitle>
          <CardDescription>
            Cross-chain price comparison from Uniswap v4 pools
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {chains.length === 0 ? (
          <p className="text-sm text-zinc-400">Click refresh to load prices</p>
        ) : (
          <div className="space-y-4">
            {spread > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Arbitrage opportunity: {(spread * 100 / maxPrice).toFixed(2)}% spread
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {chains.map((c) => {
                const isMax = c.price === maxPrice && prices.length > 1;
                const isMin = c.price === minPrice && prices.length > 1;
                return (
                  <div
                    key={c.chain}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-500">{c.label}</span>
                      {isMax && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>}
                      {isMin && <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600">Low</Badge>}
                      {!isMax && !isMin && prices.length > 1 && <Minus className="h-3 w-3 text-zinc-300" />}
                    </div>
                    {c.price !== null ? (
                      <p className="mt-1 text-xl font-semibold font-mono tabular-nums">
                        {c.price.toFixed(6)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-red-400">
                        {c.error ? "RPC error" : "No pool data"}
                      </p>
                    )}
                    {c.tick !== null && (
                      <p className="text-[10px] text-zinc-400">tick: {c.tick}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
