import { useMemo } from "react";
import type { TelemetryLog } from "@/types/telemetry";

type HeatmapKey = {
  id: string;
  label: string;
};

const KEYBOARD_ROWS: HeatmapKey[][] = [
  [
    { id: "`", label: "`" },
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" },
    { id: "6", label: "6" },
    { id: "7", label: "7" },
    { id: "8", label: "8" },
    { id: "9", label: "9" },
    { id: "0", label: "0" },
    { id: "-", label: "-" },
    { id: "=", label: "=" },
    { id: "Backspace", label: "Bksp" },
  ],
  [
    { id: "Q", label: "Q" },
    { id: "W", label: "W" },
    { id: "E", label: "E" },
    { id: "R", label: "R" },
    { id: "T", label: "T" },
    { id: "Y", label: "Y" },
    { id: "U", label: "U" },
    { id: "I", label: "I" },
    { id: "O", label: "O" },
    { id: "P", label: "P" },
    { id: "[", label: "[" },
    { id: "]", label: "]" },
    { id: "\\", label: "\\" },
  ],
  [
    { id: "A", label: "A" },
    { id: "S", label: "S" },
    { id: "D", label: "D" },
    { id: "F", label: "F" },
    { id: "G", label: "G" },
    { id: "H", label: "H" },
    { id: "J", label: "J" },
    { id: "K", label: "K" },
    { id: "L", label: "L" },
    { id: ";", label: ";" },
    { id: "'", label: "'" },
    { id: "Enter", label: "Enter" },
  ],
  [
    { id: "Shift", label: "Shift" },
    { id: "Z", label: "Z" },
    { id: "X", label: "X" },
    { id: "C", label: "C" },
    { id: "V", label: "V" },
    { id: "B", label: "B" },
    { id: "N", label: "N" },
    { id: "M", label: "M" },
    { id: ",", label: "," },
    { id: ".", label: "." },
    { id: "/", label: "/" },
  ],
  [{ id: "Space", label: "Space" }],
];

const SHIFTED_KEY_ALIASES: Record<string, string> = {
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  "_": "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

const VALID_KEYS = new Set(KEYBOARD_ROWS.flat().map((key) => key.id));
const NEUTRAL_LATENCY_KEYS = new Set(["Backspace"]);

function normalizeKey(key: string) {
  if (key === " ") return "Space";
  if (key === "Enter" || key === "Backspace" || key === "Shift") return key;
  if (SHIFTED_KEY_ALIASES[key]) return SHIFTED_KEY_ALIASES[key];
  const normalized = key.length === 1 ? key.toUpperCase() : key;
  return VALID_KEYS.has(normalized) ? normalized : null;
}

function getKeyWidth(key: HeatmapKey) {
  if (key.id === "Space") return "w-[min(22rem,70vw)]";
  if (key.id === "Backspace" || key.id === "Enter" || key.id === "Shift") {
    return "w-[clamp(3.5rem,12vw,5.5rem)]";
  }
  return "w-[clamp(1.5rem,6vw,2.75rem)]";
}

export default function VirtualKeyboard({ logs }: { logs: TelemetryLog[] }) {
  // 1. Calculate average dwell time for each key
  const keyStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; avg: number }> =
      {};
    let maxDwell = 0;

    logs.forEach((log) => {
      const key = normalizeKey(log.key);
      if (!key) return;

      const dwell = log.dwellMs;
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
    if (NEUTRAL_LATENCY_KEYS.has(key)) {
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }

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
              key={key.id}
              className={`flex h-9 ${getKeyWidth(key)} items-center justify-center rounded-md border text-xs font-bold transition-all duration-300 sm:h-11 sm:text-sm ${getKeyColor(key.id)}`}
            >
              {key.label}
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
