export type TelemetryLog = {
  key: string;
  code: string;
  sequence: number;
  downAt: number;
  upAt: number;
  dwellMs: number;
  flightMs: number;
  expectedKey: string | null;
  isCorrect: boolean | null;
};
