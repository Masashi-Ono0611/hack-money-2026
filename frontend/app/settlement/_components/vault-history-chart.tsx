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

export interface VaultSnapshot {
  timestamp: number;
  balance: number;
}

interface Props {
  history: VaultSnapshot[];
}

export function VaultHistoryChart({ history }: Props) {
  const data = useMemo(() => {
    return history.map((s) => ({
      time: new Date(s.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      balance: s.balance,
    }));
  }, [history]);

  return (
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            VAULT BALANCE HISTORY
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            Operator vault USDC balance over time
          </p>
        </div>
        <span className="font-mono text-[10px] text-[#8a8a8a]">
          {history.length} snapshots
        </span>
      </div>

      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {data.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              Waiting for first vault snapshot...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="vaultGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "monospace" }}
                stroke="#2f2f2f"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8a8a8a", fontFamily: "monospace" }}
                stroke="#2f2f2f"
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
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
                formatter={(value: number | undefined) => value != null ? [`$${value.toFixed(6)} USDC`, "Balance"] : ["—", "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#00FF88"
                strokeWidth={2}
                fill="url(#vaultGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
