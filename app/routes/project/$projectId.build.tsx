import { createFileRoute } from "@tanstack/react-router";
import { InterviewThread } from "@/features/planning/components/InterviewThread";
import { ProjectIntake } from "@/features/planning/components/ProjectIntake";
import { useStepState } from "@/features/planning/hooks";

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
});

function BuildComponent() {
  const { projectId } = Route.useParams();
  const { data: stepState, isLoading } = useStepState(projectId);

  if (isLoading || !stepState) {
    return (
      <div className="flex-1 flex items-center justify-center text-fg-4 text-sm font-mono">
        Loading…
      </div>
    );
  }

  return (
    <ProjectIntake stepState={stepState} projectId={projectId}>
      <InterviewThread stepState={stepState} projectId={projectId} />
    </ProjectIntake>
  );
}
