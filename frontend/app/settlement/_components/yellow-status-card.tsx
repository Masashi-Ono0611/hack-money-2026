"use client";

import { useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  onLog: (msg: string) => void;
}

interface YellowStatus {
  ok: boolean;
  connected: boolean;
  authenticated: boolean;
  channelCount: number;
  balances: Record<string, string>;
  error?: string;
}

export function YellowStatusCard({ onLog }: Props) {
  const [status, setStatus] = useState<YellowStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    onLog("Checking Yellow ClearNode connection...");
    try {
      const res = await fetch("/api/settlement/yellow-status");
      const data = (await res.json()) as YellowStatus;
      setStatus(data);
      if (data.ok) {
        onLog(
          `Yellow: connected=${data.connected}, auth=${data.authenticated}, channels=${data.channelCount}`,
        );
      } else {
        onLog(`Yellow: error - ${data.error}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      onLog(`Yellow: fetch failed - ${error.message}`);
      setStatus({ ok: false, connected: false, authenticated: false, channelCount: 0, balances: {}, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            YELLOW CLEARNODE
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
            State channel connection
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center justify-center border border-[#2f2f2f] bg-[#0A0A0A] p-2 text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 border-t border-[#2f2f2f] px-6 py-5">
        {!status ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            Click refresh to check status
          </span>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.connected ? (
                <Wifi size={14} className="text-[#00FF88]" />
              ) : (
                <WifiOff size={14} className="text-[#FF4444]" />
              )}
              <span
                className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  status.connected
                    ? "bg-[#00FF8820] text-[#00FF88]"
                    : "bg-[#FF444420] text-[#FF4444]"
                }`}
              >
                {status.connected ? "CONNECTED" : "DISCONNECTED"}
              </span>
              {status.authenticated && (
                <span className="bg-[#6a9fff20] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#6a9fff]">
                  AUTHENTICATED
                </span>
              )}
            </div>

            <div className="font-mono text-[11px] text-[#8a8a8a]">
              Channels:{" "}
              <span className="font-bold text-white">{status.channelCount}</span>
            </div>

            {Object.keys(status.balances).length > 0 && (
              <div className="space-y-1">
                <span className="font-mono text-[9px] font-bold tracking-wider text-[#8a8a8a]">
                  BALANCES
                </span>
                {Object.entries(status.balances).map(([asset, amount]) => (
                  <div key={asset} className="flex justify-between font-mono text-[11px]">
                    <span className="text-[#8a8a8a]">{asset}</span>
                    <span className="font-bold text-white">{amount}</span>
                  </div>
                ))}
              </div>
            )}

            {status.error && (
              <p className="break-all font-mono text-[11px] text-[#FF4444]">
                {status.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
