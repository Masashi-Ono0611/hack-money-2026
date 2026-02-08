"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RefreshCw, Radio, Gauge, Droplets, Send } from "lucide-react";

interface PoolChain {
  chain: string;
  label: string;
  price: number | null;
  tick: number | null;
  liquidity: string;
  sqrtPriceX96: string | null;
  utilization: number | null;
  oracleUpdatedAt: number | null;
  oracleStale: boolean | null;
  oracleSource: number | null;
  cpt: string;
  usdc: string;
  oracle: string;
  hook: string;
  poolId: string;
  poolManager: string;
  error: string | null;
}

export default function AdminPage() {
  const [chains, setChains] = useState<PoolChain[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [oracleValues, setOracleValues] = useState<Record<string, string>>({});
  const [oracleSubmitting, setOracleSubmitting] = useState<Record<string, boolean>>({});
  const [oracleResults, setOracleResults] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPoolState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pool-state");
      const data = await res.json();
      if (data.ok) setChains(data.chains);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPoolState();
    intervalRef.current = setInterval(fetchPoolState, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPoolState]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPoolState();
    setIsRefreshing(false);
  };

  const handleOracleUpdate = async (chain: string) => {
    const val = parseInt(oracleValues[chain] ?? "");
    if (isNaN(val) || val < 0 || val > 100) {
      setOracleResults((p) => ({ ...p, [chain]: "Value must be 0-100" }));
      return;
    }
    setOracleSubmitting((p) => ({ ...p, [chain]: true }));
    setOracleResults((p) => ({ ...p, [chain]: "" }));

    try {
      const res = await fetch("/api/admin/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, utilization: val }),
      });
      const data = await res.json();
      if (data.ok) {
        setOracleResults((p) => ({
          ...p,
          [chain]: `Updated to ${val}% (tx: ${data.txHash?.slice(0, 14)}...)`,
        }));
        await fetchPoolState();
      } else {
        setOracleResults((p) => ({ ...p, [chain]: `Error: ${data.error}` }));
      }
    } catch (err) {
      setOracleResults((p) => ({
        ...p,
        [chain]: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    } finally {
      setOracleSubmitting((p) => ({ ...p, [chain]: false }));
    }
  };

  const sourceLabel = (s: number | null) => {
    if (s === 1) return "BOT";
    if (s === 2) return "FUNCTIONS";
    return "UNKNOWN";
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleTimeString();
  };

  return (
    <div className="flex flex-col gap-6 p-8 px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-4xl font-bold tracking-tight text-white">
            L2 ADMIN
          </h1>
          <p className="mt-1.5 font-mono text-[13px] text-[#8a8a8a]">
            Manage CPT pools, oracle utilization, and chain configuration
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 border border-[#2f2f2f] bg-[#0A0A0A] px-4 py-2.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {/* Pool Cards */}
      {chains.map((c) => (
        <div
          key={c.chain}
          className="border border-[#2f2f2f] bg-[#0A0A0A] p-6"
        >
          {/* Chain Header */}
          <div className="mb-5 flex items-center gap-3">
            <Radio size={18} className="text-[#00FF88]" />
            <h2 className="font-mono text-lg font-bold text-white">
              {c.label}
            </h2>
            <span className="font-mono text-[11px] text-[#8a8a8a]">
              {c.chain}
            </span>
          </div>

          {/* Pool State Grid */}
          <div className="mb-5 grid grid-cols-4 gap-4">
            <MetricBox
              label="PRICE"
              value={c.price ? `$${c.price.toFixed(6)}` : "N/A"}
              sub="USDC/CPT"
            />
            <MetricBox
              label="TICK"
              value={c.tick?.toString() ?? "N/A"}
              sub=""
            />
            <MetricBox
              label="LIQUIDITY"
              value={
                c.liquidity === "0"
                  ? "0"
                  : BigInt(c.liquidity) > 10n ** 18n
                    ? `${(Number(BigInt(c.liquidity)) / 1e18).toFixed(2)} (×10¹⁸)`
                    : c.liquidity
              }
              sub={c.liquidity === "0" ? "NO LIQUIDITY" : ""}
              alert={c.liquidity === "0"}
            />
            <MetricBox
              label="UTILIZATION"
              value={c.utilization !== null ? `${c.utilization}%` : "N/A"}
              sub={c.oracleStale ? "STALE" : "FRESH"}
              alert={c.oracleStale === true}
            />
          </div>

          {/* Oracle Details */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="border border-[#1f1f1f] bg-[#080808] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gauge size={14} className="text-[#00FF88]" />
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#8a8a8a]">
                  ORACLE STATUS
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#8a8a8a]">Source</span>
                  <span className="text-white">
                    {sourceLabel(c.oracleSource)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a8a8a]">Updated At</span>
                  <span className="text-white">
                    {formatTime(c.oracleUpdatedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8a8a8a]">Stale</span>
                  <span
                    className={
                      c.oracleStale ? "text-[#FF4444]" : "text-[#00FF88]"
                    }
                  >
                    {c.oracleStale ? "YES" : "NO"}
                  </span>
                </div>
              </div>
            </div>

            {/* Oracle Update Form */}
            <div className="border border-[#1f1f1f] bg-[#080808] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Send size={14} className="text-[#00FF88]" />
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#8a8a8a]">
                  SET UTILIZATION
                </span>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block font-mono text-[10px] text-[#8a8a8a]">
                    VALUE (0-100%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={oracleValues[c.chain] ?? ""}
                    onChange={(e) =>
                      setOracleValues((p) => ({
                        ...p,
                        [c.chain]: e.target.value,
                      }))
                    }
                    placeholder={String(c.utilization ?? 50)}
                    className="w-full border border-[#2f2f2f] bg-[#0C0C0C] px-3 py-2 font-mono text-[13px] text-white placeholder:text-[#555] focus:border-[#00FF88] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleOracleUpdate(c.chain)}
                  disabled={oracleSubmitting[c.chain]}
                  className="flex items-center gap-1.5 bg-[#00FF88] px-4 py-2 font-mono text-[11px] font-bold text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {oracleSubmitting[c.chain] ? "..." : "UPDATE"}
                </button>
              </div>
              {oracleResults[c.chain] && (
                <p
                  className={`mt-2 font-mono text-[11px] ${
                    oracleResults[c.chain].startsWith("Error")
                      ? "text-[#FF4444]"
                      : "text-[#00FF88]"
                  }`}
                >
                  {oracleResults[c.chain]}
                </p>
              )}
            </div>
          </div>

          {/* Contract Addresses */}
          <details className="group">
            <summary className="cursor-pointer font-mono text-[11px] font-semibold tracking-wider text-[#8a8a8a] transition-colors hover:text-white">
              <Droplets size={12} className="mr-1.5 inline" />
              CONTRACT ADDRESSES
            </summary>
            <div className="mt-3 space-y-1 border-t border-[#1f1f1f] pt-3 font-mono text-[11px]">
              {[
                ["CPT", c.cpt],
                ["USDC", c.usdc],
                ["Oracle", c.oracle],
                ["Hook", c.hook],
                ["Pool Manager", c.poolManager],
                ["Pool ID", c.poolId],
              ].map(([label, addr]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[#8a8a8a]">{label}</span>
                  <span className="text-[#666]">{addr}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      ))}

      {chains.length === 0 && (
        <div className="border border-[#2f2f2f] bg-[#0A0A0A] p-12 text-center">
          <p className="font-mono text-[13px] text-[#8a8a8a]">
            Loading pool state...
          </p>
        </div>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className="border border-[#1f1f1f] bg-[#080808] p-3">
      <p className="font-mono text-[10px] font-semibold tracking-wider text-[#8a8a8a]">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold text-white">{value}</p>
      {sub && (
        <p
          className={`font-mono text-[10px] ${
            alert ? "text-[#FF4444]" : "text-[#8a8a8a]"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
