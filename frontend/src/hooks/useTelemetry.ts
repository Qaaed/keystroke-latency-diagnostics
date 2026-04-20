import { useState, useEffect, useRef } from "react";

export const useTelemetry = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const lastReleaseTime = useRef<number>(0);
  const activeKeys = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Ignore auto-repeat when holding a key
      const now = performance.now(); // High-precision timestamp
      activeKeys.current[e.key] = now;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const now = performance.now();
      const startTime = activeKeys.current[e.key];

      if (startTime) {
        const dwell = now - startTime;
        const flight = lastReleaseTime.current
          ? now - lastReleaseTime.current
          : 0;

        // Save the data packet
        setLogs((prev) =>
          [
            ...prev,
            {
              key: e.key,
              dwell: dwell.toFixed(2),
              flight: flight.toFixed(2),
            },
          ].slice(-10),
        ); // Keep only the last 10 for the live feed

        lastReleaseTime.current = now;
        delete activeKeys.current[e.key];
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return logs;
};
