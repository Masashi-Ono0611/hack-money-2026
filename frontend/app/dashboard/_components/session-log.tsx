"use client";

import { useEffect, useRef } from "react";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "BUY" | "SELL" | "SESSION" | "PROFIT" | "INFO" | "STEP";
  message: string;
  detail?: string;
}

const TYPE_COLORS: Record<string, string> = {
  BUY: "text-[#00FF88]",
  SELL: "text-[#FF8800]",
  SESSION: "text-[#8a8a8a]",
  PROFIT: "text-[#00FF88]",
  INFO: "text-[#6a9fff]",
  STEP: "text-white",
};

const TYPE_BG: Record<string, string> = {
  BUY: "bg-[#00FF8820]",
  SELL: "bg-[#FF880020]",
  SESSION: "bg-[#ffffff10]",
  PROFIT: "bg-[#00FF8820]",
  INFO: "bg-[#6a9fff20]",
  STEP: "bg-[#ffffff15]",
};

interface SessionLogProps {
  logs: LogEntry[];
  isRunning?: boolean;
}

export function SessionLog({ logs, isRunning }: SessionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-[300px] flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2f2f2f] px-5 py-4">
        <span className="font-sans text-base font-semibold text-white">
          SESSION LOG
        </span>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="inline-block animate-pulse bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
              RUNNING
            </span>
          )}
          <span className="inline-block bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
            MOCK
          </span>
          <span className="font-mono text-[10px] text-[#8a8a8a]">
            {logs.length} entries
          </span>
        </div>
      </div>

      {/* Log entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              Click RUN DEMO to start...
            </span>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
