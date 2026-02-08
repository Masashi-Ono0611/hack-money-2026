"use client";

import { Settings, Cpu } from "lucide-react";

export function DemoConfig() {
  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-4">
      <div className="flex items-center gap-2">
        <Settings size={14} className="text-[#a0a0a0]" />
        <span className="font-mono text-[11px] font-medium tracking-wider text-[#a0a0a0]">
          DEMO CONFIGURATION
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <span className="font-mono text-[10px] text-[#a0a0a0]">
              CHAIN A (BUY)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 w-2 bg-[#00FF88]" />
              <span className="font-mono text-[13px] font-semibold text-white">
                Base Sepolia
              </span>
            </div>
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#a0a0a0]">
              CHAIN B (SELL)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 w-2 bg-[#FF8800]" />
              <span className="font-mono text-[13px] font-semibold text-white">
                Unichain Sepolia
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <span className="font-mono text-[10px] text-[#a0a0a0]">MODE</span>
            <div className="mt-1 flex items-center gap-2">
              <Cpu size={12} className="text-[#FF8800]" />
              <span className="font-mono text-[13px] font-semibold text-[#FF8800]">
                MOCK
              </span>
            </div>
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#a0a0a0]">
              ENGINE
            </span>
            <div className="mt-1">
              <span className="font-mono text-[13px] font-semibold text-white">
                ArbitrageEngine v1
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
