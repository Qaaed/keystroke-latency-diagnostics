"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useMemo } from "react";
import LatencyChart from "@/components/LatencyChart";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import TypingEngine from "@/components/TypingEngine";
import { auth } from "@/lib/firebase";
import LoginModal from "@/components/LoginModal";
import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Home() {
  const logs = useTelemetry();
  const [isSending, setIsSending] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Listen for Firebase login state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  // --- WPM CALCULATION ---
  const stats = useMemo(() => {
    if (logs.length < 2) return { wpm: 0 };

    const charCount = logs.length;
    const totalTimeMs = logs.reduce(
      (acc, log) => acc + parseFloat(log.dwell) + parseFloat(log.flight),
      0,
    );
    const timeInMinutes = totalTimeMs / 1000 / 60;
    const wpm = charCount / 5 / timeInMinutes;

    return { wpm: Math.round(wpm) };
  }, [logs]);

  // --- SYNC FUNCTION ---
  const saveTelemetry = async () => {
    if (logs.length === 0) return alert("No data to save!");

    // 1. SAFETY CHECK: Ensure the user is logged in before trying to sync
    if (!user) {
      setIsAuthModalOpen(true); // Pops open the login modal
      return alert("Please log in to authenticate your telemetry upload.");
    }

    setIsSending(true);
    try {
      // 2. SECURE TOKEN: Grab the JWT from the active Firebase session
      const token = await user.getIdToken();

      const response = await fetch(
        "https://qaaed-keystroke-api.hf.space/telemetry/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // 3. AUTH HEADER: Inject the secure token into the request
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            hardware_profile: "GMMK Modular 60%",
            wpm: stats.wpm,
            accuracy: 100, // Hardcoded for now
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-12 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* HEADER */}
        {/* UPLOAD BUTTON */}
        <button
          onClick={saveTelemetry}
          disabled={isSending || logs.length === 0 || !user}
          className="px-6 py-2.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold rounded-lg text-sm hover:bg-cyan-500 hover:text-black transition-all duration-300 disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
          {isSending ? "SYNCING..." : "UPLOAD DATA"}
        </button>

        {/* --- NEW NATIVE AUTH UI --- */}
        <div className="ml-4 border-l border-slate-800 pl-6 flex items-center">
          {user ? (
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
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-sm font-bold text-slate-400 hover:text-cyan-400 transition-colors tracking-widest"
            >
              SYSTEM_LOGIN
            </button>
          )}
        </div>
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
                {stats.wpm}{" "}
                <span className="text-sm text-slate-500 font-normal">WPM</span>
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
        {/* INPUT AREA */}
        <TypingEngine />

        {/* LIVE DATA FEED */}
        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
          {/* LEFT: LIVE FEED (1 Column) */}
          <div className="bg-black p-4 border border-slate-800 rounded-lg overflow-y-auto flex flex-col">
            <h2 className="text-xs text-slate-500 mb-4 uppercase tracking-widest sticky top-0 bg-black pb-2 border-b border-slate-900">
              Live Feed
            </h2>
            {logs.length === 0 ? (
              <span className="text-slate-600 italic">// Waiting...</span>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                {logs.map((log, i) => (
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

          {/* RIGHT: CHART (2 Columns) */}
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
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </main>
  );
}
