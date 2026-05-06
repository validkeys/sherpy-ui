import { type Mode, ModeToggle } from "@/components/mode-toggle";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SkipAction {
  label: string;
  onClick?: () => void;
}

export interface HeaderProps {
  breadcrumb: BreadcrumbItem[];
  stageNum: number;
  stageTotal: number;
  stageName: string;
  mode: Mode;
  artifactCount?: number;
  onModeChange: (mode: Mode) => void;
  skipAction?: SkipAction;
}

export function Header({
  breadcrumb,
  stageNum,
  stageTotal,
  stageName,
  mode,
  artifactCount,
  onModeChange,
  skipAction,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-8 pt-4 shrink-0">
      <nav aria-label="breadcrumb">
        <ol className="flex items-center gap-[6px] font-mono text-[11px] text-fg-3 tracking-[0.04em] list-none m-0 p-0">
          {breadcrumb.map((item, i) => (
            <li key={i} className="flex items-center gap-[6px]">
              {i > 0 && <span className="text-fg-4">/</span>}
              {i === breadcrumb.length - 1 ? (
                <span className="text-fg-1">{item.label}</span>
              ) : (
                <span className="text-fg-3 cursor-pointer hover:text-fg-1 transition-colors duration-[140ms]">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex items-center gap-2 font-mono text-[11px] text-fg-3">
        <span className="text-fg-4">
          stage {String(stageNum).padStart(2, "0")} of {stageTotal}
        </span>
        <span className="text-fg-4">·</span>
        <span className="text-fg-1 font-medium">{stageName}</span>
      </div>

      <div className="flex items-center gap-2">
        {skipAction && (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full text-[11px] font-medium"
            onClick={skipAction.onClick}
          >
            {skipAction.label} →
          </Button>
        )}
        <ModeToggle
          mode={mode}
          artifactCount={artifactCount}
          onModeChange={onModeChange}
        />
        <ThemeToggle />
      </div>
    </header>
  );
}
