import { useCallback, useRef, useState } from "react";
import type { TelemetryLog } from "@/types/telemetry";

type TelemetryKeyContext = {
  expectedKey?: string | null;
  isCorrect?: boolean | null;
};

type ActiveKey = {
  code: string;
  downAt: number;
  flightMs: number;
  expectedKey: string | null;
  isCorrect: boolean | null;
};

const isValidKeystroke = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
): boolean => {
  if (e.altKey || e.ctrlKey || e.metaKey) return false;

  if (e.key.length === 1) return true;

  if (["Backspace", "Enter", "Shift"].includes(e.key)) return true;

  return false;
};

export const useTelemetry = () => {
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const lastReleaseTimeRef = useRef<number | null>(null);
  const activeKeysRef = useRef<Record<string, ActiveKey>>({});
  const sequenceRef = useRef(0);

  const recordKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      context: TelemetryKeyContext = {},
    ) => {
      if (!isValidKeystroke(e) || e.repeat) return;

      const downAt = performance.now();
      activeKeysRef.current[e.code] = {
        code: e.code,
        downAt,
        flightMs:
          lastReleaseTimeRef.current === null
            ? 0
            : downAt - lastReleaseTimeRef.current,
        expectedKey: context.expectedKey ?? null,
        isCorrect: context.isCorrect ?? null,
      };
    },
    [],
  );

  const recordKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isValidKeystroke(e)) return;

      const upAt = performance.now();
      const activeKey = activeKeysRef.current[e.code];

      if (activeKey) {
        const sequence = sequenceRef.current;
        sequenceRef.current += 1;

        setLogs((prev) => [
          ...prev,
          {
            key: e.key,
            code: activeKey.code,
            sequence,
            downAt: activeKey.downAt,
            upAt,
            dwellMs: upAt - activeKey.downAt,
            flightMs: activeKey.flightMs,
            expectedKey: activeKey.expectedKey,
            isCorrect: activeKey.isCorrect,
          },
        ]);

        lastReleaseTimeRef.current = upAt;
        delete activeKeysRef.current[e.code];
      }
    },
    [],
  );

  const clearLogs = () => {
    setLogs([]);
    lastReleaseTimeRef.current = null;
    activeKeysRef.current = {};
    sequenceRef.current = 0;
  };

  return { logs, clearLogs, recordKeyDown, recordKeyUp };
};
