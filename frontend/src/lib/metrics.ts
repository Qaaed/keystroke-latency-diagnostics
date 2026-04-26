export const calculateMetrics = (logs: any[], testDurationSeconds = 15) => {
  if (logs.length === 0) {
    return { wpm: 0, avgDwell: 0, avgFlight: 0 };
  }

  // 1. Calculate WPM (Standard: 5 characters = 1 word)
  const totalCharacters = logs.length;
  const words = totalCharacters / 5;
  const timeInMinutes = testDurationSeconds / 60;
  const wpm = Math.round(words / timeInMinutes);

  // 2. Calculate Averages
  let totalDwell = 0;
  let totalFlight = 0;
  let validFlights = 0; // We skip the first keystroke since flight time is always 0

  logs.forEach((log) => {
    totalDwell += parseFloat(log.dwell);
    
    const flightTime = parseFloat(log.flight);
    if (flightTime > 0) {
      totalFlight += flightTime;
      validFlights++;
    }
  });

  const avgDwell = Math.round(totalDwell / logs.length);
  const avgFlight = validFlights > 0 ? Math.round(totalFlight / validFlights) : 0;

  return { wpm, avgDwell, avgFlight };
};