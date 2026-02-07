"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import type { ChainPrice, PriceDataPoint } from "../_types";

interface MetricsRowProps {
  chainData: ChainPrice[];
  priceHistory: PriceDataPoint[];
}

function PriceCard({
  label,
  chainBadge,
  price,
  changePercent,
}: {
  label: string;
  chainBadge: string;
  price: number | null;
  changePercent: number;
}) {
  const isPositive = changePercent >= 0;
  return (
    <div className="flex flex-col gap-3 border border-[#2f2f2f] bg-[#0A0A0A] p-5">
      <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
        {label}
      </span>
      <span className="inline-block w-fit bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
        {chainBadge}
      </span>
      <span className="font-sans text-[28px] font-bold tracking-tight text-white">
        {price !== null ? `$${price.toFixed(4)}` : "—"}
      </span>
      <div className="flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp size={12} className="text-[#00FF88]" />
        ) : (
          <TrendingDown size={12} className="text-[#FF4444]" />
        )}
        <span
          className={`font-mono text-[11px] font-medium ${
            isPositive ? "text-[#00FF88]" : "text-[#FF4444]"
          }`}
        >
          {isPositive ? "+" : ""}
          {changePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function SpreadCard({
  spreadValue,
  spreadBps,
}: {
  spreadValue: number;
  spreadBps: number;
}) {
  const isOpportunity = spreadBps >= 50;
  return (
    <div
      className={`flex flex-col gap-3 border bg-[#0A0A0A] p-5 ${
        isOpportunity ? "border-[#00FF8840]" : "border-[#2f2f2f]"
      }`}
    >
      <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
        PRICE SPREAD
      </span>
      {isOpportunity && (
        <span className="inline-block w-fit bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
          ARBITRAGE OPPORTUNITY
        </span>
      )}
      <span className="font-sans text-4xl font-bold tracking-tight text-[#00FF88]">
        ${spreadValue.toFixed(4)}
      </span>
      <span className="font-mono text-[13px] font-semibold text-[#00FF88]">
        {spreadBps.toFixed(2)}% SPREAD
      </span>
    </div>
  );
}

function VaultCard() {
  return (
    <div className="flex flex-col gap-3 border border-[#2f2f2f] bg-[#0A0A0A] p-5">
      <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
        VAULT BALANCE
      </span>
      <span className="inline-block w-fit bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
        ARC OPERATOR VAULT
      </span>
      <span className="font-sans text-[28px] font-bold tracking-tight text-white">
        $12,847
      </span>
      <div className="flex items-center gap-1.5">
        <TrendingUp size={12} className="text-[#00FF88]" />
        <span className="font-mono text-[11px] font-medium text-[#00FF88]">
          +$1,240 TODAY
        </span>
      </div>
    </div>
  );
}

export function MetricsRow({ chainData, priceHistory }: MetricsRowProps) {
  const priceA = chainData[0]?.price ?? null;
  const priceB = chainData[1]?.price ?? null;

  // Calculate change percent from history
  const calcChange = (idx: number): number => {
    if (priceHistory.length < 2) return 0;
    const current = idx === 0 ? priceHistory.at(-1)?.priceA : priceHistory.at(-1)?.priceB;
    const prev = idx === 0 ? priceHistory[0]?.priceA : priceHistory[0]?.priceB;
    if (!current || !prev || prev === 0) return 0;
    return ((current - prev) / prev) * 100;
  };

  const avg = priceA && priceB ? (priceA + priceB) / 2 : 0;
  const spreadValue = priceA && priceB ? Math.abs(priceA - priceB) : 0;
  const spreadBps = avg > 0 ? (spreadValue / avg) * 10000 : 0;

  return (
    <div className="grid grid-cols-4 gap-3">
      <PriceCard
        label="CPT-A / USDC"
        chainBadge="BASE SEPOLIA"
        price={priceA}
        changePercent={calcChange(0)}
      />
      <PriceCard
        label="CPT-B / USDC"
        chainBadge="UNICHAIN SEPOLIA"
        price={priceB}
        changePercent={calcChange(1)}
      />
      <SpreadCard spreadValue={spreadValue} spreadBps={spreadBps / 100} />
      <VaultCard />
    </div>
  );
}
