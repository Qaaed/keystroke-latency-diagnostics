"use client";
import { useTelemetry } from "@/hooks/useTelemetry";

export default function Home() {
  const logs = useTelemetry();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-12 font-mono">
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-blue-500 underline">
            KEYSTROKE_DIAGNOSTICS_V1
          </h1>
          <p className="text-slate-500 text-sm">
            Status: Listening for hardware interrupts...
          </p>
        </header>

        {/* Input Area */}
        <textarea
          className="w-full h-32 bg-slate-900 border border-slate-800 p-4 rounded focus:border-blue-500 outline-none"
          placeholder="Start typing to generate telemetry..."
        />

        {/* Live Data Feed */}
        <div className="bg-black p-4 border border-slate-800 rounded h-64 overflow-hidden">
          <h2 className="text-xs text-slate-500 mb-4 uppercase tracking-widest">
            Live Telemetry Feed
          </h2>
          {logs.map((log, i) => (
            <div
              key={i}
              className="text-xs py-1 border-b border-slate-900 flex justify-between"
            >
              <span className="text-blue-400">KEY: {log.key}</span>
              <span className="text-green-400">DWELL: {log.dwell}ms</span>
              <span className="text-yellow-400">FLIGHT: {log.flight}ms</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
