import { cn } from "@/lib/utils";

export interface MergeProgressProps {
  value: number; // 0–100
}

export function MergeProgress({ value }: MergeProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Merge progress"
      className="h-1 w-full bg-border-2 rounded-pill overflow-hidden"
    >
      <div
        className={cn(
          "h-full w-[--pct] rounded-pill transition-[width] duration-500 ease-out",
          pct === 100 ? "bg-success" : "bg-accent animate-pulse",
        )}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
