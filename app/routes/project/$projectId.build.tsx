import { createFileRoute } from "@tanstack/react-router";
import { DebugPanel } from "@/features/planning/components/DebugPanel";
import { Navigation } from "@/features/planning/components/Navigation";
import { StepContainer } from "@/features/planning/components/StepContainer";
import { PlanningMachineProvider } from "@/features/planning/machines/PlanningMachineContext";
import { InspectorLogger } from "./-components";

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
  ssr: false,
});

function BuildComponent() {
  const { projectId } = Route.useParams();

  return (
    <PlanningMachineProvider
      input={{ projectId, entryPath: "new-project" }}
      storageKey={`planning-machine-${projectId}`}
    >
      <InspectorLogger />
      <Navigation />
      <StepContainer />
      <DebugPanel />
    </PlanningMachineProvider>
  );
}
