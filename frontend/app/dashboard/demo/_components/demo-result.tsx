"use client";

import { TrendingUp, Layers, Clock } from "lucide-react";

interface DemoResultProps {
  profit: number;
  sessions: number;
  durationMs: number;
  mode: string;
}

export function DemoResult({ profit, sessions, durationMs, mode }: DemoResultProps) {
  return (
    <div className="rounded-xl border border-[#00FF8840] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-sans text-base font-semibold text-white">
          RESULT
        </span>
        <span className="bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
          {mode}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px border-t border-[#2f2f2f] bg-[#2f2f2f]">
        <div className="flex flex-col items-center justify-center bg-[#0A0A0A] px-4 py-4">
          <TrendingUp size={16} className="text-[#00FF88]" />
          <span className="mt-2 font-sans text-xl font-bold text-[#00FF88]">
            +${profit.toFixed(4)}
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-[#a0a0a0]">
            PROFIT (USDC)
          </span>
        </div>
        <div className="flex flex-col items-center justify-center bg-[#0A0A0A] px-4 py-4">
          <Layers size={16} className="text-[#6a9fff]" />
          <span className="mt-2 font-sans text-xl font-bold text-white">
            {sessions}
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-[#a0a0a0]">
            SESSIONS
          </span>
        </div>
        <div className="flex flex-col items-center justify-center bg-[#0A0A0A] px-4 py-4">
          <Clock size={16} className="text-[#FF8800]" />
          <span className="mt-2 font-sans text-xl font-bold text-white">
            {durationMs}ms
          </span>
          <span className="mt-0.5 font-mono text-[10px] text-[#a0a0a0]">
            DURATION
          </span>
        </div>
      </div>
    </div>
  );
}
