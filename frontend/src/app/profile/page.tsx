"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://qaaed-keystroke-api.hf.space";

type ProfileStats = {
  firebase_uid: string;
  total_sessions: number;
  best_wpm: number | null;
  average_wpm: number | null;
  best_accuracy: number | null;
  average_accuracy: number | null;
  latest_session_at: string | null;
};

type LeaderboardEntry = ProfileStats & {
  rank: number;
  display_name: string | null;
  photo_url: string | null;
};

type TelemetrySession = {
  id: number;
  firebase_uid: string;
  hardware_profile: string;
  wpm: number;
  accuracy: number;
  created_at: string;
};

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}${suffix}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No sessions yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function displayUserName(entry: LeaderboardEntry, currentUser: User | null) {
  if (entry.firebase_uid === currentUser?.uid) {
    return currentUser.displayName || entry.display_name || "You";
  }

  return entry.display_name || `User ${entry.firebase_uid.slice(0, 6)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [sessions, setSessions] = useState<TelemetrySession[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

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

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [profileResponse, sessionsResponse, leaderboardResponse] =
          await Promise.all([
            fetch(`${API_URL}/users/me/profile`, { headers }),
            fetch(`${API_URL}/telemetry/sessions`, { headers }),
            fetch(`${API_URL}/leaderboard`, { headers }),
          ]);

        if (!profileResponse.ok) throw new Error(await profileResponse.text());
        if (!sessionsResponse.ok) throw new Error(await sessionsResponse.text());
        if (!leaderboardResponse.ok) {
          throw new Error(await leaderboardResponse.text());
        }

        setProfile(await profileResponse.json());
        setSessions(await sessionsResponse.json());
        setLeaderboard(await leaderboardResponse.json());
      } catch (err) {
        console.error("Profile load failed:", err);
        setError("Could not load profile data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const currentRank = useMemo(() => {
    if (!user) return null;
    return leaderboard.find((entry) => entry.firebase_uid === user.uid) ?? null;
  }, [leaderboard, user]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] font-sans text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] font-sans text-zinc-300 selection:bg-zinc-800">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <Navbar
          user={user}
          activePage="profile"
          bordered
          onSignOut={() => signOut(auth)}
        />

        {error && (
          <div className="rounded-lg border border-red-950 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-start gap-4">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-14 w-14 rounded-full border border-zinc-700"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-lg font-medium text-zinc-400">
                    {(user?.displayName || user?.email || "U").slice(0, 1)}
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-100">
                    {user?.displayName || "User Profile"}
                  </h1>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {user?.email || "Signed in user"}
                  </p>
                  <p className="mt-3 text-xs uppercase text-zinc-600">
                    Rank {currentRank ? `#${currentRank.rank}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs uppercase text-zinc-500">Best WPM</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {formatNumber(profile?.best_wpm)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs uppercase text-zinc-500">Avg WPM</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {formatNumber(profile?.average_wpm)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs uppercase text-zinc-500">Best Accuracy</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {formatNumber(profile?.best_accuracy, "%")}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs uppercase text-zinc-500">Sessions</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-100">
                  {profile?.total_sessions ?? 0}
                </p>
              </div>
            </div>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-xs font-medium uppercase text-zinc-500">
                  Recent Sessions
                </h2>
              </div>

              <div className="divide-y divide-zinc-800">
                {isLoading ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">Loading...</p>
                ) : sessions.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">
                    No telemetry sessions saved yet.
                  </p>
                ) : (
                  sessions.slice(0, 8).map((session) => (
                    <div
                      key={session.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">
                          {session.hardware_profile}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-400">
                        {formatNumber(session.wpm)} WPM
                      </p>
                      <p className="text-sm text-zinc-400">
                        {formatNumber(session.accuracy, "%")} accuracy
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-xs font-medium uppercase text-zinc-500">
                Leaderboard
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Ranked by best saved WPM
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
                leaderboard.map((entry) => (
                  <div
                    key={entry.firebase_uid}
                    className={`grid grid-cols-[28px_1fr_auto] items-center gap-3 px-5 py-4 ${
                      entry.firebase_uid === user?.uid ? "bg-zinc-800/30" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-zinc-500">
                      #{entry.rank}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      {entry.photo_url ? (
                        <img
                          src={entry.photo_url}
                          alt=""
                          className="h-8 w-8 rounded-full border border-zinc-700"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-950" />
                      )}
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
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
