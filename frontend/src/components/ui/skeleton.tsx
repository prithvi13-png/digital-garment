export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 ${className}`}
    />
  );
}
