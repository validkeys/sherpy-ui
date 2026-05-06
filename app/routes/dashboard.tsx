import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { LeftRail } from "../../src/components/left-rail";
import { CreateProjectFlow } from "../../src/features/projects/components/CreateProjectFlow";
import { ProjectList } from "../../src/features/projects/components/ProjectList";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const handleProjectClick = useCallback(
    (project: { id: string }) => {
      navigate({
        to: "/project/$projectId/build",
        params: { projectId: project.id },
      });
    },
    [navigate],
  );

  return (
    <div className="grid grid-cols-[var(--left-rail-width)_1fr] h-screen min-h-[760px]">
      <LeftRail onNewProject={() => setCreateOpen(true)} />
      <main className="flex flex-col bg-page overflow-hidden">
        <ProjectList onProjectClick={handleProjectClick} />
      </main>
      <CreateProjectFlow
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
