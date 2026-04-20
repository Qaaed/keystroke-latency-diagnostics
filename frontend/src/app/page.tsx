"use client";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useState, useMemo } from "react";
import LatencyChart from "@/components/LatencyChart";

export default function Home() {
  const logs = useTelemetry();
  const [isSending, setIsSending] = useState(false);

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

    setIsSending(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/telemetry/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      });

      if (response.ok) {
        alert("Telemetry synced to database! 🚀");
      } else {
        const errorText = await response.text();
        alert(`Failed to sync: ${errorText}`);
      }
    } catch (err) {
      alert("Connection error! Is your Python backend running on port 8000?");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-12 font-mono">
      <div className="max-w-3xl mx-auto space-y-8">
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
        <textarea
          className="w-full h-40 bg-slate-900/50 border border-slate-800 p-6 rounded-lg focus:border-blue-500 outline-none transition-all text-xl"
          placeholder="Start your diagnostic test..."
        />

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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
