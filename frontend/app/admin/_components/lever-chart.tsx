"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

/* ────────────────────────────────────────────────────────────
 * Pure math helpers — no side effects, no state
 * ──────────────────────────────────────────────────────────── */

const FEE_MIN = 500; // 0.05 %  (bps)
const FEE_MAX = 10_000; // 1.00 %

/** Lever 1 – Supply cap (fraction of max capacity) */
function supplyFraction(u: number): number {
  return 1 - u;
}

/** Lever 2 – Liquidity depth multiplier */
function liquidityMultiplier(u: number): number {
  return (1 - u) ** 2;
}

/** Lever 3 – Dynamic fee in bps */
function feeBps(u: number): number {
  return FEE_MIN + (FEE_MAX - FEE_MIN) * u ** 2;
}

/** Convert bps → display % */
function bpsToPercent(bps: number): number {
  return bps / 100;
}

/* ────────────────────────────────────────────────────────────
 * Generate chart data for u = 0..100 (step 1)
 * ──────────────────────────────────────────────────────────── */

interface LeverDataPoint {
  utilization: number;
  supply: number;
  liquidity: number;
  feePct: number;
}

function generateCurveData(): LeverDataPoint[] {
  const points: LeverDataPoint[] = [];
  for (let i = 0; i <= 100; i += 1) {
    const u = i / 100;
    points.push({
      utilization: i,
      supply: Math.round(supplyFraction(u) * 100),
      liquidity: Math.round(liquidityMultiplier(u) * 100),
      feePct: Math.round(bpsToPercent(feeBps(u)) * 100) / 100,
    });
  }
  return points;
}

/* ────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────── */

interface LeverChartProps {
  /** Current utilization (0-100) from oracle. null = unknown */
  currentUtilization: number | null;
}

export function LeverChart({ currentUtilization }: LeverChartProps) {
  const data = useMemo(generateCurveData, []);

  const current = currentUtilization ?? null;

  /* Interpolated values at current utilization */
  const snapshot = useMemo(() => {
    if (current === null) return null;
    const u = Math.max(0, Math.min(current, 100)) / 100;
    return {
      supply: Math.round(supplyFraction(u) * 100),
      liquidity: Math.round(liquidityMultiplier(u) * 100),
      feePct: Math.round(bpsToPercent(feeBps(u)) * 100) / 100,
    };
  }, [current]);

  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Title */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            COMPUTE CENTRAL BANK — 3 LEVERS
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            Supply, liquidity depth, and fee as functions of L2 utilization
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Legend color="#00FF88" label="Supply %" />
          <Legend color="#3B82F6" label="Liquidity %" />
          <Legend color="#FF8800" label="Fee %" />
        </div>
      </div>

      {/* Live Snapshot */}
      {snapshot && current !== null && (
        <div className="mx-6 mb-2 grid grid-cols-4 gap-3 rounded-lg border border-[#1f1f1f] bg-[#080808] px-4 py-3">
          <SnapshotCell label="UTILIZATION (NOW)" value={`${current}%`} color="#a0a0a0" />
          <SnapshotCell label="MINTABLE SUPPLY" value={`${snapshot.supply}%`} color="#00FF88" />
          <SnapshotCell label="LIQUIDITY DEPTH" value={`${snapshot.liquidity}%`} color="#3B82F6" />
          <SnapshotCell label="SWAP FEE" value={`${snapshot.feePct}%`} color="#FF8800" />
        </div>
      )}

      {/* Chart */}
      <div className="border-t border-[#2f2f2f] px-6 py-5">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis
              dataKey="utilization"
              tick={{ fill: "#a0a0a0", fontSize: 10, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#2f2f2f" }}
              label={{
                value: "L2 Utilization (%)",
                position: "insideBottom",
                offset: -2,
                fill: "#666",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />

            {/* Left Y-axis: Supply & Liquidity (0-100 %) */}
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fill: "#a0a0a0", fontSize: 10, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#2f2f2f" }}
              label={{
                value: "Supply / Liquidity %",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "#666",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />

            {/* Right Y-axis: Fee (0-1.0 %) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 1]}
              tick={{ fill: "#a0a0a0", fontSize: 10, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "#2f2f2f" }}
              label={{
                value: "Fee %",
                angle: 90,
                position: "insideRight",
                offset: 10,
                fill: "#666",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />

            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid #2f2f2f",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 11,
              }}
              labelFormatter={(v) => `Utilization: ${v}%`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === "feePct") return [`${value}%`, "Fee"];
                if (name === "supply") return [`${value}%`, "Supply Cap"];
                if (name === "liquidity") return [`${value}%`, "Liquidity Depth"];
                return [value, name];
              }}
            />

            {/* Supply curve — linear decline */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="supply"
              stroke="#00FF88"
              strokeWidth={2}
              dot={false}
              name="supply"
            />

            {/* Liquidity curve — quadratic decline */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="liquidity"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="#3B82F6"
              fillOpacity={0.08}
              dot={false}
              name="liquidity"
            />

            {/* Fee curve — quadratic rise */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="feePct"
              stroke="#FF8800"
              strokeWidth={2}
              dot={false}
              name="feePct"
            />

            {/* Vertical reference line at current utilization */}
            {current !== null && (
              <ReferenceLine
                yAxisId="left"
                x={current}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: `NOW ${current}%`,
                  position: "top",
                  fill: "#ffffff",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Formula Reference */}
      <div className="border-t border-[#2f2f2f] px-6 py-3">
        <div className="grid grid-cols-3 gap-4">
          <FormulaCell
            color="#00FF88"
            label="Lever 1: Supply"
            formula="Mint = Capacity × (1 − u)"
            description="Backed by idle compute"
          />
          <FormulaCell
            color="#3B82F6"
            label="Lever 2: Liquidity"
            formula="Depth = Base × (1 − u)²"
            description="Quadratic scarcity curve"
          />
          <FormulaCell
            color="#FF8800"
            label="Lever 3: Fee"
            formula="Fee = 0.05% + 0.95% × u²"
            description="TCP-style congestion pricing"
          />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Sub-components
 * ──────────────────────────────────────────────────────────── */

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-[10px] font-medium text-[#a0a0a0]">{label}</span>
    </div>
  );
}

function SnapshotCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] font-semibold tracking-wider text-[#666]">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function FormulaCell({
  color,
  label,
  formula,
  description,
}: {
  color: string;
  label: string;
  formula: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="font-mono text-[10px] font-semibold text-white">{label}</p>
        <p className="font-mono text-[10px] text-[#a0a0a0]">{formula}</p>
        <p className="font-mono text-[9px] text-[#555]">{description}</p>
      </div>
    </div>
  );
}
