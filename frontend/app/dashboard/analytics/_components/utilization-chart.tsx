"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChainPrice } from "../../_types";

interface UtilizationChartProps {
  chainData: ChainPrice[];
}

const COLORS = ["#6a9fff", "#00FF88", "#FF8800"];

export function UtilizationChart({ chainData }: UtilizationChartProps) {
  const data = useMemo(() => {
    return chainData.map((c) => ({
      name: c.label,
      utilization: c.utilization ?? 0,
      fee: c.feeBps ?? 0,
    }));
  }, [chainData]);

  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            CHAIN UTILIZATION
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            Pool utilization rate per chain
          </p>
        </div>
        <div className="flex items-center gap-4">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="font-mono text-[10px] font-medium text-[#a0a0a0]">
                {d.name.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {data.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <span className="font-mono text-xs text-[#a0a0a0]">
              Waiting for chain data...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="name"
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
                tickFormatter={(v: number) => `${v}%`}
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
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, "Utilization"]}
              />
              <Bar dataKey="utilization" radius={[2, 2, 0, 0]}>
                {data.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
