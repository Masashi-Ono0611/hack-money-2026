"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChainSnapshot {
  chain: string;
  label: string;
  price: number | null;
}

interface Props {
  history: { timestamp: number; chains: ChainSnapshot[] }[];
}

const COLORS: Record<string, string> = {
  "Sepolia": "#6a9fff",
  "Base Sepolia": "#00FF88",
  "Unichain Sepolia": "#FF8800",
};

export function PriceChart({ history }: Props) {
  const data = useMemo(() => {
    return history.map((snap) => {
      const point: Record<string, string | number | null> = {
        time: new Date(snap.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      for (const c of snap.chains) {
        point[c.label] = c.price;
      }
      return point;
    });
  }, [history]);

  const labels = useMemo(() => {
    if (history.length === 0) return [];
    return history[0].chains.map((c) => c.label);
  }, [history]);

  return (
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            CPT PRICE HISTORY
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Price snapshots across chains (auto-refreshes)
          </p>
        </div>
        <div className="flex items-center gap-4">
          {labels.map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2"
                style={{ backgroundColor: COLORS[label] ?? "#888" }}
              />
              <span className="font-mono text-[10px] font-medium text-[#8a8a8a]">
                {label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {data.length < 2 ? (
          <div className="flex h-[200px] items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              Collecting data points... ({data.length}/2 minimum)
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "monospace" }}
                stroke="#2f2f2f"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "monospace" }}
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
              {labels.map((label) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={COLORS[label] ?? "#888"}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
