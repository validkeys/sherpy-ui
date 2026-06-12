import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../../machines/constants";
import type { PlanningContext } from "../../machines/types";
import { getStepName } from "../../step-config";
import type { WorkflowStepNumber } from "../machine-to-artifacts.adapter";
import type { NormalizedWorkflowState } from "../step-normalizer";

export const STAGE_COLORS: Record<WorkflowStepNumber, string> = {
  1: "var(--bot-1)",
  2: "var(--bot-2)",
  3: "var(--bot-3)",
  4: "var(--bot-4)",
  5: "var(--bot-5)",
  6: "var(--bot-6)",
  7: "var(--bot-7)",
  8: "var(--bot-8)",
  9: "var(--bot-9)",
  10: "var(--neutral-4)",
};

export function createDividerMessage(stepNumber: WorkflowStepNumber): Message {
  return {
    type: "divider",
    id: `divider-step-${stepNumber}`,
    stageNumber: stepNumber,
    stageName: getStepName(stepNumber),
    stageColor: STAGE_COLORS[stepNumber],
  };
}

export function createLoadingMessage(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message | null {
  const shouldShowArtifactGeneration =
    activeState.status === STEP_STATES.STEP_1.ASSESSING_NEED ||
    activeState.status === STEP_STATES.STEP_5.SUBMITTING ||
    activeState.status === STEP_STATES.AUTOMATED.GENERATING;

  if (!shouldShowArtifactGeneration) return null;

  return {
    type: "loading",
    id: `step-${stepNumber}-loading-artifact`,
    role: "assistant",
    timestamp: context.updatedAt,
    content: `Generating ${getStepName(stepNumber)}...`,
  };
}
