import { cn } from "@/lib/utils";

export type StatusPillVariant =
  | "pending"
  | "merging"
  | "filled"
  | "needs-review";

export interface StatusPillProps {
  variant: StatusPillVariant;
}

const CONFIG: Record<
  StatusPillVariant,
  { label: string; pill: boolean; cls: string }
> = {
  pending: { label: "open", pill: false, cls: "text-fg-4" },
  merging: {
    label: "◐ merging…",
    pill: true,
    cls: "text-fg-1 border-border-2",
  },
  filled: { label: "✓ filled", pill: true, cls: "text-success border-success" },
  "needs-review": {
    label: "⚠ needs review",
    pill: true,
    cls: "text-accent border-accent",
  },
};

export function StatusPill({ variant }: StatusPillProps) {
  const { label, pill, cls } = CONFIG[variant];
  return (
    <span
      className={cn(
        "font-mono text-[10px] whitespace-nowrap self-start",
        cls,
        pill && "bg-surface border-[1.5px] rounded-pill px-2 py-0.5",
      )}
    >
      {label}
    </span>
  );
}
