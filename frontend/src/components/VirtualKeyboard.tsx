import { useMemo } from "react";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export default function VirtualKeyboard({ logs }: { logs: any[] }) {
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
    if (!stat) return "bg-slate-800 text-slate-500"; // Untyped keys

    // Normalize between 0 and 1
    const ratio = stat.avg / (keyStats.maxDwell || 1);

    // Simple gradient: Fast (< 0.5) is green, Slow (> 0.5) is red/orange
    if (ratio > 0.7)
      return "bg-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]";
    if (ratio > 0.4)
      return "bg-yellow-500/80 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    return "bg-green-500/80 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]";
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
      <h3 className="text-xs text-slate-500 uppercase tracking-widest w-full text-left mb-2">
        Latency Heatmap
      </h3>

      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {row.map((key) => (
            <div
              key={key}
              className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded font-bold text-sm transition-all duration-300 ${getKeyColor(key)}`}
            >
              {key}
            </div>
          ))}
        </div>
      ))}

      <div className="flex gap-4 text-xs text-slate-500 mt-4">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500/80 rounded"></div> Fast
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500/80 rounded"></div> Average
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500/80 rounded"></div> Slow
        </span>
      </div>
    </div>
  );
}
