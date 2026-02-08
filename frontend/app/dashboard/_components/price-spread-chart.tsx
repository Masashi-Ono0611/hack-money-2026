"use client";

import type { PriceDataPoint } from "../_types";

interface PriceSpreadChartProps {
  priceHistory: PriceDataPoint[];
}

export function PriceSpreadChart({ priceHistory }: PriceSpreadChartProps) {
  // Normalize bar heights based on max price
  const maxPrice = Math.max(
    ...priceHistory.map((p) => Math.max(p.priceA ?? 0, p.priceB ?? 0)),
    1,
  );

  // Show last 8 data points for the bar chart
  const displayData = priceHistory.slice(-8);

  return (
    <div className="flex h-[300px] flex-col border border-[#2f2f2f] bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5">
        <span className="font-sans text-base font-semibold text-white">
          PRICE SPREAD TREND
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#00FF88]" />
            <span className="font-mono text-[10px] font-medium text-[#8a8a8a]">
              CPT-A
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 bg-[#FF8800]" />
            <span className="font-mono text-[10px] font-medium text-[#8a8a8a]">
              CPT-B
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative min-h-0 flex-1 border-t border-[#2f2f2f] px-6 pb-5 pt-4">
        {displayData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-xs text-[#8a8a8a]">
              Waiting for price data...
            </span>
          </div>
        ) : (
          <div className="flex h-full items-end gap-2">
            {displayData.map((point, i) => {
              const barMax = 140; // max bar height in px
              const hA = point.priceA
                ? Math.max(Math.round((point.priceA / maxPrice) * barMax), 6)
                : 0;
              const hB = point.priceB
                ? Math.max(Math.round((point.priceB / maxPrice) * barMax), 6)
                : 0;
              const time = new Date(point.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const opacity = 0.4 + (i / displayData.length) * 0.5;

              return (
                <div
                  key={point.timestamp}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div className="flex w-full items-end justify-center gap-0.5">
                    <div
                      className="flex-1"
                      style={{
                        height: `${hA}px`,
                        backgroundColor: `rgba(0, 255, 136, ${opacity})`,
                      }}
                    />
                    <div
                      className="flex-1"
                      style={{
                        height: `${hB}px`,
                        backgroundColor: `rgba(255, 136, 0, ${opacity})`,
                      }}
                    />
                  </div>
                  <span className="mt-2 shrink-0 font-mono text-[10px] font-medium text-[#8a8a8a]">
                    {time}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
