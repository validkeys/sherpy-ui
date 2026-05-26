/**
 * Navigation Component
 * Displays step progress and provides Back/Next navigation controls
 */

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
      actor.send({ type: "BACK" });
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      actor.send({ type: "NEXT" });
    }
  };

  return (
    <div className="navigation">
      <div className="progress-indicator">
        Step {currentStepNumber} of {TOTAL_STEPS}
      </div>
      <div className="navigation-buttons">
        <button
          type="button"
          onClick={handleBack}
          disabled={!canGoBack}
          className="btn-back"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="btn-next"
        >
          Next
        </button>
      </div>
    </div>
  );
}
