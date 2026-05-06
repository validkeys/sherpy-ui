import { CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeftRailNav } from "./LeftRailNav";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  count?: number;
}

interface NavSection {
  eyebrow: string;
  items: NavItem[];
}

interface UserInfo {
  initials: string;
  name: string;
  handle: string;
}

interface LeftRailProps {
  user?: UserInfo;
  className?: string;
  onNewProject?: () => void;
}

const RECENT_RUNS_NAV: NavSection = {
  eyebrow: "Recent runs",
  items: [
    {
      label: "biz-req-04",
      icon: <CheckCircle2 size={15} strokeWidth={1.5} />,
    },
    {
      label: "biz-req-03",
      icon: <CheckCircle2 size={15} strokeWidth={1.5} />,
    },
    {
      label: "style-anchors",
      icon: <FileText size={15} strokeWidth={1.5} />,
    },
  ],
};

const DEFAULT_USER: UserInfo = {
  initials: "DU",
  name: "Demo User",
  handle: "@demo",
};

export function LeftRail({
  user = DEFAULT_USER,
  className,
  onNewProject = () => {},
}: LeftRailProps) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-[18px] bg-sunken border-r border-border-1",
        "px-[14px] py-4 min-w-0",
        className,
      )}
    >
      {/* Brand block */}
      <div className="flex items-center gap-2 px-2 py-[6px]">
        {/* Inline SVG brand mark — two stacked chevrons */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
          className="text-inverse shrink-0"
        >
          <path
            d="M4 22 L16 10 L28 22"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 26 L16 18 L24 26"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
        </svg>
        <span className="text-[16px] font-medium text-fg-1 tracking-[-0.02em]">
          sherpy
        </span>
        <span className="ml-auto font-mono text-[10px] text-fg-4 border border-border-1 rounded px-[6px] py-[2px] bg-surface">
          v0.4.2
        </span>
      </div>

      {/* Nav sections */}
      <LeftRailNav onNewProject={onNewProject} />
      <NavSectionGroup section={RECENT_RUNS_NAV} />

      {/* Pinned footer */}
      <div className="mt-auto flex items-center gap-[10px] px-2 py-2 border-t border-border-1">
        <div className="size-[26px] rounded-pill bg-border-1 grid place-items-center font-mono text-[11px] font-medium text-fg-1 shrink-0">
          {user.initials}
        </div>
        <div className="flex flex-col leading-[1.2] min-w-0">
          <span className="text-[12px] text-fg-1 truncate">{user.name}</span>
          <span className="text-[11px] text-fg-4 font-mono truncate">
            {user.handle}
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavSectionGroup({ section }: { section: NavSection }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-fg-4 px-2 py-[6px]">
        {section.eyebrow}
      </span>
      {section.items.map((item) => (
        <NavItemRow key={item.label} item={item} />
      ))}
    </div>
  );
}

function NavItemRow({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-[10px] text-[13px] rounded-sm cursor-pointer w-full text-left",
        "transition-colors duration-[140ms] ease-out",
        "focus-visible:outline-none focus-visible:shadow-focus",
        item.active
          ? "bg-surface text-fg-1 border border-border-1 shadow-xs px-[7px] py-[5px]"
          : "text-fg-2 px-2 py-[6px] hover:bg-border-1 hover:text-fg-1",
      )}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
      {item.count !== undefined && (
        <span className="ml-auto font-mono text-[10px] text-fg-4">
          {item.count}
        </span>
      )}
    </button>
  );
}
