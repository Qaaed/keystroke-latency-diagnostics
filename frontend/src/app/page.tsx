// frontend/src/app/page.tsx
"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation"; // NEW: For redirecting
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
        // BOUNCER: If not logged in, kick them to the login page
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- UPGRADED MATH ENGINE (True Live WPM) ---
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

    const wpm = Math.round(words / timeInMinutes);
    return { wpm };
  }, [logs]);

  // --- SYNC FUNCTION ---
  const saveTelemetry = async () => {
    if (logs.length === 0) return alert("No data to save!");
    if (!user) return alert("User session lost. Please log in again.");

    setIsSending(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch(
        "https://qaaed-keystroke-api.hf.space/telemetry/",
        {
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
        },
      );

      if (response.ok) {
        alert("Telemetry synced to database! 🚀");
      } else {
        const errorText = await response.text();
        alert(`Failed to sync: ${errorText}`);
      }
    } catch (err) {
      alert("Connection error! Is your Python backend running?");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Keep the loading screen so the dashboard doesn't flash before they get kicked to /login
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-cyan-500 animate-pulse">
        [ SYSTEM_BOOTING... ]
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD UI
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-12 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <button
            onClick={saveTelemetry}
            disabled={isSending || logs.length === 0}
            className="px-6 py-2.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold rounded-lg text-sm hover:bg-cyan-500 hover:text-black transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
          >
            {isSending ? "SYNCING..." : "UPLOAD DATA"}
          </button>

          {/* NATIVE AUTH UI */}
          <div className="flex items-center">
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <div className="text-xs text-white font-bold">
                  {user.displayName || "GUEST_USER"}
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="text-[10px] text-rose-400 hover:text-rose-300 uppercase tracking-widest"
                >
                  Terminate Session
                </button>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded border-2 border-cyan-500/50"
                />
              ) : (
                <div className="w-10 h-10 rounded border-2 border-cyan-500/50 bg-slate-800"></div>
              )}
            </div>
          </div>
        </div>

        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-500 tracking-tighter">
              KEYSTROKE_DIAG_V1
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              SENSORS: ACTIVE | DB: CONNECTED
            </p>
          </div>

          <div className="flex items-end gap-6">
            <div className="text-right">
              <div className="text-4xl font-black text-white">
                {stats.wpm} <span className="text-sm text-slate-500 font-normal">WPM</span>
              </div>
            </div>
            <button
              onClick={saveTelemetry}
              disabled={isSending || logs.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed h-fit mb-1"
            >
              {isSending ? "SYNCING..." : "SYNC TO CLOUD"}
            </button>
          </div>
        </header>

        {/* INPUT AREA */}
        <TypingEngine onReset={clearLogs} />

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
          
          {/* LEFT: LIVE FEED */}
          <div className="bg-black p-4 border border-slate-800 rounded-lg overflow-y-auto flex flex-col">
            <h2 className="text-xs text-slate-500 mb-4 uppercase tracking-widest sticky top-0 bg-black pb-2 border-b border-slate-900">
              Live Feed
            </h2>
            {logs.length === 0 ? (
              <span className="text-slate-600 italic">// Waiting...</span>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                {logs.slice(-10).map((log, i) => (
                  <div
                    key={i}
                    className="text-xs py-1.5 border-b border-slate-900 flex justify-between"
                  >
                    <span className="text-blue-400 font-bold">
                      {log.key === " " ? "SPC" : log.key}
                    </span>
                    <span className="text-green-400">{log.dwell}</span>
                    <span className="text-yellow-400">{log.flight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: CHART */}
          <div className="bg-slate-900/30 p-4 border border-slate-800 rounded-lg md:col-span-2 flex flex-col">
            <h2 className="text-xs text-slate-500 mb-4 uppercase tracking-widest">
              Average Latency by Key
            </h2>
            <div className="flex-1 w-full">
              <LatencyChart logs={logs} />
              <VirtualKeyboard logs={logs} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}