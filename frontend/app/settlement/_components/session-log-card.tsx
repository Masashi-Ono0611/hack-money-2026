"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface Trade {
  id: number;
  time: string;
  action: "BUY" | "SELL";
  pair: string;
  amount: string;
  price: string;
  pnl: string;
}

const MOCK_TRADES: Trade[] = [
  { id: 1, time: "14:32:01", action: "BUY",  pair: "CPT-B/USDC", amount: "500", price: "0.000842", pnl: "" },
  { id: 2, time: "14:32:01", action: "SELL", pair: "CPT-A/USDC", amount: "500", price: "0.000891", pnl: "+0.0245" },
  { id: 3, time: "14:32:03", action: "BUY",  pair: "CPT-B/USDC", amount: "300", price: "0.000845", pnl: "" },
  { id: 4, time: "14:32:03", action: "SELL", pair: "CPT-A/USDC", amount: "300", price: "0.000889", pnl: "+0.0132" },
  { id: 5, time: "14:32:05", action: "BUY",  pair: "CPT-B/USDC", amount: "700", price: "0.000848", pnl: "" },
  { id: 6, time: "14:32:05", action: "SELL", pair: "CPT-A/USDC", amount: "700", price: "0.000887", pnl: "+0.0273" },
  { id: 7, time: "14:32:08", action: "BUY",  pair: "CPT-B/USDC", amount: "400", price: "0.000850", pnl: "" },
  { id: 8, time: "14:32:08", action: "SELL", pair: "CPT-A/USDC", amount: "400", price: "0.000885", pnl: "+0.0140" },
];

export function SessionLogCard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= MOCK_TRADES.length) {
        setRunning(false);
        clearInterval(interval);
        return;
      }
      setTrades((prev) => [...prev, MOCK_TRADES[idx]]);
      idx++;
    }, 600);
    return () => clearInterval(interval);
  }, [running]);

  const startDemo = () => {
    setTrades([]);
    setRunning(true);
  };

  const totalPnl = trades
    .filter((t) => t.pnl)
    .reduce((sum, t) => sum + parseFloat(t.pnl), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div>
            <CardTitle className="text-base">Yellow Session (Demo)</CardTitle>
            <CardDescription>Gasless arbitrage execution log</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <Badge variant="default" className="animate-pulse bg-yellow-500">
              LIVE
            </Badge>
          )}
          <button
            onClick={startDemo}
            disabled={running}
            className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-yellow-600 disabled:opacity-50"
          >
            {running ? "Running..." : "Run Demo"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Click &quot;Run Demo&quot; to simulate a gasless arbitrage session
          </p>
        ) : (
          <div className="space-y-2">
            <div className="max-h-52 overflow-y-auto rounded bg-zinc-50 p-2 font-mono text-xs dark:bg-zinc-900">
              {trades.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-0.5">
                  <span className="text-zinc-400 w-16">{t.time}</span>
                  <Badge
                    variant={t.action === "BUY" ? "default" : "secondary"}
                    className={`w-10 justify-center text-[10px] ${
                      t.action === "BUY"
                        ? "bg-blue-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {t.action}
                  </Badge>
                  <span className="text-zinc-600 dark:text-zinc-400 w-24">{t.pair}</span>
                  <span className="w-12 text-right">{t.amount}</span>
                  <span className="w-20 text-right">@{t.price}</span>
                  {t.pnl && (
                    <span className="ml-auto text-emerald-600 font-medium">
                      {t.pnl} USDC
                    </span>
                  )}
                </div>
              ))}
            </div>
            {totalPnl > 0 && (
              <div className="flex justify-between rounded bg-emerald-50 px-3 py-1.5 text-sm dark:bg-emerald-950/30">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Session PnL ({trades.filter((t) => t.pnl).length} arb rounds)
                </span>
                <span className="font-mono font-semibold text-emerald-600">
                  +{totalPnl.toFixed(4)} USDC
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
