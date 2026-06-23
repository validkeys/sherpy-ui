import { useNavigate, useParams } from "@tanstack/react-router";
import { FolderOpen, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { DeleteConfirmDialog } from "@/features/projects/components/DeleteConfirmDialog";
import { useDeleteProject, useProjects } from "@/features/projects/hooks";
import { cn } from "@/lib/utils";

interface LeftRailNavProps {
  onNewProject: () => void;
}

export function LeftRailNav({ onNewProject }: LeftRailNavProps) {
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const currentProjectId = params.projectId;
  const [deleteConfirm, setDeleteConfirm] = useState<{
    projectId: string;
    projectName: string;
  } | null>(null);

  // Handle navigation after successful deletion
  const { mutate: deleteProject, isPending } = useDeleteProject({
    onSuccess: (deletedId) => {
      // Navigate to dashboard if deleted project was current
      if (deletedId === currentProjectId) {
        navigate({
          to: "/dashboard",
          search: { error: undefined, projectId: undefined },
        });
      }
    },
  });

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];

  const handleProjectClick = useCallback(
    (projectId: string) => {
      navigate({
        to: "/project/$projectId/build",
        params: { projectId },
      });
    },
    [navigate],
  );

  const handleDeleteClick = useCallback(
    (projectId: string, projectName: string) => {
      setDeleteConfirm({ projectId, projectName });
    },
    [],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;

    deleteProject(deleteConfirm.projectId);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteProject]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  return (
    <nav aria-label="Project navigation">
      {deleteConfirm && (
        <DeleteConfirmDialog
          projectName={deleteConfirm.projectName}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isPending}
        />
      )}
      <div className="flex flex-col gap-[2px]">
        <span className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-fg-4 px-2 py-[6px]">
          Workspace
        </span>

        {activeProjects.map((project) => {
          const isActive = project.id === currentProjectId;
          return (
            <div key={project.id} className="group relative">
              <button
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
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton
                  icon={<X size={12} strokeWidth={2} />}
                  label={`Delete ${project.name}`}
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(project.id, project.name);
                  }}
                />
              </div>
            </div>
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
