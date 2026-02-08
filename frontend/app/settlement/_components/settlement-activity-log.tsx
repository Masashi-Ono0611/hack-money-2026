"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { explorerTxUrl, truncateTxHash } from "@/lib/utils";

export interface SettlementLogEntry {
  id: string;
  timestamp: string;
  type: "SETTLE" | "VAULT" | "INFO" | "ERROR";
  message: string;
  txHash?: string;
  chain?: string;
}

const TYPE_COLORS: Record<string, string> = {
  SETTLE: "text-[#00FF88]",
  VAULT: "text-[#6a9fff]",
  INFO: "text-[#8a8a8a]",
  ERROR: "text-[#FF4444]",
};

const TYPE_BG: Record<string, string> = {
  SETTLE: "bg-[#00FF8820]",
  VAULT: "bg-[#6a9fff20]",
  INFO: "bg-[#ffffff10]",
  ERROR: "bg-[#FF444420]",
};

interface Props {
  logs: SettlementLogEntry[];
}

export function SettlementActivityLog({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-[300px] flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between border-b border-[#2f2f2f] px-5 py-4">
        <span className="font-sans text-base font-semibold text-white">
          ACTIVITY LOG
        </span>
        <span className="font-mono text-[10px] text-[#8a8a8a]">
          {logs.length} entries
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              No settlement activity yet...
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[#8a8a8a]">
                  {log.timestamp}
                </span>
                <span
                  className={`mt-0.5 shrink-0 px-1 py-0 font-mono text-[9px] font-bold ${TYPE_BG[log.type]} ${TYPE_COLORS[log.type]}`}
                >
                  {log.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-medium text-white">
                    {log.message}
                  </p>
                  {log.txHash && (
                    <a
                      href={explorerTxUrl(log.chain ?? "arc-testnet", log.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-[#6a9fff] transition-colors hover:text-[#00FF88]"
                    >
                      <ExternalLink size={10} />
                      {truncateTxHash(log.txHash)}
                    </a>
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
