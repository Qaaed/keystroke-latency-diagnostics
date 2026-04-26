"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import LatencyChart from "@/components/LatencyChart";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import TypingEngine from "@/components/TypingEngine";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const { logs, clearLogs } = useTelemetry();
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    if (logs.length < 2) return { wpm: 0 };
    const totalCharacters = logs.length;
    const words = totalCharacters / 5; 
    let totalTimeMs = 0;
    logs.forEach((log) => {
      totalTimeMs += parseFloat(log.dwell) + parseFloat(log.flight);
    });
    let timeInMinutes = totalTimeMs / 1000 / 60;
    if (timeInMinutes < (2 / 60)) timeInMinutes = 2 / 60;
    return { wpm: Math.round(words / timeInMinutes) };
  }, [logs]);

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
      alert("Connection error.");
    } finally {
      setIsSending(false);
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans text-zinc-500">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-300 p-6 md:p-12 font-sans selection:bg-zinc-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Clean Top Navigation */}
        <nav className="flex justify-between items-center pb-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-3 text-sm">
             <div className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </div>
             <span className="text-zinc-400">Database Connected</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-300 hidden md:block">
              {user.displayName || "User"}
            </span>
            {user.photoURL && (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-700" />
            )}
            <button
              onClick={() => signOut(auth)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Header Section */}
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
              Diagnostic Session
            </h1>
            <p className="text-zinc-500 text-sm">
              Analyzing hardware latency for GMMK Modular 60%
            </p>
          </div>

          <div className="flex items-end gap-6">
            <div className="text-right">
              <div className="text-5xl font-light text-zinc-100 tracking-tighter">
                {stats.wpm} <span className="text-base text-zinc-500 font-normal tracking-normal">WPM</span>
              </div>
            </div>
          </div>
        </header>

        {/* INPUT AREA */}
        <TypingEngine onReset={clearLogs} />

        {/* Quick Actions */}
        <div className="flex justify-end">
          <button
            onClick={saveTelemetry}
            disabled={isSending || logs.length === 0}
            className="bg-zinc-100 text-zinc-900 hover:bg-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? "Syncing..." : "Sync Telemetry"}
          </button>
        </div>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
          
          {/* LIVE FEED */}
          <div className="bg-zinc-900/40 p-5 border border-zinc-800 rounded-xl overflow-y-auto flex flex-col">
            <h2 className="text-xs text-zinc-500 mb-4 font-medium sticky top-0 bg-transparent">
              Live Feed
            </h2>
            {logs.length === 0 ? (
              <span className="text-zinc-600 text-sm italic">Awaiting input...</span>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 font-mono text-xs">
                {logs.slice(-10).map((log, i) => (
                  <div key={i} className="py-2 border-b border-zinc-800/50 flex justify-between items-center">
                    <span className="text-zinc-300 font-medium bg-zinc-800 px-2 py-0.5 rounded">
                      {log.key === " " ? "SPC" : log.key}
                    </span>
                    <span className="text-zinc-500">{log.dwell}ms</span>
                    <span className="text-zinc-500">{log.flight}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHART AREA */}
          <div className="bg-zinc-900/40 p-5 border border-zinc-800 rounded-xl md:col-span-2 flex flex-col">
            <h2 className="text-xs text-zinc-500 mb-4 font-medium">
              Latency Visualizer
            </h2>
            <div className="flex-1 w-full opacity-80 mix-blend-screen">
              <LatencyChart logs={logs} />
              <VirtualKeyboard logs={logs} />
            </div>
          </div>
        </div>
        
      </div>
    </main>
  );
}