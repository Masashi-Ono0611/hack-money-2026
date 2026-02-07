"use client";

import { useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "BUY" | "SELL" | "SESSION" | "PROFIT";
  message: string;
  detail?: string;
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: "1",
    timestamp: "15:42:01",
    type: "SESSION",
    message: "Session created",
    detail: "mock-session-abc123",
  },
  {
    id: "2",
    timestamp: "15:42:01",
    type: "BUY",
    message: "BUY CPT-A @ $0.9847",
    detail: "100 CPT on Base Sepolia",
  },
  {
    id: "3",
    timestamp: "15:42:02",
    type: "SELL",
    message: "SELL CPT-B @ $1.0213",
    detail: "100 CPT on Unichain Sepolia",
  },
  {
    id: "4",
    timestamp: "15:42:02",
    type: "PROFIT",
    message: "Session closed — Net P&L: +$3.66",
    detail: "2 orders, 1.2s duration",
  },
];

const TYPE_COLORS: Record<string, string> = {
  BUY: "text-[#00FF88]",
  SELL: "text-[#FF8800]",
  SESSION: "text-[#8a8a8a]",
  PROFIT: "text-[#00FF88]",
};

const TYPE_BG: Record<string, string> = {
  BUY: "bg-[#00FF8820]",
  SELL: "bg-[#FF880020]",
  SESSION: "bg-[#ffffff10]",
  PROFIT: "bg-[#00FF8820]",
};

export function SessionLog() {
  const [logs] = useState<LogEntry[]>(MOCK_LOGS);

  return (
    <div className="flex h-[300px] flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2f2f2f] px-5 py-4">
        <span className="font-sans text-base font-semibold text-white">
          SESSION LOG
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
            MOCK
          </span>
          <span className="font-mono text-[10px] text-[#8a8a8a]">
            {logs.length} entries
          </span>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-[10px] text-[#8a8a8a]">
                {log.timestamp}
              </span>
              <span
                className={`mt-0.5 inline-block px-1 py-0 font-mono text-[9px] font-bold ${TYPE_BG[log.type]} ${TYPE_COLORS[log.type]}`}
              >
                {log.type}
              </span>
              <div className="flex-1">
                <p className="font-mono text-[11px] font-medium text-white">
                  {log.message}
                </p>
                {log.detail && (
                  <p className="font-mono text-[10px] text-[#8a8a8a]">
                    {log.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
