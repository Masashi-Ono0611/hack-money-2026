"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface ChainSnapshot {
  chain: string;
  label: string;
  price: number | null;
}

interface Props {
  history: { timestamp: number; chains: ChainSnapshot[] }[];
}

const COLORS: Record<string, string> = {
  "Sepolia": "#6366f1",
  "Base Sepolia": "#f59e0b",
  "Unichain Sepolia": "#10b981",
};

export function PriceChart({ history }: Props) {
  const data = useMemo(() => {
    return history.map((snap) => {
      const point: Record<string, string | number | null> = {
        time: new Date(snap.timestamp).toLocaleTimeString(),
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <div>
            <CardTitle className="text-base">CPT Price History</CardTitle>
            <CardDescription>
              Price snapshots across chains (auto-refreshes)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <p className="text-sm text-zinc-400">
            Collecting data points... ({data.length}/2 minimum)
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#71717a" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#71717a"
                tickFormatter={(v: number) => v.toFixed(4)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
      </CardContent>
    </Card>
  );
}
