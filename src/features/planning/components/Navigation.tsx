/**
 * Navigation Component
 * Displays step progress and provides Back/Next navigation controls
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EVENT_TYPES } from "../machines/constants";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";

const TOTAL_STEPS = 10;

export function Navigation() {
  const actor = usePlanningMachine();

  // Primitive selectors to avoid unnecessary re-renders
  const currentStepNumber = useSelector(
    (state) => state.context.currentStepNumber,
  );
  const completedSteps = useSelector((state) => state.context.completedSteps);

  // Determine if navigation buttons should be enabled
  const canGoBack = currentStepNumber > 1;
  const canGoNext =
    currentStepNumber < TOTAL_STEPS &&
    completedSteps.includes(currentStepNumber);

  const handleBack = () => {
    if (canGoBack) {
      actor.send({ type: EVENT_TYPES.BACK });
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      actor.send({ type: EVENT_TYPES.NEXT });
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border-1 px-8 py-4">
      {/* Step Progress */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-fg-4 tracking-wide">
          STEP {String(currentStepNumber).padStart(2, "0")}
        </span>
        <span className="text-fg-4">·</span>
        <span className="font-mono text-xs text-fg-3">of {TOTAL_STEPS}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleBack}
          disabled={!canGoBack}
          variant="secondary"
          size="sm"
          className="gap-1"
        >
          <ChevronLeft className="size-3.5" />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          variant="default"
          size="sm"
          className="gap-1"
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
