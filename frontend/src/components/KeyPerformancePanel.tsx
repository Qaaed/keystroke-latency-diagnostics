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

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

function buildKeyInsights(sessions: KeyedTelemetrySession[]) {
  const rawStats: Record<
    string,
    { totalDwell: number; count: number; correct: number; accuracySamples: number }
  > = {};
  let totalDwell = 0;
  let totalKeys = 0;

  sessions.forEach((session) => {
    session.keystroke_data?.forEach((entry) => {
      const key = entry.key.toUpperCase();
      if (!/^[A-Z]$/.test(key)) return;

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
              const summary = insights.summaries[key];

              return (
                <div
                  key={key}
                  className={`flex h-9 w-[clamp(1.75rem,8vw,3rem)] items-center justify-center rounded-md border text-sm font-bold transition-all duration-300 sm:h-11 ${getKeyColor(summary)}`}
                  title={
                    summary
                      ? `${key}: ${Math.round(summary.averageDwell)}ms dwell, ${
                          summary.accuracy === null
                            ? "accuracy unknown"
                            : `${Math.round(summary.accuracy)}% accuracy`
                        }, ${summary.count} presses`
                      : `${key}: no saved samples`
                  }
                >
                  {key}
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
