"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LatencyChart from "@/components/LatencyChart";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import TypingEngine from "@/components/TypingEngine";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const { logs, clearLogs } = useTelemetry();
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [wpm, setWpm] = useState(0);
  const [isTestComplete, setIsTestComplete] = useState(false);

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

  const recentLogs = logs.slice(-12).reverse();

  const saveTelemetry = async () => {
    if (logs.length === 0) return alert("No data to save.");
    if (!user) return alert("Session lost. Please sign in.");

    setIsSending(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("https://qaaed-keystroke-api.hf.space/telemetry/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hardware_profile: "GMMK Modular 60%", 
          wpm,
          accuracy: 100, 
          keystroke_data: logs.map((log) => ({
            key: log.key,
            dwell_time: parseFloat(log.dwell),
            flight_time: parseFloat(log.flight),
          })),
        }),
      });

      if (response.ok) alert("Telemetry synced successfully.");
      else alert(`Failed to sync: ${await response.text()}`);
    } catch (err) {
      console.error("Telemetry sync failed:", err);
      alert("Connection error.");
    } finally {
      setIsSending(false);
    }
  };

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
        <nav
          className={`flex flex-row items-center justify-between ${
            isTestComplete ? "border-b border-zinc-800/70 pb-5" : ""
          }`}
        >
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">
              Keystroke Latency Diagnostics
            </p>
            {isTestComplete && (
              <div className="mt-2 flex items-center gap-3 text-sm">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-100"></span>
              </div>
              <span className="text-zinc-400">Database connected</span>
            </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-zinc-300 md:block">
              {user.displayName || "User"}
            </span>
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-8 w-8 rounded-full border border-zinc-700"
              />
            )}
            <button
              onClick={() => signOut(auth)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </nav>

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
                  Analyzing hardware latency for GMMK Modular 60%
                </p>
              </div>

              {isTestComplete && (
                <button
                  onClick={saveTelemetry}
                  disabled={isSending || logs.length === 0}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? "Syncing..." : "Sync Telemetry"}
                </button>
              )}
            </header>
            )}

            <TypingEngine
              logs={logs}
              onReset={clearLogs}
              onFinishedChange={setIsTestComplete}
              onWpmChange={setWpm}
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
                            Dwell {log.dwell}ms
                          </span>
                          <span className="text-zinc-500">
                            Flight {log.flight}ms
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
