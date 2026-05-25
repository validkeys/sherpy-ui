import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AppLayout } from "../../src/components/layouts";
import { ProjectList } from "../../src/features/projects/components/ProjectList";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <ProjectList
        onProjectClick={useCallback(
          (project: { id: string }) => {
            navigate({
              to: "/project/$projectId/build",
              params: { projectId: project.id },
            });
          },
          [navigate],
        )}
      />
    </AppLayout>
  );
}
