"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "lucide-react";

interface ChainData {
  chain: string;
  label: string;
  utilization: number | null;
  fee: string | null;
  feeBps: number | null;
}

interface Props {
  chains: ChainData[];
}

function tierColor(feeBps: number | null): string {
  if (feeBps === null) return "bg-zinc-200 dark:bg-zinc-700";
  if (feeBps <= 500) return "bg-emerald-500";
  if (feeBps >= 10000) return "bg-red-500";
  return "bg-amber-500";
}

function tierVariant(feeBps: number | null): "default" | "secondary" | "destructive" {
  if (feeBps === null) return "secondary";
  if (feeBps <= 500) return "default";
  if (feeBps >= 10000) return "destructive";
  return "secondary";
}

export function HookStatusCard({ chains }: Props) {
  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-zinc-400" />
          <div>
            <CardTitle className="text-base">Hook Status</CardTitle>
            <CardDescription>
              L2 utilization rate &rarr; dynamic fee tier (UtilizationHook)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chains.length === 0 ? (
          <p className="text-sm text-zinc-400">Load chain data first</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {chains.map((c) => (
              <div key={c.chain} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.label}</span>
                  {c.fee && (
                    <Badge variant={tierVariant(c.feeBps)} className="text-[10px]">
                      {c.fee}
                    </Badge>
                  )}
                </div>

                {c.utilization !== null ? (
                  <>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all ${tierColor(c.feeBps)}`}
                        style={{ width: `${c.utilization}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Utilization: <span className="font-mono font-medium">{c.utilization}%</span>
                      {c.utilization < 30 && " — idle, low fees attract arbitrage"}
                      {c.utilization >= 70 && " — busy, high fees protect LPs"}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-zinc-400">No oracle data</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
