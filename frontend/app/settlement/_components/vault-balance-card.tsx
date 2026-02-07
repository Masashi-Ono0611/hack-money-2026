"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vault, RefreshCw } from "lucide-react";

interface Props {
  onLog: (msg: string) => void;
}

interface VaultStatus {
  ok: boolean;
  balance: string | null;
  token: string | null;
  error?: string;
}

export function VaultBalanceCard({ onLog }: Props) {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    setLoading(true);
    onLog("Checking Arc vault balance...");
    try {
      const res = await fetch("/api/settlement/vault-balance");
      const data = await res.json();
      setStatus(data);
      if (data.ok && data.balance) {
        onLog(`Vault: ${data.balance} ${data.token ?? "USDC"}`);
      } else {
        onLog(`Vault: ${data.error ?? "no balance data"}`);
      }
    } catch (err: any) {
      onLog(`Vault: fetch failed - ${err.message}`);
      setStatus({ ok: false, balance: null, token: null, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Arc Vault</CardTitle>
          <CardDescription>Operator vault balance</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchBalance} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status ? (
          <p className="text-sm text-zinc-400">Click refresh to check balance</p>
        ) : status.ok && status.balance ? (
          <div className="flex items-center gap-3">
            <Vault className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-semibold font-mono tabular-nums">
                {status.balance}
              </p>
              <p className="text-xs text-zinc-500">{status.token ?? "USDC"}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-red-500 break-all">
            {status.error ?? "Could not fetch balance"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
