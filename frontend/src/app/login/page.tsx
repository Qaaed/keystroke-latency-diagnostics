"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import LoadingState from "@/components/LoadingState";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) router.push("/");
  }, [isAuthLoading, router, user]);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      setIsAuthenticating(false);
    }
  };

  if (isAuthLoading || user) {
    return <LoadingState label="Authenticating" fullScreen />;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center font-sans text-zinc-100 p-6 selection:bg-zinc-800">
      <div className="max-w-sm w-full space-y-8">
        
        {/* Sleek Minimal Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-zinc-100">
            Keynostics
          </h1>
          <p className="text-sm leading-6 text-zinc-500">
            Measure typing speed, accuracy, and key latency, then compete on
            the leaderboard.
          </p>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-200">
            Use a computer for accurate scores
          </p>
          <p className="mt-1 text-xs leading-5 text-yellow-100/70">
            Mobile keyboards can distort latency measurements and typing
            results.
          </p>
        </div>
        
        {/* Simple, High-Contrast Form Area */}
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 rounded-xl">
          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className="w-full py-2.5 px-4 bg-zinc-100 text-zinc-900 font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isAuthenticating ? "Connecting..." : "Continue with Google"}
          </button>
        </div>

      </div>
    </main>
  );
}
