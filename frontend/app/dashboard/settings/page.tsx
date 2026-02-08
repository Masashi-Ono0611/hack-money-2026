"use client";

import { useState, useEffect } from "react";
import { Wifi, Cpu, Link2, Copy, Check, Shield } from "lucide-react";
import { DEPLOYED, CHAIN_LABELS, type ChainKey } from "@/lib/chains";

const CONTRACT_NAMES = ["cpt", "hook", "oracle", "usdc", "poolManager", "stateView", "poolId"] as const;

const CONTRACT_LABELS: Record<string, string> = {
  cpt: "CPT Token",
  hook: "Hook",
  oracle: "Oracle",
  usdc: "USDC",
  poolManager: "Pool Manager",
  stateView: "State View",
  poolId: "Pool ID",
};

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-[#8a8a8a] transition-colors hover:text-white"
    >
      {copied ? <Check size={12} className="text-[#00FF88]" /> : <Copy size={12} />}
    </button>
  );
}

export default function SettingsPage() {
  const [networkOk, setNetworkOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settlement/chain-data")
      .then((r) => r.json())
      .then((d) => setNetworkOk(d.ok === true))
      .catch(() => setNetworkOk(false));
  }, []);

  const chains = Object.keys(DEPLOYED) as ChainKey[];

  return (
    <div className="flex flex-col gap-6 p-8 px-10">
      {/* Header */}
      <div>
        <h1 className="font-sans text-4xl font-bold tracking-tight text-white">
          SETTINGS
        </h1>
        <p className="mt-1.5 font-mono text-[13px] text-[#8a8a8a]">
          Deployment configuration and system information
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-4">
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-[#8a8a8a]" />
            <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
              NETWORK
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                networkOk === null
                  ? "animate-pulse bg-[#8a8a8a]"
                  : networkOk
                    ? "bg-[#00FF88]"
                    : "bg-[#FF4444]"
              }`}
            />
            <span
              className={`font-mono text-[13px] font-semibold ${
                networkOk === null
                  ? "text-[#8a8a8a]"
                  : networkOk
                    ? "text-[#00FF88]"
                    : "text-[#FF4444]"
              }`}
            >
              {networkOk === null
                ? "CHECKING..."
                : networkOk
                  ? "CONNECTED"
                  : "DISCONNECTED"}
            </span>
          </div>
        </div>

        <div className="border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-4">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-[#8a8a8a]" />
            <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
              YELLOW SDK
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF8800]" />
            <span className="font-mono text-[13px] font-semibold text-[#FF8800]">
              MOCK MODE
            </span>
          </div>
        </div>

        <div className="border border-[#2f2f2f] bg-[#0A0A0A] px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-[#8a8a8a]" />
            <span className="font-mono text-[11px] font-medium tracking-wider text-[#8a8a8a]">
              ACTIVE CHAINS
            </span>
          </div>
          <div className="mt-2">
            <span className="font-sans text-2xl font-bold text-white">
              {chains.length}
            </span>
            <span className="ml-2 font-mono text-[11px] text-[#8a8a8a]">
              TESTNETS
            </span>
          </div>
        </div>
      </div>

      {/* Environment */}
      <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
        <div className="flex items-center gap-2 px-6 py-4">
          <Shield size={14} className="text-[#8a8a8a]" />
          <div>
            <span className="font-sans text-base font-semibold text-white">
              ENVIRONMENT
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
              Runtime configuration (read-only)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px border-t border-[#2f2f2f] bg-[#2f2f2f]">
          <div className="bg-[#0A0A0A] px-6 py-4">
            <span className="font-mono text-[10px] text-[#8a8a8a]">
              USE_YELLOW_MOCK
            </span>
            <p className="mt-1 font-mono text-[13px] font-semibold text-[#FF8800]">
              true
            </p>
          </div>
          <div className="bg-[#0A0A0A] px-6 py-4">
            <span className="font-mono text-[10px] text-[#8a8a8a]">
              REFRESH INTERVAL
            </span>
            <p className="mt-1 font-mono text-[13px] font-semibold text-white">
              5,000ms
            </p>
          </div>
          <div className="bg-[#0A0A0A] px-6 py-4">
            <span className="font-mono text-[10px] text-[#8a8a8a]">
              PROJECT
            </span>
            <p className="mt-1 font-mono text-[13px] font-semibold text-white">
              Ghost Yield
            </p>
          </div>
        </div>
      </div>

      {/* Contract Addresses per Chain */}
      {chains.map((chainKey) => {
        const contracts = DEPLOYED[chainKey];
        return (
          <div key={chainKey} className="border border-[#2f2f2f] bg-[#0A0A0A]">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-2.5 w-2.5"
                  style={{
                    backgroundColor:
                      chainKey === "base-sepolia"
                        ? "#00FF88"
                        : "#FF8800",
                  }}
                />
                <span className="font-sans text-base font-semibold text-white">
                  {CHAIN_LABELS[chainKey]}
                </span>
              </div>
              <span className="bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
                DEPLOYED
              </span>
            </div>

            <div className="border-t border-[#2f2f2f]">
              {CONTRACT_NAMES.map((name) => {
                const addr = contracts[name as keyof typeof contracts];
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between border-b border-[#2f2f2f] px-6 py-3 last:border-b-0"
                  >
                    <span className="font-mono text-[11px] font-medium text-[#8a8a8a]">
                      {CONTRACT_LABELS[name] ?? name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-white">
                        {truncateAddress(addr)}
                      </span>
                      <CopyButton text={addr} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
