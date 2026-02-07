"use client";

import { Gauge } from "lucide-react";

interface ChainData {
  chain: string;
  label: string;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
}

interface Props {
  chains: ChainData[];
}

function tierBarColor(feeBps: number | null): string {
  if (feeBps === null) return "bg-[#8a8a8a]";
  if (feeBps <= 500) return "bg-[#00FF88]";
  if (feeBps >= 10000) return "bg-[#FF4444]";
  return "bg-[#FF8800]";
}

function tierBadge(feeBps: number | null): { bg: string; text: string } {
  if (feeBps === null) return { bg: "bg-[#ffffff10]", text: "text-[#8a8a8a]" };
  if (feeBps <= 500) return { bg: "bg-[#00FF8820]", text: "text-[#00FF88]" };
  if (feeBps >= 10000) return { bg: "bg-[#FF444420]", text: "text-[#FF4444]" };
  return { bg: "bg-[#FF880020]", text: "text-[#FF8800]" };
}

export function HookStatusCard({ chains }: Props) {
  return (
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4">
        <Gauge size={14} className="text-[#8a8a8a]" />
        <div>
          <span className="font-sans text-base font-semibold text-white">
            HOOK STATUS
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            L2 utilization rate → dynamic fee tier (UtilizationHook)
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="border-t border-[#2f2f2f] px-6 py-5">
        {chains.length === 0 ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            Load chain data first
          </span>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {chains.map((c) => {
              const badge = tierBadge(c.feeBps);
              return (
                <div key={c.chain} className="border border-[#2f2f2f] bg-[#0A0A0A] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
                      {c.label.toUpperCase()}
                    </span>
                    {c.fee && (
                      <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                        {c.fee.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {c.utilization !== null ? (
                    <>
                      <div className="mt-3 h-1.5 w-full overflow-hidden bg-[#1a1a1a]">
                        <div
                          className={`h-full transition-all ${tierBarColor(c.feeBps)}`}
                          style={{ width: `${c.utilization}%` }}
                        />
                      </div>
                      <p className="mt-2 font-mono text-[11px] text-[#8a8a8a]">
                        Utilization:{" "}
                        <span className="font-bold text-white">{c.utilization}%</span>
                        {c.utilization < 30 && " — idle, low fees"}
                        {c.utilization >= 70 && " — busy, high fees"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 font-mono text-[11px] text-[#8a8a8a]">
                      No oracle data
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
