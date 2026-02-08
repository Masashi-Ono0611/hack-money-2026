"use client";

import { useState, useCallback, useEffect } from "react";
import { Play, Square, History } from "lucide-react";
import { DemoConfig } from "./_components/demo-config";
import { StepTimeline } from "./_components/step-timeline";
import { DemoResult } from "./_components/demo-result";

interface DemoStep {
  step: number;
  label: string;
  status: "done" | "skipped" | "failed";
  detail?: string;
  durationMs: number;
}

interface DemoRunResult {
  ok: boolean;
  steps: DemoStep[];
  totalProfitUsdc: number;
  sessionsExecuted: number;
  totalDurationMs: number;
  yellowMode: "MOCK" | "LIVE";
}

interface HistoryEntry {
  timestamp: number;
  profit: number;
  sessions: number;
  durationMs: number;
}

export default function DemoPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<DemoRunResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ghost-yield-demo-history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries);
    try {
      localStorage.setItem("ghost-yield-demo-history", JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, []);

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setSteps([]);
    setResult(null);
    setCurrentStep(1);

    try {
      const res = await fetch("/api/demo/run", { method: "POST" });
      const data: DemoRunResult = await res.json();

      if (!data.ok) {
        setIsRunning(false);
        return;
      }

      // Animate steps one by one
      for (const step of data.steps) {
        setCurrentStep(step.step);
        await new Promise((r) => setTimeout(r, 500));
        setSteps((prev) => [...prev, step]);
      }

      setResult(data);

      // Save to history
      const entry: HistoryEntry = {
        timestamp: Date.now(),
        profit: data.totalProfitUsdc,
        sessions: data.sessionsExecuted,
        durationMs: data.totalDurationMs,
      };
      saveHistory([...history, entry]);
    } catch {
      // error handled silently
    }

    setCurrentStep(0);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl sm:text-4xl font-bold tracking-tight text-white">
            DEMO
          </h1>
          <p className="mt-1.5 font-mono text-[13px] text-[#a0a0a0]">
            Execute simulated cross-chain arbitrage
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00FF88] focus-visible:outline-none disabled:opacity-60 ${
            isRunning
              ? "bg-[#FF8800] text-[#0C0C0C]"
              : "bg-[#00FF88] text-[#0C0C0C]"
          }`}
        >
          {isRunning ? <Square size={14} /> : <Play size={14} />}
          {isRunning ? "RUNNING..." : "RUN DEMO"}
        </button>
      </div>

      {/* Config + Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
          <DemoConfig />
          {result && (
            <DemoResult
              profit={result.totalProfitUsdc}
              sessions={result.sessionsExecuted}
              durationMs={result.totalDurationMs}
              mode={result.yellowMode}
            />
          )}
        </div>
        <div className="col-span-1 md:col-span-3">
          <StepTimeline
            steps={steps}
            isRunning={isRunning}
            currentStep={currentStep}
          />
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
        <div className="flex items-center gap-2 px-6 py-4">
          <History size={14} className="text-[#a0a0a0]" />
          <div>
            <span className="font-sans text-base font-semibold text-white">
              EXECUTION HISTORY
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
              Past demo runs (stored in browser)
            </p>
          </div>
        </div>
        <div className="border-t border-[#2f2f2f]">
          {history.length === 0 ? (
            <div className="flex h-[80px] items-center justify-center">
              <span className="font-mono text-xs text-[#a0a0a0]">
                No runs yet — click RUN DEMO to start
              </span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2f2f2f]">
                  <th className="px-6 py-3 text-left font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    #
                  </th>
                  <th className="px-6 py-3 text-left font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    TIMESTAMP
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    PROFIT
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    SESSIONS
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-medium tracking-wider text-[#a0a0a0]">
                    DURATION
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#2f2f2f] last:border-b-0"
                  >
                    <td className="px-6 py-3 font-mono text-[11px] text-[#a0a0a0]">
                      {history.length - i}
                    </td>
                    <td className="px-6 py-3 font-mono text-[11px] text-white">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] font-semibold text-[#00FF88]">
                      +${entry.profit.toFixed(4)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] text-white">
                      {entry.sessions}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-[11px] text-[#a0a0a0]">
                      {entry.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
