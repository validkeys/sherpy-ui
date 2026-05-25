import { useEffect } from "react";
import { usePlanningMachine } from "@/features/planning/machines/PlanningMachineContext";

/**
 * Development-only component that logs XState machine state changes.
 * Only active when NODE_ENV === "development".
 */
export function InspectorLogger() {
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
