"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  logs: string[];
  onClear: () => void;
}

export function PipelineLog({ logs, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-zinc-400" />
          <div>
            <CardTitle className="text-base">Activity Log</CardTitle>
            <CardDescription>Pipeline execution history</CardDescription>
          </div>
        </div>
        {logs.length > 0 && (
          <Button variant="ghost" size="icon" onClick={onClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No activity yet. Use the controls above to get started.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-900">
            {logs.map((log, i) => (
              <div key={i} className="text-zinc-600 dark:text-zinc-400">
                {log}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
