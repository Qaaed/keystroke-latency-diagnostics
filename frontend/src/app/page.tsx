"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import LatencyChart from "@/components/LatencyChart";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import TypingEngine from "@/components/TypingEngine";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { calculateMetrics } from "@/lib/metrics";
import type { User } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const { logs, clearLogs } = useTelemetry();
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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

  const stats = useMemo(() => {
    return calculateMetrics(logs);
  }, [logs]);

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
          wpm: stats.wpm,
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
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <nav className="flex flex-col gap-4 border-b border-zinc-800/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">
              Keystroke Latency Diagnostics
            </p>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-zinc-400">Database connected</span>
            </div>
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

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                  Diagnostic Session
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Analyzing hardware latency for GMMK Modular 60%
                </p>
              </div>

              <button
                onClick={saveTelemetry}
                disabled={isSending || logs.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-100 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Syncing..." : "Sync Telemetry"}
              </button>
            </header>

            <TypingEngine onReset={clearLogs} />
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium uppercase text-zinc-500">WPM</p>
              <p className="mt-3 text-5xl font-light tracking-tight text-zinc-100">
                {stats.wpm}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Avg dwell
              </p>
              <p className="mt-3 text-3xl font-light tracking-tight text-zinc-100">
                {stats.avgDwell}
                <span className="ml-1 text-sm text-zinc-500">ms</span>
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Avg flight
              </p>
              <p className="mt-3 text-3xl font-light tracking-tight text-zinc-100">
                {stats.avgFlight}
                <span className="ml-1 text-sm text-zinc-500">ms</span>
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
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

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
            <div className="flex min-h-[320px] flex-col rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-4 text-xs font-medium uppercase text-zinc-500">
                Latency Visualizer
              </h2>
              <div className="min-h-0 flex-1">
                <LatencyChart logs={logs} />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="mb-4 text-xs font-medium uppercase text-zinc-500">
                Key Heatmap
              </h2>
              <VirtualKeyboard logs={logs} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
