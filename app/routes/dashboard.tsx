import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AppLayout } from "../../src/components/layouts";
import { ProjectList } from "../../src/features/projects/components/ProjectList";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: typeof search.error === "string" ? search.error : undefined,
      projectId:
        typeof search.projectId === "string" ? search.projectId : undefined,
    };
  },
});

function DashboardComponent() {
  const navigate = useNavigate();
  const { error, projectId } = Route.useSearch();

  const errorMessages: Record<
    string,
    { title: string; message: string; action?: string }
  > = {
    project_not_found: {
      title: "Project Not Found",
      message: `The project "${projectId}" does not exist. It may have been deleted or the link is invalid.`,
      action: "Create a new project to get started.",
    },
    orphaned_state: {
      title: "Project Data Mismatch",
      message: `The project "${projectId}" exists in your browser but not in the database. This can happen if the project was never properly created.`,
      action: "Would you like to clean up the orphaned data?",
    },
  };

  const errorInfo = error ? errorMessages[error] : null;

  return (
    <AppLayout>
      {errorInfo && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">{errorInfo.title}</h3>
              <p className="text-red-800 text-sm mt-1">{errorInfo.message}</p>
              {errorInfo.action && (
                <p className="text-red-700 text-sm mt-2">{errorInfo.action}</p>
              )}
              {error === "orphaned_state" && projectId && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(`planning-machine-${projectId}`);
                    window.location.reload();
                  }}
                  className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Clean Up Orphaned Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
