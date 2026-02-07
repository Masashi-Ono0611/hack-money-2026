"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      const data = await res.json();
      setStatus(data);
      if (data.ok) {
        onLog(
          `Yellow: connected=${data.connected}, auth=${data.authenticated}, channels=${data.channelCount}`,
        );
      } else {
        onLog(`Yellow: error - ${data.error}`);
      }
    } catch (err: any) {
      onLog(`Yellow: fetch failed - ${err.message}`);
      setStatus({ ok: false, connected: false, authenticated: false, channelCount: 0, balances: {}, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Yellow ClearNode</CardTitle>
          <CardDescription>State channel connection</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status ? (
          <p className="text-sm text-zinc-400">Click refresh to check status</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {status.connected ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={status.connected ? "default" : "destructive"}>
                {status.connected ? "Connected" : "Disconnected"}
              </Badge>
              {status.authenticated && (
                <Badge variant="secondary">Authenticated</Badge>
              )}
            </div>

            <div className="text-sm">
              <span className="text-zinc-500">Channels:</span>{" "}
              <span className="font-medium">{status.channelCount}</span>
            </div>

            {Object.keys(status.balances).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Balances
                </p>
                {Object.entries(status.balances).map(([asset, amount]) => (
                  <div key={asset} className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">{asset}</span>
                    <span className="font-mono font-medium">{amount}</span>
                  </div>
                ))}
              </div>
            )}

            {status.error && (
              <p className="text-xs text-red-500 break-all">{status.error}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
