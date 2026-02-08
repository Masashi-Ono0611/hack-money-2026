"use client";

import {
  Settings,
  Cpu,
  DollarSign,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  SkipForward,
  XCircle,
} from "lucide-react";

interface DemoStep {
  step: number;
  label: string;
  status: "done" | "skipped" | "failed";
  detail?: string;
  durationMs: number;
}

interface StepTimelineProps {
  steps: DemoStep[];
  isRunning: boolean;
  currentStep: number;
}

const STEP_ICONS = [Settings, Cpu, DollarSign, ArrowLeftRight, CheckCircle2];

function StatusBadge({ status }: { status: DemoStep["status"] | "pending" | "running" }) {
  switch (status) {
    case "done":
      return (
        <span className="flex items-center gap-1 bg-[#00FF8820] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#00FF88]">
          <CheckCircle2 size={10} />
          DONE
        </span>
      );
    case "skipped":
      return (
        <span className="flex items-center gap-1 bg-[#FF880020] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF8800]">
          <SkipForward size={10} />
          SKIPPED
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 bg-[#FF444420] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#FF4444]">
          <XCircle size={10} />
          FAILED
        </span>
      );
    case "running":
      return (
        <span className="flex items-center gap-1 bg-[#6a9fff20] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#6a9fff]">
          <Loader2 size={10} className="animate-spin" />
          RUNNING
        </span>
      );
    default:
      return (
        <span className="bg-[#ffffff10] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#a0a0a0]">
          PENDING
        </span>
      );
  }
}

export function StepTimeline({ steps, isRunning, currentStep }: StepTimelineProps) {
  const allSteps = [
    "Load Configuration",
    "Initialize Components",
    "Fetch Current Prices",
    "Execute Arbitrage",
    "Settlement",
  ];

  return (
    <div className="rounded-xl border border-[#2f2f2f] bg-[#0A0A0A]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="font-sans text-base font-semibold text-white">
            EXECUTION PIPELINE
          </span>
          <p className="mt-0.5 font-mono text-[11px] text-[#a0a0a0]">
            5-step arbitrage pipeline
          </p>
        </div>
        {isRunning && (
          <span className="flex items-center gap-1.5 bg-[#6a9fff20] px-2 py-1 font-mono text-[9px] font-bold text-[#6a9fff]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6a9fff]" />
            EXECUTING
          </span>
        )}
      </div>

      <div className="border-t border-[#2f2f2f] px-6 py-4">
        <div className="space-y-0">
          {allSteps.map((label, idx) => {
            const stepNum = idx + 1;
            const Icon = STEP_ICONS[idx];
            const completed = steps.find((s) => s.step === stepNum);

            let status: DemoStep["status"] | "pending" | "running" = "pending";
            if (completed) {
              status = completed.status;
            } else if (isRunning && stepNum === currentStep) {
              status = "running";
            }

            const isLast = idx === allSteps.length - 1;

            return (
              <div key={stepNum} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center border ${
                      completed
                        ? "border-[#00FF8840] bg-[#00FF8810]"
                        : status === "running"
                          ? "border-[#6a9fff40] bg-[#6a9fff10]"
                          : "border-[#2f2f2f] bg-[#0A0A0A]"
                    }`}
                  >
                    <Icon
                      size={13}
                      className={
                        completed
                          ? "text-[#00FF88]"
                          : status === "running"
                            ? "text-[#6a9fff]"
                            : "text-[#a0a0a0]"
                      }
                    />
                  </div>
                  {!isLast && (
                    <div
                      className={`h-8 w-px ${
                        completed ? "bg-[#00FF8840]" : "bg-[#2f2f2f]"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-medium text-[#a0a0a0]">
                      STEP {stepNum}
                    </span>
                    <StatusBadge status={status} />
                    {completed && (
                      <span className="font-mono text-[9px] text-[#a0a0a0]">
                        {completed.durationMs}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[12px] font-semibold text-white">
                    {label}
                  </p>
                  {completed?.detail && (
                    <p className="mt-0.5 font-mono text-[10px] text-[#a0a0a0]">
                      {completed.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
