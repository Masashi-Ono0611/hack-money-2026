"use client";

import { useEffect, useState } from "react";
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
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-[#FF8800]" />
          <div>
            <span className="font-sans text-base font-semibold text-white">
              YELLOW SESSION
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
              Gasless arbitrage execution log
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span className="inline-block animate-pulse bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
              LIVE
            </span>
          )}
          <button
            onClick={startDemo}
            disabled={running}
            className={`px-4 py-2 font-mono text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60 ${
              running
                ? "bg-[#FF8800] text-[#0C0C0C]"
                : "bg-[#00FF88] text-[#0C0C0C]"
            }`}
          >
            {running ? "RUNNING..." : "RUN DEMO"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-[#2f2f2f] px-6 py-4">
        {trades.length === 0 ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            Click RUN DEMO to simulate a gasless arbitrage session
          </span>
        ) : (
          <div className="space-y-3">
            <div className="max-h-52 overflow-y-auto">
              {trades.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-1">
                  <span className="font-mono text-[10px] text-[#8a8a8a]">
                    {t.time}
                  </span>
                  <span
                    className={`inline-block w-10 text-center px-1 py-0 font-mono text-[9px] font-bold ${
                      t.action === "BUY"
                        ? "bg-[#00FF8820] text-[#00FF88]"
                        : "bg-[#FF880020] text-[#FF8800]"
                    }`}
                  >
                    {t.action}
                  </span>
                  <span className="w-24 font-mono text-[11px] text-[#8a8a8a]">
                    {t.pair}
                  </span>
                  <span className="w-12 text-right font-mono text-[11px] text-white">
                    {t.amount}
                  </span>
                  <span className="w-20 text-right font-mono text-[11px] text-[#8a8a8a]">
                    @{t.price}
                  </span>
                  {t.pnl && (
                    <span className="ml-auto font-mono text-[11px] font-bold text-[#00FF88]">
                      {t.pnl} USDC
                    </span>
                  )}
                </div>
              ))}
            </div>
            {totalPnl > 0 && (
              <div className="flex items-center justify-between border border-[#00FF8840] bg-[#00FF8810] px-4 py-2">
                <span className="font-mono text-[11px] text-[#8a8a8a]">
                  Session PnL ({trades.filter((t) => t.pnl).length} arb rounds)
                </span>
                <span className="font-mono text-sm font-bold text-[#00FF88]">
                  +{totalPnl.toFixed(4)} USDC
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
