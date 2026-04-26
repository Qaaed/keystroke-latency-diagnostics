import { useState, useEffect, useRef } from "react";

const isValidKeystroke = (e: KeyboardEvent): boolean => {
  // 1. Instantly block any keystroke combined with Alt, Ctrl, or Meta (Windows/Cmd)
  if (e.altKey || e.ctrlKey || e.metaKey) return false;

  // 2. Allow single typing characters (letters, numbers, punctuation, spacebar)
  if (e.key.length === 1) return true;

  // 3. Allow explicitly permitted system keys
  if (["Backspace", "Shift"].includes(e.key)) return true;

  // Block everything else (Tab, CapsLock, F1-F12, Arrow keys, standalone Alt, etc.)
  return false;
};

export const useTelemetry = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const lastReleaseTime = useRef<number>(0);
  const activeKeys = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept before any timers start
      if (!isValidKeystroke(e)) return;

      if (e.repeat) return; // Ignore auto-repeat when holding a key
      const now = performance.now(); // High-precision timestamp
      activeKeys.current[e.key] = now;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Intercept before calculating flight/dwell time
      if (!isValidKeystroke(e)) return;

      const now = performance.now();
      const startTime = activeKeys.current[e.key];

      if (startTime) {
        const dwell = now - startTime;
        const flight = lastReleaseTime.current
          ? now - lastReleaseTime.current
          : 0;

        // Save the data packet
        setLogs((prev) => [
          ...prev,
          {
            key: e.key,
            dwell: dwell.toFixed(2),
            flight: flight.toFixed(2),
          },
        ]); 

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

  // NEW: A function to completely wipe the slate clean
  const clearLogs = () => {
    setLogs([]);
    lastReleaseTime.current = 0; // Resets flight time so it doesn't span across tests
    activeKeys.current = {};
  };

  // Change the return to an object so we can access both the data and the reset function!
  return { logs, clearLogs };
};