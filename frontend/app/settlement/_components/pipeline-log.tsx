"use client";

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
    <div className="border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-[#8a8a8a]" />
          <div>
            <span className="font-sans text-base font-semibold text-white">
              ACTIVITY LOG
            </span>
            <p className="mt-0.5 font-mono text-[11px] text-[#8a8a8a]">
              Pipeline execution history
            </p>
          </div>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center justify-center p-2 text-[#8a8a8a] transition-colors hover:text-white"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="border-t border-[#2f2f2f] px-6 py-4">
        {logs.length === 0 ? (
          <span className="font-mono text-xs text-[#8a8a8a]">
            No activity yet. Use the controls above to get started.
          </span>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="py-0.5 font-mono text-[11px] text-[#8a8a8a]">
                {log}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
