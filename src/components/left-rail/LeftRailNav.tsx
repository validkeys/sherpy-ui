import { useNavigate, useParams } from "@tanstack/react-router";
import { FolderOpen, Plus } from "lucide-react";
import { useProjects } from "@/features/projects/hooks";
import { cn } from "@/lib/utils";

interface LeftRailNavProps {
  onNewProject: () => void;
}

export function LeftRailNav({ onNewProject }: LeftRailNavProps) {
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const currentProjectId = params.projectId;

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];

  const handleProjectClick = (projectId: string) => {
    navigate({
      to: "/project/$projectId/build",
      params: { projectId },
    });
  };

  return (
    <nav aria-label="Project navigation">
      <div className="flex flex-col gap-[2px]">
        <span className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-fg-4 px-2 py-[6px]">
          Workspace
        </span>

        {activeProjects.map((project) => {
          const isActive = project.id === currentProjectId;
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => handleProjectClick(project.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-[10px] text-[13px] rounded-sm cursor-pointer w-full text-left",
                "transition-colors duration-[140ms] ease-out",
                "focus-visible:outline-none focus-visible:shadow-focus",
                "text-fg-2 px-2 py-[6px] hover:bg-border-1 hover:text-fg-1",
              )}
            >
              <FolderOpen size={15} strokeWidth={1.5} />
              <span className="truncate">{project.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onNewProject}
          className="flex items-center gap-[10px] text-[13px] rounded-sm cursor-pointer w-full text-left text-fg-2 px-2 py-[6px] hover:bg-border-1 hover:text-fg-1 transition-colors duration-[140ms] ease-out focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Plus size={15} strokeWidth={1.5} />
          <span>New project</span>
        </button>
      </div>
    </nav>
  );
}
