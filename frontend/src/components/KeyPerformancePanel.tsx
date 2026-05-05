type KeystrokeEntry = {
  key: string;
  dwell_time: number;
  flight_time?: number;
  is_correct?: boolean | null;
};

export type KeyedTelemetrySession = {
  keystroke_data?: KeystrokeEntry[];
};

type KeySummary = {
  key: string;
  count: number;
  averageDwell: number;
  accuracy: number | null;
  level: "good" | "average" | "bad";
};

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
const NEUTRAL_PERFORMANCE_KEYS = new Set(["Backspace"]);

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

function buildKeyInsights(sessions: KeyedTelemetrySession[]) {
  const rawStats: Record<
    string,
    { totalDwell: number; count: number; correct: number; accuracySamples: number }
  > = {};
  let totalDwell = 0;
  let totalKeys = 0;

  sessions.forEach((session) => {
    session.keystroke_data?.forEach((entry) => {
      const key = normalizeKey(entry.key);
      if (!key) return;

      rawStats[key] ??= {
        totalDwell: 0,
        count: 0,
        correct: 0,
        accuracySamples: 0,
      };

      rawStats[key].totalDwell += entry.dwell_time;
      rawStats[key].count += 1;
      totalDwell += entry.dwell_time;
      totalKeys += 1;

      if (entry.is_correct !== null && entry.is_correct !== undefined) {
        rawStats[key].accuracySamples += 1;
        if (entry.is_correct) rawStats[key].correct += 1;
      }
    });
  });

  const globalAverageDwell = totalKeys > 0 ? totalDwell / totalKeys : 0;
  const summaries = Object.fromEntries(
    Object.entries(rawStats).map(([key, stat]) => {
      const averageDwell = stat.totalDwell / stat.count;
      const accuracy =
        stat.accuracySamples > 0 ? (stat.correct / stat.accuracySamples) * 100 : null;
      const level =
        (accuracy !== null && accuracy < 85) ||
        averageDwell >= globalAverageDwell * 1.2
          ? "bad"
          : (accuracy === null || accuracy >= 95) &&
              averageDwell <= globalAverageDwell * 0.9
            ? "good"
            : "average";

      return [
        key,
        {
          key,
          count: stat.count,
          averageDwell,
          accuracy,
          level,
        } satisfies KeySummary,
      ];
    }),
  );
  const eligibleSummaries = Object.values(summaries).filter(
    (summary) => summary.count >= 2,
  );
  const slowestKey = [...eligibleSummaries].sort(
    (a, b) => b.averageDwell - a.averageDwell,
  )[0];
  const fastestKey = [...eligibleSummaries].sort(
    (a, b) => a.averageDwell - b.averageDwell,
  )[0];
  const weakestKey = [...eligibleSummaries]
    .filter((summary) => summary.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))[0];

  return {
    summaries,
    totalKeys,
    globalAverageDwell,
    fastestKey,
    slowestKey,
    weakestKey,
  };
}

function getKeyColor(summary: KeySummary | undefined) {
  if (summary && NEUTRAL_PERFORMANCE_KEYS.has(summary.key)) {
    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }

  if (!summary) return "bg-slate-800 text-slate-500 border-slate-800";

  if (summary.level === "bad") {
    return "bg-red-500/80 text-white border-red-400/60 shadow-[0_0_15px_rgba(239,68,68,0.45)]";
  }

  if (summary.level === "average") {
    return "bg-yellow-500/80 text-white border-yellow-400/60 shadow-[0_0_15px_rgba(234,179,8,0.45)]";
  }

  return "bg-green-500/80 text-white border-green-400/60 shadow-[0_0_15px_rgba(34,197,94,0.45)]";
}

export default function KeyPerformancePanel({
  sessions,
  isLoading,
  emptyText = "Complete a typing test to build your key performance map.",
}: {
  sessions: KeyedTelemetrySession[];
  isLoading?: boolean;
  emptyText?: string;
}) {
  const insights = buildKeyInsights(sessions);

  if (isLoading) return <p className="text-sm text-zinc-500">Loading...</p>;

  if (insights.totalKeys === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex w-full flex-col items-center gap-2 overflow-hidden">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex w-full justify-center gap-1.5 sm:gap-2"
          >
            {row.map((key) => {
              const summary = insights.summaries[key.id];

              return (
                <div
                  key={key.id}
                  className={`flex h-9 ${getKeyWidth(key)} items-center justify-center rounded-md border text-xs font-bold transition-all duration-300 sm:h-11 sm:text-sm ${getKeyColor(summary)}`}
                  title={
                    summary
                      ? `${key.label}: ${Math.round(summary.averageDwell)}ms dwell, ${
                          summary.accuracy === null
                            ? "accuracy unknown"
                            : `${Math.round(summary.accuracy)}% accuracy`
                        }, ${summary.count} presses`
                      : `${key.label}: no saved samples`
                  }
                >
                  {key.label}
                </div>
              );
            })}
          </div>
        ))}

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-green-500/80" /> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-yellow-500/80" /> Average
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-500/80" /> Needs work
          </span>
          <span>{insights.totalKeys} saved keypresses</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs uppercase text-zinc-500">Avg Dwell</p>
          <p className="mt-2 text-xl font-semibold text-zinc-100">
            {Math.round(insights.globalAverageDwell)}ms
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs uppercase text-zinc-500">Fastest Key</p>
          <p className="mt-2 text-xl font-semibold text-green-300">
            {insights.fastestKey?.key ?? "-"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {insights.fastestKey
              ? `${Math.round(insights.fastestKey.averageDwell)}ms`
              : "No samples"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs uppercase text-zinc-500">Slowest Key</p>
          <p className="mt-2 text-xl font-semibold text-red-300">
            {insights.slowestKey?.key ?? "-"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {insights.slowestKey
              ? `${Math.round(insights.slowestKey.averageDwell)}ms`
              : "No samples"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs uppercase text-zinc-500">Lowest Accuracy</p>
          <p className="mt-2 text-xl font-semibold text-yellow-300">
            {insights.weakestKey?.key ?? "-"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {insights.weakestKey?.accuracy !== null &&
            insights.weakestKey?.accuracy !== undefined
              ? `${Math.round(insights.weakestKey.accuracy)}%`
              : "No samples"}
          </p>
        </div>
      </div>
    </div>
  );
}
