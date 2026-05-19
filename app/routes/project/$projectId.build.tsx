import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PlanningMachineProvider, usePlanningMachine } from "@/features/planning/machines/PlanningMachineContext";
import { Navigation } from "@/features/planning/components/Navigation";
import { StepContainer } from "@/features/planning/components/StepContainer";
import { DebugPanel } from "@/features/planning/components/DebugPanel";

export const Route = createFileRoute("/project/$projectId/build")({
  component: BuildComponent,
});

function InspectorLogger() {
  const actor = usePlanningMachine();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const subscription = actor.subscribe((snapshot) => {
        console.log("[XState Planning Machine]", {
          value: snapshot.value,
          context: {
            currentStepNumber: snapshot.context.currentStepNumber,
            projectId: snapshot.context.projectId,
            entryPath: snapshot.context.entryPath,
          },
        });
      });

      return () => subscription.unsubscribe();
    }
  }, [actor]);

  return null;
}

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
