import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileText } from "lucide-react";
import { useProjects } from "@/features/projects/hooks";
import type { Project } from "@/features/projects/types";
import { cn } from "@/lib/utils";
import { LeftRailNav } from "./LeftRailNav";

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

const DEFAULT_USER: UserInfo = {
  initials: "DU",
  name: "Demo User",
  handle: "@demo",
};

/**
 * Get icon for project based on status
 */
function getProjectIcon(project: Project) {
  // Could be extended to show different icons based on project type or status
  return project.status === "complete" ? (
    <CheckCircle2 size={15} strokeWidth={1.5} />
  ) : (
    <FileText size={15} strokeWidth={1.5} />
  );
}

export function LeftRail({
  user = DEFAULT_USER,
  className,
  onNewProject = () => {},
}: LeftRailProps) {
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  // Get 3 most recently touched projects for "Recent runs"
  const recentProjects =
    projects
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.lastTouchedAt).getTime() -
          new Date(a.lastTouchedAt).getTime(),
      )
      .slice(0, 3) ?? [];

  const handleRecentProjectClick = (projectId: string) => {
    navigate({
      to: "/project/$projectId/build",
      params: { projectId },
    });
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-sunken border-r border-border-1 h-full max-h-screen",
        "px-[14px] py-4 min-w-0",
        className,
      )}
    >
      {/* Brand block - no shrink */}
      <div className="flex items-center gap-2 px-2 py-[6px] shrink-0 flex-shrink-0">
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

      {/* Scrollable content - grows to fill space */}
      <div className="flex flex-col gap-[18px] mt-[18px] flex-1 overflow-y-auto min-h-0">
        {/* Nav sections */}
        <LeftRailNav onNewProject={onNewProject} />

        {/* Recent runs - dynamically populated from recent projects */}
        {recentProjects.length > 0 && (
          <div className="flex flex-col gap-[2px]">
            <span className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-fg-4 px-2 py-[6px]">
              Recent runs
            </span>
            {recentProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleRecentProjectClick(project.id)}
                className={cn(
                  "flex items-center gap-[10px] text-[13px] rounded-sm cursor-pointer w-full text-left",
                  "transition-colors duration-[140ms] ease-out",
                  "focus-visible:outline-none focus-visible:shadow-focus",
                  "text-fg-2 px-2 py-[6px] hover:bg-border-1 hover:text-fg-1",
                )}
              >
                {getProjectIcon(project)}
                <span className="truncate">{project.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pinned footer - no shrink */}
      <div className="mt-[18px] flex items-center gap-[10px] px-2 py-2 border-t border-border-1 shrink-0 flex-shrink-0">
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
