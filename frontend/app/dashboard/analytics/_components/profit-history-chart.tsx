"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceDataPoint } from "../../_types";

interface ProfitHistoryChartProps {
  priceHistory: PriceDataPoint[];
}

export function ProfitHistoryChart({ priceHistory }: ProfitHistoryChartProps) {
  const data = useMemo(() => {
    return priceHistory.map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      priceA: p.priceA,
      priceB: p.priceB,
      spread: p.spreadBps,
    }));
  }, [priceHistory]);

  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            CPT PRICE HISTORY
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            CPT-A / CPT-B price tracking (auto-refresh 5s)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#00FF88]" />
            <span className="font-mono text-[10px] font-medium text-[#a0a0a0]">
              CPT-A
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#FF8800]" />
            <span className="font-mono text-[10px] font-medium text-[#a0a0a0]">
              CPT-B
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {data.length < 2 ? (
          <div className="flex h-[220px] items-center justify-center">
            <span className="font-mono text-xs text-[#a0a0a0]">
              Collecting data points... ({data.length}/2 minimum)
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                  fill: "#a0a0a0",
                  fontFamily: "monospace",
                }}
                stroke="#2f2f2f"
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "#a0a0a0",
                  fontFamily: "monospace",
                }}
                stroke="#2f2f2f"
                tickFormatter={(v: number) => v.toFixed(4)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0A0A0A",
                  border: "1px solid #2f2f2f",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="priceA"
                stroke="#00FF88"
                fill="#00FF8815"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="CPT-A"
              />
              <Area
                type="monotone"
                dataKey="priceB"
                stroke="#FF8800"
                fill="#FF880015"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="CPT-B"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
