"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If they are already logged in, bounce them to the dashboard
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      } else {
        setIsChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Firebase auth state listener will automatically redirect to "/" on success
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to authenticate. Please try again.");
      setIsAuthenticating(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-cyan-500 animate-pulse">
        [ VERIFYING_CREDENTIALS... ]
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-slate-100 p-6">
      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-blue-500 tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            KEYSTROKE_DIAG_V1
          </h1>
          <p className="text-slate-500 mt-2 text-sm tracking-widest uppercase">
            Unauthorized Access Detected
          </p>
        </div>
        
        <div className="bg-slate-900/50 p-8 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-sm">
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            You must establish a secure session to access the diagnostic engine, run latency tests, and sync hardware telemetry.
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className="w-full py-3.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold rounded hover:bg-cyan-500 hover:text-black transition-all tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuthenticating ? "AUTHENTICATING..." : "INITIALIZE GOOGLE HANDSHAKE"}
          </button>
        </div>
      </div>
    </main>
  );
}