import { useMemo } from "react";
import type { TelemetryLog } from "@/types/telemetry";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function VirtualKeyboard({ logs }: { logs: TelemetryLog[] }) {
  // 1. Calculate average dwell time for each key
  const keyStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; avg: number }> =
      {};
    let maxDwell = 0;

    logs.forEach((log) => {
      const key = log.key.toUpperCase();
      // Only track alphabet keys for the visualizer to keep it clean
      if (!/^[A-Z]$/.test(key)) return;

      const dwell = parseFloat(log.dwell);
      if (!stats[key]) stats[key] = { total: 0, count: 0, avg: 0 };

      stats[key].total += dwell;
      stats[key].count += 1;
      stats[key].avg = stats[key].total / stats[key].count;

      if (stats[key].avg > maxDwell) maxDwell = stats[key].avg;
    });

    return { stats, maxDwell };
  }, [logs]);

  // 2. Helper to get color based on latency (Green = Fast, Red = Slow)
  const getKeyColor = (key: string) => {
    const stat = keyStats.stats[key];
    if (!stat) return "bg-slate-800 text-slate-500 border-slate-800";

    const ratio = stat.avg / (keyStats.maxDwell || 1);

    if (ratio > 0.7) return "bg-red-500/80 text-white border-red-400/60 shadow-[0_0_15px_rgba(239,68,68,0.5)]";
    if (ratio > 0.4) return "bg-yellow-500/80 text-white border-yellow-400/60 shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    return "bg-green-500/80 text-white border-green-400/60 shadow-[0_0_15px_rgba(34,197,94,0.5)]";
  };

  return (
    <div className="flex w-full flex-col items-center gap-2 overflow-hidden">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full justify-center gap-1.5 sm:gap-2">
          {row.map((key) => (
            <div
              key={key}
              className={`flex h-9 w-[clamp(1.75rem,8vw,3rem)] items-center justify-center rounded-md border text-sm font-bold transition-all duration-300 sm:h-11 ${getKeyColor(key)}`}
            >
              {key}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-500/80"></span> Fast
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-yellow-500/80"></span> Average
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-500/80"></span> Slow
        </span>
      </div>
    </div>
  );
}
