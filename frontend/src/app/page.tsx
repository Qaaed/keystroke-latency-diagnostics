"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import LatencyChart from "@/components/LatencyChart";
import Navbar, {
  OTHER_KEYBOARD_VALUE,
} from "@/components/Navbar";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import TypingEngine from "@/components/TypingEngine";
import { apiFetch, requireOk } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

const UNSPECIFIED_KEYBOARD = "keyboard not specified";

function getStoredValue(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export default function Home() {
  const router = useRouter();
  const { logs, clearLogs, recordKeyDown, recordKeyUp } = useTelemetry();
  const hasSavedSession = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [typingSessionKey, setTypingSessionKey] = useState(0);
  const [sessionMode, setSessionMode] = useState<"words" | "code">("words");
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(15);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [selectedKeyboard, setSelectedKeyboard] = useState<string>(
    () => getStoredValue("selectedKeyboard") ?? "",
  );
  const [customKeyboard, setCustomKeyboard] = useState(
    () => getStoredValue("customKeyboard") ?? "",
  );

  const hardwareProfile =
    selectedKeyboard === OTHER_KEYBOARD_VALUE
      ? customKeyboard.trim() || UNSPECIFIED_KEYBOARD
      : selectedKeyboard || UNSPECIFIED_KEYBOARD;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (selectedKeyboard) {
      window.localStorage.setItem("selectedKeyboard", selectedKeyboard);
    } else {
      window.localStorage.removeItem("selectedKeyboard");
    }
  }, [selectedKeyboard]);

  useEffect(() => {
    window.localStorage.setItem("customKeyboard", customKeyboard);
  }, [customKeyboard]);

  const recentLogs = logs.slice(-12).reverse();

  const saveTelemetry = useCallback(async () => {
    if (logs.length === 0 || !user) return false;

    setSaveStatus("saving");
    try {
      const token = await user.getIdToken();
      const response = await apiFetch("/telemetry/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hardware_profile: hardwareProfile,
          mode: sessionMode,
          duration_seconds: sessionDurationSeconds,
          wpm,
          accuracy,
          keystroke_data: logs.map((log) => ({
            key: log.key,
            code: log.code,
            sequence: log.sequence,
            down_at: log.downAt,
            up_at: log.upAt,
            dwell_time: log.dwellMs,
            flight_time: log.flightMs,
            expected_key: log.expectedKey,
            is_correct: log.isCorrect,
          })),
        }),
      });

      await requireOk(response);

      setSaveStatus("saved");
      return true;
    } catch (err) {
      console.error("Telemetry sync failed:", err);
      setSaveStatus("error");
      return false;
    }
  }, [
    accuracy,
    hardwareProfile,
    logs,
    sessionDurationSeconds,
    sessionMode,
    user,
    wpm,
  ]);

  useEffect(() => {
    if (!isTestComplete || hasSavedSession.current || logs.length === 0) return;

    hasSavedSession.current = true;
    const saveTimer = window.setTimeout(() => {
      saveTelemetry().then((saved) => {
        if (!saved) hasSavedSession.current = false;
      });
    }, 0);

    return () => window.clearTimeout(saveTimer);
  }, [isTestComplete, logs.length, hardwareProfile, saveTelemetry]);

  const handleReset = () => {
    hasSavedSession.current = false;
    setSaveStatus("idle");
    clearLogs();
  };

  const restartTypingSession = () => {
    hasSavedSession.current = false;
    setSaveStatus("idle");
    setIsTestComplete(false);
    setWpm(0);
    setAccuracy(100);
    clearLogs();
    setTypingSessionKey((currentKey) => currentKey + 1);
  };

  const handleKeyboardChange = (value: string) => {
    const shouldRestart = logs.length > 0;
    setSelectedKeyboard(value);
    if (shouldRestart) restartTypingSession();
  };

  const handleCustomKeyboardChange = (value: string) => {
    const shouldRestart = logs.length > 0;
    setCustomKeyboard(value);
    if (shouldRestart) restartTypingSession();
  };

  const handleFinishedChange = (isFinished: boolean) => {
    if (!isFinished) {
      hasSavedSession.current = false;
      setSaveStatus("idle");
    }

    setIsTestComplete(isFinished);
  };

  const handleSessionConfigChange = useCallback(
    (config: { mode: "words" | "code"; durationSeconds: number }) => {
      setSessionMode(config.mode);
      setSessionDurationSeconds(config.durationSeconds);
    },
    [],
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans text-zinc-500">
        Redirecting...
      </div>
    );
  }

  return (
    <main
      className={`bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800 ${
        isTestComplete ? "min-h-screen" : "h-screen overflow-hidden"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8 ${
          isTestComplete ? "gap-8 py-5 lg:py-8" : "h-full gap-3 py-3"
        }`}
      >
        <Navbar
          user={user}
          activePage="test"
          bordered={isTestComplete}
          showKeyboardSelector
          selectedKeyboard={selectedKeyboard}
          customKeyboard={customKeyboard}
          onKeyboardChange={handleKeyboardChange}
          onCustomKeyboardChange={handleCustomKeyboardChange}
          onSignOut={() => signOut(auth)}
        />

        <section
          className={`mx-auto grid w-full gap-5 ${
            isTestComplete
              ? "lg:grid-cols-[minmax(0,1fr)_320px]"
              : "min-h-0 flex-1 content-center pb-8"
          }`}
        >
          <div className={isTestComplete ? "space-y-5" : "min-h-0"}>
            {isTestComplete && (
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                  Diagnostic Session
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Analyzing hardware latency for {hardwareProfile}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {saveStatus === "saving" && "Saving telemetry..."}
                  {saveStatus === "saved" && "Telemetry saved automatically."}
                  {saveStatus === "error" &&
                    "Automatic save failed. Check the API connection."}
                </p>
              </div>
            </header>
            )}

            <TypingEngine
              key={typingSessionKey}
              logs={logs}
              onReset={handleReset}
              onTelemetryKeyDown={recordKeyDown}
              onTelemetryKeyUp={recordKeyUp}
              onFinishedChange={handleFinishedChange}
              onWpmChange={setWpm}
              onAccuracyChange={setAccuracy}
              onSessionConfigChange={handleSessionConfigChange}
            />
          </div>

          {isTestComplete && (
            <aside className="space-y-5">
              <div className="flex max-h-[520px] min-h-[420px] flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <h2 className="text-xs font-medium uppercase text-zinc-500">
                    Live Feed
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {logs.length} captured keystrokes
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {logs.length === 0 ? (
                    <span className="text-sm italic text-zinc-600">
                      Awaiting input...
                    </span>
                  ) : (
                    <div className="space-y-2 font-mono text-xs">
                      {recentLogs.map((log, i) => (
                        <div
                          key={`${log.key}-${i}`}
                          className="grid grid-cols-[56px_1fr_1fr] items-center gap-3 rounded-md border border-zinc-800/70 bg-zinc-950/30 px-3 py-2"
                        >
                          <span className="rounded bg-zinc-800 px-2 py-1 text-center font-medium text-zinc-200">
                            {log.key === " " ? "SPC" : log.key}
                          </span>
                          <span className="text-zinc-500">
                            Dwell {log.dwellMs.toFixed(2)}ms
                          </span>
                          <span className="text-zinc-500">
                            Flight {log.flightMs.toFixed(2)}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </section>

        {isTestComplete && (
          <section className="space-y-5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-4 text-xs font-medium uppercase text-zinc-500">
                Key Heatmap
              </h2>
              <VirtualKeyboard logs={logs} />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-4 text-xs font-medium uppercase text-zinc-500">
                Latency Visualizer
              </h2>
              <div className="h-80 w-full">
                <LatencyChart logs={logs} />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
