import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose(); // Close modal on success
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to authenticate with authorization server.",
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm">
      {/* Click away to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      {/* The Glassmorphism Terminal Window */}
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-8 shadow-[0_0_40px_rgba(34,211,238,0.1)] flex flex-col gap-6 transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-xl font-black tracking-widest text-white">
            NODE_<span className="text-cyan-400">AUTH</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="text-sm text-slate-400 font-mono leading-relaxed">
          <p>
            Please authenticate to access the telemetry database and sync local
            hardware profiles.
          </p>
        </div>

        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded font-mono">
            ERR: {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className="group relative flex items-center justify-center gap-3 w-full py-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg text-slate-300 font-bold tracking-widest transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            <span className="relative flex items-center gap-2">
              {isAuthenticating
                ? "VERIFYING CREDENTIALS..."
                : "INITIALIZE GOOGLE HANDSHAKE"}
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-center text-slate-600 tracking-widest uppercase font-mono mt-4">
          Encrypted Connection Established
        </div>
      </div>
    </div>
  );
}
