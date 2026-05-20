type LoadingStateProps = {
  label?: string;
  className?: string;
  fullScreen?: boolean;
};

export default function LoadingState({
  label = "Loading",
  className = "",
  fullScreen = false,
}: LoadingStateProps) {
  const content = (
    <div className={`flex items-center gap-3 text-sm text-zinc-500 ${className}`}>
      <span
        className="relative flex h-5 w-5 flex-none items-center justify-center"
        aria-hidden="true"
      >
        <span className="absolute h-5 w-5 animate-ping rounded-full border border-zinc-500/40" />
        <span className="h-3 w-3 animate-pulse rounded-full bg-zinc-300" />
      </span>
      <span>{label}</span>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] font-sans">
      {content}
    </div>
  );
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-5 py-5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/40"
        >
          <div className="h-full w-1/2 animate-pulse bg-zinc-800/70" />
        </div>
      ))}
    </div>
  );
}
