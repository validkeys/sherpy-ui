/**
 * Automated Step Component for Steps 4, 6, 8, 9, 10
 * Displays loading state during AI generation and artifact preview when complete
 */

import { useSelector } from "../machines/PlanningMachineContext";

type Props = {
  stepKey: string;
  stepName: string;
};

const STEP_NUMBERS: Record<string, number> = {
  step4_styleAnchors: 4,
  step6_definitionOfDone: 6,
  step8_deliveryTimeline: 8,
  step9_qaTestPlan: 9,
  step10_summaries: 10,
};

export function AutomatedStep({ stepKey, stepName }: Props) {
  const stepNumber = STEP_NUMBERS[stepKey];

  // MUST call hooks before any early returns (Rules of Hooks)
  const artifact = useSelector(
    (state) => state.context.artifacts[stepNumber || 0],
  );
  const currentState = useSelector((state) => state.value);

  if (!stepNumber) {
    console.error(`[AutomatedStep] Invalid stepKey: ${stepKey}`);
    return null;
  }

  // Determine if this step is currently generating
  const isGenerating =
    typeof currentState === "object" && currentState !== null
      ? Object.keys(currentState).some((key) =>
          key.includes("generatingArtifact"),
        )
      : false;

  return (
    <div className="automated-step">
      <h2>{stepName}</h2>
      {isGenerating ? (
        <div className="generating">
          <div className="spinner" />
          <p>Generating {stepName}...</p>
        </div>
      ) : artifact ? (
        <div className="artifact-preview">
          <div className="artifact-meta">
            <span className="artifact-type">{artifact.type.toUpperCase()}</span>
            <span className="artifact-date">
              Generated: {new Date(artifact.generatedAt).toLocaleString()}
            </span>
          </div>
          <pre className="artifact-content">{artifact.content}</pre>
        </div>
      ) : (
        <div className="no-artifact">
          <p>No artifact generated yet.</p>
        </div>
      )}
    </div>
  );
}
