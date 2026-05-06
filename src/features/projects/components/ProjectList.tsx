import { useState } from "react";
import { useProjects, useUpdateProjectStatus } from "../hooks";
import type { Project } from "../types";
import { ProjectCard } from "./ProjectCard";

type Tab = "active" | "past";

interface ProjectListProps {
  onProjectClick?: (project: Project) => void;
}

export function ProjectList({ onProjectClick }: ProjectListProps) {
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const { mutate: updateStatus } = useUpdateProjectStatus();

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
  const pastProjects =
    projects?.filter(
      (p) => p.status === "archived" || p.status === "complete",
    ) ?? [];

  const shown = activeTab === "active" ? activeProjects : pastProjects;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 px-6 py-4 border-b border-border-1">
        <TabButton
          label="Active"
          active={activeTab === "active"}
          count={activeProjects.length}
          onClick={() => setActiveTab("active")}
        />
        <TabButton
          label="Past"
          active={activeTab === "past"}
          count={pastProjects.length}
          onClick={() => setActiveTab("past")}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <p className="text-sm text-fg-3">Loading…</p>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : shown.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onArchive={() =>
                  updateStatus({ id: project.id, status: "archived" })
                }
                onComplete={() =>
                  updateStatus({ id: project.id, status: "complete" })
                }
                onClick={() => onProjectClick?.(project)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-sm font-medium pb-1 border-b-2 transition-colors",
        active
          ? "border-fg-1 text-fg-1"
          : "border-transparent text-fg-3 hover:text-fg-2",
      ].join(" ")}
    >
      {label}
      {count > 0 && <span className="ml-1.5 text-xs text-fg-3">({count})</span>}
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-sm text-fg-3">
        {tab === "active" ? "No active projects" : "No past projects"}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <p className="text-sm text-fg-3">Failed to load projects</p>
      <button
        type="button"
        onClick={() => onRetry()}
        className="text-xs text-fg-2 hover:text-fg-1 border border-border-1 rounded px-3 py-1.5 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
