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
import { Separator } from "@/components/ui/separator";
import { Play, Loader2, ArrowRightLeft } from "lucide-react";

interface Props {
  onLog: (msg: string) => void;
}

interface SettleResult {
  ok: boolean;
  success: boolean;
  dryRun: boolean;
  sessionId: string;
  profit: string | null;
  transferAmount: string | null;
  transactionId: string | null;
  error?: string;
  raw?: string;
}

export function AutoSettleCard({ onLog }: Props) {
  const [sessionId, setSessionId] = useState("demo-session-001");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<SettleResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSettle = async () => {
    setLoading(true);
    setResult(null);
    onLog(`Running auto-settle (session=${sessionId}, dryRun=${dryRun})...`);
    try {
      const res = await fetch("/api/settlement/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, dryRun }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok && data.success) {
        onLog(
          `Settle ${data.dryRun ? "(DRY-RUN)" : ""}: profit=${data.profit ?? "?"} USDC, transfer=${data.transferAmount ?? "?"} USDC`,
        );
      } else {
        onLog(`Settle failed: ${data.error ?? "unknown"}`);
      }
    } catch (err: any) {
      onLog(`Settle: fetch failed - ${err.message}`);
      setResult({ ok: false, success: false, dryRun, sessionId, profit: null, transferAmount: null, transactionId: null, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Auto-Settle Pipeline</CardTitle>
            <CardDescription>
              Fetch Yellow profit → transfer to Arc vault
            </CardDescription>
          </div>
          <ArrowRightLeft className="h-5 w-5 text-zinc-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="sessionId" className="text-xs font-medium text-zinc-500">
              Session ID
            </label>
            <input
              id="sessionId"
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700"
              placeholder="e.g. demo-session-001"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded"
            />
            Dry run
          </label>
          <Button onClick={runSettle} disabled={loading || !sessionId}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {loading ? "Running..." : "Run"}
          </Button>
        </div>

        {result && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? "Success" : "Failed"}
                </Badge>
                {result.dryRun && <Badge variant="secondary">DRY-RUN</Badge>}
              </div>

              {result.profit && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-zinc-500">Net Profit</p>
                    <p className="font-mono font-medium">{result.profit} USDC</p>
                  </div>
                  {result.transferAmount && (
                    <div>
                      <p className="text-zinc-500">Transfer</p>
                      <p className="font-mono font-medium">{result.transferAmount} USDC</p>
                    </div>
                  )}
                </div>
              )}

              {result.transactionId && (
                <div className="text-sm">
                  <p className="text-zinc-500">Transaction ID</p>
                  <p className="font-mono text-xs break-all">{result.transactionId}</p>
                </div>
              )}

              {result.error && (
                <p className="text-xs text-red-500 break-all">{result.error}</p>
              )}

              {result.raw && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-zinc-400 hover:text-zinc-600">
                    Raw output
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-zinc-100 p-2 font-mono dark:bg-zinc-900">
                    {result.raw}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
