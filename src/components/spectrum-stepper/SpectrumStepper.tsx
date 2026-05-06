import { cn } from "@/lib/utils";

export interface Stage {
  id: string;
  num: number;
  name: string;
  status: "pending" | "now" | "complete" | "skipped";
}

export interface SpectrumStepperProps {
  stages: Stage[];
  activeIndex: number;
  onStageClick?: (i: number) => void;
}

function Segment({
  stage,
  isFirst,
  isLast,
  onClick,
}: {
  stage: Stage;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const segColor =
    stage.num <= 9 ? `var(--bot-${stage.num})` : "var(--neutral-5)";
  const glowVar = stage.num <= 9 ? `var(--bot-${stage.num}-glow)` : null;

  const fillOpacityClass =
    stage.status === "pending"
      ? "opacity-[0.18] group-hover/seg:opacity-[0.85]"
      : stage.status === "complete"
        ? "opacity-100 group-hover/seg:opacity-[0.85]"
        : stage.status === "skipped"
          ? "opacity-[0.08] group-hover/seg:opacity-[0.25]"
          : "opacity-100";

  const borderRadiusClass = isFirst
    ? "rounded-l-full rounded-r-[2px]"
    : isLast
      ? "rounded-l-[2px] rounded-r-full"
      : "rounded-[2px]";

  const glowShadow =
    stage.status === "now" && glowVar
      ? `0 0 0 1px rgba(255,255,255,0.6) inset, 0 0 12px ${glowVar}`
      : undefined;

  return (
    <button
      type="button"
      className="group/seg flex-1 relative focus-visible:outline-none focus-visible:z-10"
      onClick={onClick}
      aria-label={`Stage ${stage.num}: ${stage.name} — ${stage.status}`}
    >
      {/* Colored fill bar */}
      <span
        aria-hidden
        style={
          {
            "--seg-color": segColor,
            "--seg-glow": glowShadow ?? "none",
          } as React.CSSProperties
        }
        className={cn(
          "absolute inset-0",
          borderRadiusClass,
          fillOpacityClass,
          "bg-[--seg-color] [box-shadow:var(--seg-glow)]",
          "motion-safe:transition-[opacity,box-shadow] motion-safe:duration-[140ms] motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        )}
      />

      {/* Tooltip — shown on hover via group-hover */}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2",
          "translate-y-1 opacity-0 pointer-events-none z-10",
          "group-hover/seg:translate-y-0 group-hover/seg:opacity-100",
          "motion-safe:transition-[opacity,transform] motion-safe:duration-[140ms] motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          "bg-inverse text-fg-on-inverse",
          "flex flex-col items-start gap-[2px]",
          "px-[10px] py-[6px] rounded-sm shadow-md whitespace-nowrap text-[12px] leading-snug",
        )}
      >
        <span className="font-mono text-[10px] text-fg-4 tracking-[0.04em] leading-none">
          stage {String(stage.num).padStart(2, "0")}
        </span>
        <span>{stage.name}</span>
        {/* Downward arrow */}
        <span
          aria-hidden
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-solid border-transparent border-t-[var(--bg-inverse)]"
        />
      </span>
    </button>
  );
}

export function SpectrumStepper({
  stages,
  activeIndex,
  onStageClick,
}: SpectrumStepperProps) {
  return (
    <div className="px-8 pt-7 shrink-0">
      <div
        className="flex h-[5px] gap-[2px]"
        role="progressbar"
        aria-label="Workflow stages"
        aria-valuemin={0}
        aria-valuemax={stages.length}
        aria-valuenow={activeIndex + 1}
      >
        {stages.map((stage, i) => (
          <Segment
            key={stage.id}
            stage={stage}
            isFirst={i === 0}
            isLast={i === stages.length - 1}
            onClick={() => onStageClick?.(i)}
          />
        ))}
      </div>
    </div>
  );
}
