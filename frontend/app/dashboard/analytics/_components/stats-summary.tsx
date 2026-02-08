"use client";

import { TrendingUp, BarChart3, Activity, Percent } from "lucide-react";

interface StatsSummaryProps {
  totalProfit: number;
  sessionCount: number;
  avgSpreadBps: number;
  avgUtilization: number;
}

const CARDS = [
  {
    key: "profit",
    label: "TOTAL PROFIT",
    icon: TrendingUp,
    format: (v: number) => `$${v.toFixed(4)}`,
    unit: "USDC",
    color: "#00FF88",
  },
  {
    key: "sessions",
    label: "SESSIONS",
    icon: BarChart3,
    format: (v: number) => String(v),
    unit: "EXECUTED",
    color: "#6a9fff",
  },
  {
    key: "spread",
    label: "AVG SPREAD",
    icon: Activity,
    format: (v: number) => v.toFixed(1),
    unit: "BPS",
    color: "#FF8800",
  },
  {
    key: "utilization",
    label: "AVG UTILIZATION",
    icon: Percent,
    format: (v: number) => v.toFixed(1),
    unit: "%",
    color: "#00FF88",
  },
] as const;

export function StatsSummary({
  totalProfit,
  sessionCount,
  avgSpreadBps,
  avgUtilization,
}: StatsSummaryProps) {
  const values: Record<string, number> = {
    profit: totalProfit,
    sessions: sessionCount,
    spread: avgSpreadBps,
    utilization: avgUtilization,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = values[card.key] ?? 0;
        return (
          <div
            key={card.key}
            className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium tracking-wider text-[#a0a0a0]">
                {card.label}
              </span>
              <Icon size={14} style={{ color: card.color }} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-sans text-2xl font-bold"
                style={{ color: card.color }}
              >
                {card.format(value)}
              </span>
              <span className="font-mono text-[10px] text-[#a0a0a0]">
                {card.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
