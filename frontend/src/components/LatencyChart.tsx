import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMemo } from "react";
import type { TelemetryLog } from "@/types/telemetry";

export default function LatencyChart({ logs }: { logs: TelemetryLog[] }) {
  // This memoized function crunches the raw logs into averages per key
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    const grouped: Record<
      string,
      {
        key: string;
        totalDwell: number;
        totalFlight: number;
        count: number;
        flightCount: number;
      }
    > = {};

    logs.forEach((log) => {
      // Ignore spaces and enters for the chart to keep it clean, or format them
      const k = log.key === " " ? "SPACE" : log.key.toUpperCase();

      if (!grouped[k])
        grouped[k] = {
          key: k,
          totalDwell: 0,
          totalFlight: 0,
          count: 0,
          flightCount: 0,
        };
      grouped[k].totalDwell += log.dwellMs;
      if (log.sequence > 0) {
        grouped[k].totalFlight += log.flightMs;
        grouped[k].flightCount += 1;
      }
      grouped[k].count += 1;
    });

    // Calculate averages and sort by the slowest keys
    return Object.values(grouped)
      .map((item) => ({
        key: item.key,
        avgDwell: Math.round(item.totalDwell / item.count),
        avgFlight:
          item.flightCount > 0
            ? Math.round(item.totalFlight / item.flightCount)
            : 0,
      }))
      .sort((a, b) => b.avgDwell - a.avgDwell); // Highest dwell time first
  }, [logs]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-600 italic">
        Awaiting data to render chart...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <XAxis dataKey="key" stroke="#475569" fontSize={12} tickMargin={8} />
        <YAxis stroke="#475569" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            borderColor: "#1e293b",
            borderRadius: "8px",
          }}
          itemStyle={{ fontSize: "14px" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
        <Bar
          dataKey="avgDwell"
          name="Avg Dwell (ms)"
          fill="#4ade80"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="avgFlight"
          name="Avg Flight (ms)"
          fill="#facc15"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
