"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KeyPerformancePanel from "@/components/KeyPerformancePanel";
import Navbar from "@/components/Navbar";
import { apiFetch, getErrorMessage, requireOk } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

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
  keystroke_data?: {
    key: string;
    dwell_time: number;
    flight_time: number;
    is_correct: boolean | null;
  }[];
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

function formatRankDelta(entry: LeaderboardEntry, selected: LeaderboardEntry | null) {
  if (!selected || entry.firebase_uid === selected.firebase_uid) return "";
  const delta = entry.rank - selected.rank;
  if (delta === 1) return "next rank";
  if (delta === -1) return "previous rank";
  return `${Math.abs(delta)} ranks ${delta > 0 ? "behind" : "ahead"}`;
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
      className={`${sizeClass} relative flex flex-none items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950 font-medium text-zinc-400`}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
      {entry.photo_url && (
        <img
          src={entry.photo_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
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
        const response = await apiFetch("/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });

        await requireOk(response);

        const entries = (await response.json()) as LeaderboardEntry[];
        const requestedUid =
          typeof window === "undefined"
            ? null
            : new URLSearchParams(window.location.search).get("user");
        setLeaderboard(entries);
        setSelectedUid(
          (currentUid) =>
            currentUid ??
            entries.find((entry) => entry.firebase_uid === requestedUid)?.firebase_uid ??
            entries[0]?.firebase_uid ??
            null,
        );
      } catch (err) {
        const message = getErrorMessage(err, "Could not load leaderboard.");
        console.warn(`Leaderboard load failed: ${message}`);
        setError(message);
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
        const response = await apiFetch(
          `/leaderboard/${encodeURIComponent(selectedUid)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.status === 404) {
          setDetails(null);
          setAreDetailsUnavailable(true);
          return;
        }

        await requireOk(response);

        setDetails(await response.json());
      } catch (err) {
        const message = getErrorMessage(
          err,
          "Could not load the selected user's stats.",
        );
        console.warn(`Leaderboard details load failed: ${message}`);
        setError(message);
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
  const adjacentRanks = useMemo(() => {
    if (!selectedEntry) return [];
    return leaderboard.filter(
      (entry) => Math.abs(entry.rank - selectedEntry.rank) <= 1,
    );
  }, [leaderboard, selectedEntry]);

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
                        router.replace(
                          `/leaderboard?user=${encodeURIComponent(entry.firebase_uid)}`,
                          { scroll: false },
                        );
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
                <div className="space-y-5">
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

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">Rank</p>
                      <p className="mt-2 text-xl font-semibold text-zinc-100">
                        #{selectedEntry.rank}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">Sessions</p>
                      <p className="mt-2 text-xl font-semibold text-zinc-100">
                        {selectedEntry.total_sessions}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">Avg WPM</p>
                      <p className="mt-2 text-xl font-semibold text-zinc-100">
                        {formatNumber(selectedEntry.average_wpm)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-xs uppercase text-zinc-500">
                        Avg Accuracy
                      </p>
                      <p className="mt-2 text-xl font-semibold text-zinc-100">
                        {formatNumber(selectedEntry.average_accuracy, "%")}
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
                  Ranking Context
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Neighboring ranks around the selected profile.
                </p>
              </div>

              <div className="divide-y divide-zinc-800">
                {isLoading ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">Loading...</p>
                ) : adjacentRanks.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">
                    No ranking context available.
                  </p>
                ) : (
                  adjacentRanks.map((entry) => {
                    const isSelected = entry.firebase_uid === selectedUid;

                    return (
                      <button
                        key={entry.firebase_uid}
                        type="button"
                        onClick={() => {
                          setDetails(null);
                          setAreDetailsUnavailable(false);
                          setSelectedUid(entry.firebase_uid);
                          router.replace(
                            `/leaderboard?user=${encodeURIComponent(entry.firebase_uid)}`,
                            { scroll: false },
                          );
                        }}
                        className={`grid w-full gap-3 px-5 py-4 text-left transition-colors sm:grid-cols-[72px_1fr_auto_auto] sm:items-center ${
                          isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-900/80"
                        }`}
                      >
                        <p className="text-sm font-semibold text-zinc-100">
                          #{entry.rank}
                        </p>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar entry={entry} user={user} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {displayUserName(entry, user)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {isSelected ? "Selected" : formatRankDelta(entry, selectedEntry)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400">
                          Best {formatNumber(entry.best_wpm)} WPM
                        </p>
                        <p className="text-sm text-zinc-400">
                          Avg {formatNumber(entry.average_accuracy, "%")} accuracy
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-xs font-medium uppercase text-zinc-500">
                  Key Performance
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Recent saved keystrokes grouped by dwell time and accuracy.
                </p>
              </div>

              <div className="p-5">
                <KeyPerformancePanel
                  sessions={details?.recent_sessions ?? []}
                  isLoading={isDetailsLoading}
                  emptyText="No per-key telemetry is available for this ranked user yet."
                />
              </div>
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
