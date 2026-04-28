import type { TelemetryLog } from "@/types/telemetry";

export const calculateMetrics = (
  logs: TelemetryLog[],
) => {
  if (logs.length === 0) {
    return { avgDwell: 0, avgFlight: 0 };
  }

  let totalDwell = 0;
  let totalFlight = 0;
  let validFlights = 0;

  logs.forEach((log) => {
    totalDwell += log.dwellMs;

    if (log.sequence > 0) {
      totalFlight += log.flightMs;
      validFlights++;
    }
  });

  const avgDwell = Math.round(totalDwell / logs.length);
  const avgFlight = validFlights > 0 ? Math.round(totalFlight / validFlights) : 0;

  return { avgDwell, avgFlight };
};
