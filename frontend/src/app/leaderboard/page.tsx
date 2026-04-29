"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://qaaed-keystroke-api.hf.space";

type LeaderboardEntry = {
  rank: number;
  firebase_uid: string;
  total_sessions: number;
  best_wpm: number | null;
  average_wpm: number | null;
  best_accuracy: number | null;
  average_accuracy: number | null;
  latest_session_at: string | null;
  display_name: string | null;
  photo_url: string | null;
};

type ModeStats = {
  mode: string | null;
  duration_seconds: number | null;
  total_sessions: number;
  best_wpm: number | null;
  average_wpm: number | null;
  best_accuracy: number | null;
  average_accuracy: number | null;
  latest_session_at: string | null;
};

type TelemetrySession = {
  id: number;
  firebase_uid: string;
  hardware_profile: string;
  mode: string | null;
  duration_seconds: number | null;
  wpm: number;
  accuracy: number;
  created_at: string;
};

type LeaderboardDetails = {
  user: LeaderboardEntry;
  mode_stats: ModeStats[];
  recent_sessions: TelemetrySession[];
};

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)}${suffix}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No sessions";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "unspecified";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
}

function displayUserName(entry: LeaderboardEntry, currentUser: User | null) {
  if (entry.firebase_uid === currentUser?.uid) {
    return currentUser.displayName || entry.display_name || "You";
  }

  return entry.display_name || `User ${entry.firebase_uid.slice(0, 6)}`;
}

function displayMode(mode: string | null | undefined) {
  if (mode === "code") return "Code";
  if (mode === "words" || mode === "time") return "Words";
  return "Unspecified";
}

function Avatar({
  entry,
  user,
  size = "md",
}: {
  entry: LeaderboardEntry;
  user: User | null;
  size?: "sm" | "md" | "lg";
}) {
  const name = displayUserName(entry, user);
  const sizeClass =
    size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <div
      className={`${sizeClass} flex flex-none items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 bg-cover bg-center font-medium text-zinc-400`}
      style={entry.photo_url ? { backgroundImage: `url(${entry.photo_url})` } : undefined}
      aria-hidden="true"
    >
      {!entry.photo_url && name.slice(0, 1)}
    </div>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [details, setDetails] = useState<LeaderboardDetails | null>(null);
  const [areDetailsUnavailable, setAreDetailsUnavailable] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_URL}/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error(await response.text());

        const entries = (await response.json()) as LeaderboardEntry[];
        setLeaderboard(entries);
        setSelectedUid((currentUid) => currentUid ?? entries[0]?.firebase_uid ?? null);
      } catch (err) {
        console.error("Leaderboard load failed:", err);
        setError("Could not load leaderboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUid) return;

    const loadDetails = async () => {
      setIsDetailsLoading(true);
      setAreDetailsUnavailable(false);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `${API_URL}/leaderboard/${encodeURIComponent(selectedUid)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.status === 404) {
          setDetails(null);
          setAreDetailsUnavailable(true);
          return;
        }

        if (!response.ok) throw new Error(await response.text());

        setDetails(await response.json());
      } catch (err) {
        console.error("Leaderboard details load failed:", err);
        setError("Could not load the selected user's stats.");
      } finally {
        setIsDetailsLoading(false);
      }
    };

    loadDetails();
  }, [selectedUid, user]);

  const selectedEntry = useMemo(
    () => leaderboard.find((entry) => entry.firebase_uid === selectedUid) ?? null,
    [leaderboard, selectedUid],
  );

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] font-sans text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] font-sans text-zinc-300 selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <Navbar
          user={user}
          activePage="leaderboard"
          bordered
          onSignOut={() => signOut(auth)}
        />

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Leaderboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            Compare saved diagnostic sessions by best WPM, then open a user to
            see how they perform across words, code, and recorded time limits.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-950 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,460px)_1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-xs font-medium uppercase text-zinc-500">
                Rankings
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Ordered by best saved WPM and accuracy.
              </p>
            </div>

            <div className="divide-y divide-zinc-800">
              {isLoading ? (
                <p className="px-5 py-6 text-sm text-zinc-500">Loading...</p>
              ) : leaderboard.length === 0 ? (
                <p className="px-5 py-6 text-sm text-zinc-500">
                  No ranked users yet.
                </p>
              ) : (
                leaderboard.map((entry) => {
                  const isSelected = entry.firebase_uid === selectedUid;

                  return (
                    <button
                      key={entry.firebase_uid}
                      type="button"
                      onClick={() => {
                        setDetails(null);
                        setAreDetailsUnavailable(false);
                        setSelectedUid(entry.firebase_uid);
                      }}
                      className={`grid w-full grid-cols-[32px_1fr_auto] items-center gap-3 px-5 py-4 text-left transition-colors ${
                        isSelected
                          ? "bg-zinc-800/60"
                          : "hover:bg-zinc-900/80"
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-500">
                        #{entry.rank}
                      </span>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar entry={entry} user={user} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">
                            {displayUserName(entry, user)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {entry.total_sessions} sessions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-100">
                          {formatNumber(entry.best_wpm)}
                        </p>
                        <p className="text-xs text-zinc-500">WPM</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              {selectedEntry ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar entry={selectedEntry} user={user} size="lg" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase text-zinc-500">
                        Rank #{selectedEntry.rank}
                      </p>
                      <h2 className="mt-1 truncate text-2xl font-semibold text-zinc-100">
                        {displayUserName(selectedEntry, user)}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Latest session {formatDate(selectedEntry.latest_session_at)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right sm:min-w-80">
                    <div>
                      <p className="text-xs uppercase text-zinc-500">Best</p>
                      <p className="mt-1 text-xl font-semibold text-zinc-100">
                        {formatNumber(selectedEntry.best_wpm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-zinc-500">Avg</p>
                      <p className="mt-1 text-xl font-semibold text-zinc-100">
                        {formatNumber(selectedEntry.average_wpm)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-zinc-500">Accuracy</p>
                      <p className="mt-1 text-xl font-semibold text-zinc-100">
                        {formatNumber(selectedEntry.best_accuracy, "%")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Select a ranked user.</p>
              )}
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-xs font-medium uppercase text-zinc-500">
                  Mode and Time Breakdown
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Best and average performance grouped by mode and test length.
                </p>
              </div>

              <div className="divide-y divide-zinc-800">
                {isDetailsLoading ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">Loading...</p>
                ) : areDetailsUnavailable ? (
                  <p className="px-5 py-6 text-sm leading-6 text-zinc-500">
                    Mode and time breakdown is not available from the current
                    API yet. The ranking summary above is still available.
                  </p>
                ) : !details || details.mode_stats.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">
                    No mode-specific stats are available yet.
                  </p>
                ) : (
                  details.mode_stats.map((stat) => (
                    <div
                      key={`${stat.mode ?? "unknown"}-${stat.duration_seconds ?? "none"}`}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_repeat(4,auto)] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {displayMode(stat.mode)} ·{" "}
                          {formatDuration(stat.duration_seconds)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {stat.total_sessions} sessions · latest{" "}
                          {formatDate(stat.latest_session_at)}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Best {formatNumber(stat.best_wpm)} WPM
                      </p>
                      <p className="text-sm text-zinc-400">
                        Avg {formatNumber(stat.average_wpm)} WPM
                      </p>
                      <p className="text-sm text-zinc-400">
                        Best {formatNumber(stat.best_accuracy, "%")}
                      </p>
                      <p className="text-sm text-zinc-400">
                        Avg {formatNumber(stat.average_accuracy, "%")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-xs font-medium uppercase text-zinc-500">
                  Recent Ranked Sessions
                </h2>
              </div>

              <div className="divide-y divide-zinc-800">
                {isDetailsLoading ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">Loading...</p>
                ) : areDetailsUnavailable ? (
                  <p className="px-5 py-6 text-sm leading-6 text-zinc-500">
                    Recent per-session details require the leaderboard detail
                    endpoint.
                  </p>
                ) : !details || details.recent_sessions.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">
                    No recent sessions available.
                  </p>
                ) : (
                  details.recent_sessions.map((session) => (
                    <div
                      key={session.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">
                          {session.hardware_profile}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {displayMode(session.mode)} ·{" "}
                          {formatDuration(session.duration_seconds)} ·{" "}
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-400">
                        {formatNumber(session.wpm)} WPM
                      </p>
                      <p className="text-sm text-zinc-400">
                        {formatNumber(session.accuracy, "%")} accuracy
                      </p>
                      <p className="text-sm text-zinc-500">
                        {session.firebase_uid === user?.uid ? "You" : "Public"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
