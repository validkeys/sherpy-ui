import { cn } from "@/lib/utils";

export interface ThreadDividerProps {
  label: string;
  tone?: "default" | "success";
}

export function ThreadDivider({ label, tone = "default" }: ThreadDividerProps) {
  return (
    <div className="flex items-center gap-2.5 opacity-70">
      <div className="flex-1 h-px bg-border-1" />
      <span
        className={cn(
          "font-mono text-[10px] tracking-[0.04em]",
          tone === "success" ? "text-success" : "text-fg-3",
        )}
      >
        ✓ {label}
      </span>
      <div className="flex-1 h-px bg-border-1" />
    </div>
  );
}
