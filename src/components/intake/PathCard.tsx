import { cn } from "@/lib/utils";

export interface PathCardProps {
  title: string;
  subtitle: string;
  meta?: string;
  recommended?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function PathCard({
  title,
  subtitle,
  meta,
  recommended = false,
  disabled = false,
  onClick,
}: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3.5 pt-3.5 pb-3 rounded-[6px] border-[1.5px] flex flex-col gap-1 text-left w-full",
        "focus-visible:outline-none focus-visible:shadow-focus",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer",
        recommended
          ? "border-border-emph bg-sunken"
          : "border-border-2 bg-surface",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-fg-1">{title}</span>
          {recommended && (
            <span className="font-mono text-[9px] text-fg-3 uppercase tracking-wider">
              Recommended
            </span>
          )}
        </div>
        {meta && (
          <span className="font-mono text-[9.5px] text-fg-3 shrink-0">
            {meta}
          </span>
        )}
      </div>
      <p className="text-[11.5px] text-fg-3 leading-snug m-0">{subtitle}</p>
    </button>
  );
}
