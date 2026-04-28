import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { calculateMetrics } from "@/lib/metrics";
import type { TelemetryLog } from "@/types/telemetry";

type TypingMode = "time" | "words" | "code";

type TypingEngineProps = {
  logs: TelemetryLog[];
  onReset: () => void;
  onTelemetryKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    context: { expectedKey: string | null; isCorrect: boolean | null },
  ) => void;
  onTelemetryKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFinishedChange?: (isFinished: boolean) => void;
  onWpmChange?: (wpm: number) => void;
};

type TestResult = {
  wpm: number;
  accuracy: number;
  elapsedSeconds: number;
};

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_COUNT_OPTIONS = [10, 25, 50, 100];

const WORD_LIST = [
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "it",
  "for",
  "not",
  "on",
  "with",
  "as",
  "you",
  "do",
  "at",
  "this",
  "but",
  "by",
  "from",
  "they",
  "we",
  "say",
  "she",
  "or",
  "an",
  "will",
  "my",
  "one",
  "all",
  "would",
  "there",
  "their",
  "what",
  "so",
  "up",
  "out",
  "if",
  "about",
  "who",
  "get",
  "go",
  "me",
  "when",
  "make",
  "can",
  "like",
  "time",
  "no",
  "just",
  "know",
  "take",
  "people",
  "into",
  "year",
  "your",
  "good",
  "some",
  "could",
  "them",
  "see",
  "other",
  "than",
  "then",
  "now",
  "look",
  "only",
  "come",
  "its",
  "over",
  "think",
  "also",
];

const CODE_SNIPPETS = [
  "const latency = samples.map((key) => key.dwellMs).reduce((sum, value) => sum + value, 0);",
  "function calculateWpm(chars, seconds) { return Math.round((chars / 5) / (seconds / 60)); }",
  "if (event.key.length === 1 && !event.repeat) activeKeys[event.key] = performance.now();",
  "type TelemetryLog = { key: string; dwellMs: number; flightMs: number };",
];

const generateWords = (count: number) => {
  return Array.from(
    { length: count },
    () => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)],
  ).join(" ");
};

const generateCode = () => {
  return CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
};

export default function TypingEngine({
  logs,
  onReset,
  onTelemetryKeyDown,
  onTelemetryKeyUp,
  onFinishedChange,
  onWpmChange,
}: TypingEngineProps) {
  const [mode, setMode] = useState<TypingMode>("time");
  const [duration, setDuration] = useState(15);
  const [wordCount, setWordCount] = useState(25);
  const [targetText, setTargetText] = useState(() => generateWords(45));
  const [userInput, setUserInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const pendingFinishInputRef = useRef<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildTargetText = (nextMode = mode, nextWordCount = wordCount) => {
    if (nextMode === "code") return generateCode();
    return generateWords(nextMode === "words" ? nextWordCount : 45);
  };

  const resetTest = (
    nextMode = mode,
    nextDuration = duration,
    nextWordCount = wordCount,
  ) => {
    setIsActive(false);
    setIsFinished(false);
    setResult(null);
    setTimeLeft(nextDuration);
    setUserInput("");
    setTargetText(buildTargetText(nextMode, nextWordCount));
    startedAtRef.current = null;
    endsAtRef.current = null;
    pendingFinishInputRef.current = null;
    onFinishedChange?.(false);
    onWpmChange?.(0);
    onReset();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const accuracy = useMemo(() => {
    if (userInput.length === 0) return 100;

    let correct = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === targetText[i]) correct++;
    }

    return Math.round((correct / userInput.length) * 100);
  }, [userInput, targetText]);

  const hardwareMetrics = useMemo(() => calculateMetrics(logs), [logs]);

  useEffect(() => {
    if (!isFinished || !result) return;
    onFinishedChange?.(true);
    onWpmChange?.(result.wpm);
  }, [isFinished, onFinishedChange, onWpmChange, result]);

  const finishTest = useCallback((finalInput = userInput) => {
    if (isFinished) return;

    const elapsedSeconds = startedAtRef.current
      ? Math.max(1, (performance.now() - startedAtRef.current) / 1000)
      : Math.max(1, duration - timeLeft);
    let correctCharacters = 0;

    for (let i = 0; i < finalInput.length; i++) {
      if (finalInput[i] === targetText[i]) correctCharacters++;
    }

    const finalAccuracy =
      finalInput.length > 0
        ? Math.round((correctCharacters / finalInput.length) * 100)
        : 100;
    const finalWpm = Math.round(
      (correctCharacters / 5) / (elapsedSeconds / 60),
    );

    setIsActive(false);
    setIsFinished(true);
    endsAtRef.current = null;
    setResult({
      wpm: Number.isFinite(finalWpm) ? finalWpm : 0,
      accuracy: finalAccuracy,
      elapsedSeconds,
    });
  }, [duration, isFinished, targetText, timeLeft, userInput]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && endsAtRef.current) {
      interval = setInterval(() => {
        const endsAt = endsAtRef.current;
        if (!endsAt) return;

        const remaining = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          window.setTimeout(() => finishTest(), 0);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [finishTest, isActive]);

  const modeLabel = mode === "time" ? "time" : mode === "words" ? "words" : "code";

  const startTest = () => {
    if (isActive || isFinished) return;
    const now = performance.now();
    startedAtRef.current = now;
    endsAtRef.current = now + duration * 1000;
    setTimeLeft(duration);
    onFinishedChange?.(false);
    setIsActive(true);
  };

  const handleModeChange = (nextMode: TypingMode) => {
    setMode(nextMode);
    resetTest(nextMode, duration, wordCount);
  };

  const handleDurationChange = (nextDuration: number) => {
    setDuration(nextDuration);
    resetTest(mode, nextDuration, wordCount);
  };

  const handleWordCountChange = (nextWordCount: number) => {
    setWordCount(nextWordCount);
    resetTest(mode, duration, nextWordCount);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const isTypingChar = e.key.length === 1;
    const isAllowedControl = ["Backspace", "Shift", "Enter"].includes(e.key);

    if (!isTypingChar && !isAllowedControl) {
      e.preventDefault();
      return;
    }

    const expectedKey = targetText[userInput.length] ?? null;
    const isCorrect =
      isTypingChar || e.key === "Enter" ? e.key === expectedKey : null;

    onTelemetryKeyDown(e, { expectedKey, isCorrect });

    if (isTypingChar || e.key === "Enter") {
      startTest();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onTelemetryKeyUp(e);

    if (pendingFinishInputRef.current !== null) {
      const finalInput = pendingFinishInputRef.current;
      pendingFinishInputRef.current = null;
      finishTest(finalInput);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;

    const nextInput = e.target.value;
    setUserInput(nextInput);

    if (nextInput.length >= targetText.length) {
      pendingFinishInputRef.current = nextInput;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 rounded-lg bg-zinc-950/70 p-2 sm:flex-row sm:justify-center">
        <div className="flex flex-wrap justify-center gap-1.5">
          {(["time", "words", "code"] as TypingMode[]).map((item) => (
            <button
              key={item}
              onClick={() => handleModeChange(item)}
              disabled={isActive}
              className={`h-9 rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === item
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {mode === "words"
            ? WORD_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => handleWordCountChange(count)}
                  disabled={isActive}
                  className={`h-9 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    wordCount === count
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  {count}
                </button>
              ))
            : TIME_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => handleDurationChange(seconds)}
                  disabled={isActive}
                  className={`h-9 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    duration === seconds
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  {seconds}
                </button>
              ))}
        </div>
      </div>

      <div
        className="relative w-full cursor-text bg-transparent"
        onClick={() => inputRef.current?.focus()}
      >
        {isFinished ? (
          <div className="rounded-lg border border-zinc-800 bg-black p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Test Complete
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Detailed telemetry is available below.
                </p>
              </div>

              <button
                onClick={() => resetTest()}
                className="rounded bg-zinc-100 px-5 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-white"
              >
                Try Again
              </button>
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-medium uppercase text-zinc-500">WPM</p>
                <p className="mt-2 text-4xl font-light text-white">
                  {result?.wpm ?? 0}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Correct characters divided into standard five-character words
                  over your actual test time.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Avg dwell
                </p>
                <p className="mt-2 text-4xl font-light text-white">
                  {hardwareMetrics.avgDwell}
                  <span className="ml-1 text-sm text-zinc-500">ms</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Average time each key was physically held before release.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Avg flight
                </p>
                <p className="mt-2 text-4xl font-light text-white">
                  {hardwareMetrics.avgFlight}
                  <span className="ml-1 text-sm text-zinc-500">ms</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  Average gap between releasing one key and releasing the next.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>Accuracy {result?.accuracy ?? accuracy}%</span>
              <span>Time {(result?.elapsedSeconds ?? 0).toFixed(1)}s</span>
              <span>{logs.length} captured keystrokes</span>
            </div>
          </div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              value={userInput}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onChange={handleChange}
              className="absolute inset-0 z-10 h-full w-full cursor-text resize-none opacity-0"
              autoFocus
            />

            <div className="mb-6 flex items-center justify-between font-mono">
              <div
                className={`text-3xl font-light tracking-tight sm:text-4xl ${
                  isActive ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {timeLeft}s
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="rounded border border-zinc-800 px-2 py-1 text-zinc-500">
                  {modeLabel}
                </span>
                <button
                  onClick={() => resetTest()}
                  className="relative z-20 rounded border border-zinc-800 px-3 py-1 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Restart
                </button>
              </div>
            </div>

            <div className="max-h-[52vh] select-none overflow-hidden break-words font-mono text-[clamp(1.35rem,3.2vw,2.75rem)] leading-relaxed text-left sm:max-h-[56vh]">
              {targetText.split("").map((char, index) => {
                let colorClass = "text-slate-600";

                if (index < userInput.length) {
                  colorClass =
                    userInput[index] === char
                      ? "text-slate-200"
                      : "rounded-sm bg-zinc-100 text-zinc-950";
                }

                const isCursor = index === userInput.length;

                return (
                  <span
                    key={index}
                    className={`${colorClass} ${
                      isCursor ? "-ml-[2px] border-l-2 border-zinc-100" : ""
                    }`}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
