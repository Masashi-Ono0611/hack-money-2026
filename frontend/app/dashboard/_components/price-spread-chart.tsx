"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PriceDataPoint } from "../_types";

interface PriceSpreadChartProps {
  priceHistory: PriceDataPoint[];
  thresholdBps: number;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function PriceSpreadChart({ priceHistory, thresholdBps }: PriceSpreadChartProps) {
  const displayData = priceHistory.slice(-30).map((p) => ({
    time: formatTime(p.timestamp),
    spread: Number(p.spreadBps.toFixed(2)),
    priceA: p.priceA,
    priceB: p.priceB,
  }));

  const maxSpread = Math.max(
    ...displayData.map((d) => d.spread),
    thresholdBps * 1.5,
  );

  return (
    <div className="flex h-[300px] flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <span className="font-sans text-base font-semibold text-white">
          PRICE SPREAD TREND
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#00FF88]" />
            <span className="font-mono text-[10px] font-medium text-[#8a8a8a]">
              SPREAD (bps)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-[#FF8800]" />
            <span className="font-mono text-[10px] font-medium text-[#8a8a8a]">
              THRESHOLD ({thresholdBps} bps)
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="min-h-0 flex-1 px-2 pb-2">
        {displayData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              Waiting for price data...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="spreadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00FF88" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#8a8a8a", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2f2f2f" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, Math.ceil(maxSpread / 10) * 10]}
                tick={{ fill: "#8a8a8a", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2f2f2f",
                  borderRadius: 0,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#8a8a8a" }}
                itemStyle={{ color: "#00FF88" }}
                formatter={(value: number | undefined) => [
                  value != null ? `${value.toFixed(2)} bps` : "—",
                  "Spread",
                ]}
              />
              <ReferenceLine
                y={thresholdBps}
                stroke="#FF8800"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `${thresholdBps} bps`,
                  position: "right",
                  fill: "#FF8800",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
              <Area
                type="monotone"
                dataKey="spread"
                stroke="#00FF88"
                strokeWidth={2}
                fill="url(#spreadGradient)"
                dot={false}
                activeDot={{ r: 3, fill: "#00FF88", stroke: "#0C0C0C", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
