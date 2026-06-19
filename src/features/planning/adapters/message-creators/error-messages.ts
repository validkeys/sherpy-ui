import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../../machines/constants";
import type { WorkflowStepNumber } from "../machine-to-artifacts.adapter";
import type { MessageRelevantContext } from "../machine-to-messages.adapter";
import type { NormalizedWorkflowState } from "../step-normalizer";
import { humanizeError } from "./humanize-error";

/**
 * Creates an error message for the interview error state.
 *
 * Returns null unless:
 * 1. The active step matches this step number (prevents duplicate error messages
 *    across all reached steps, since createStepMessages is called per-step)
 * 2. The machine is in the interview error state
 *
 * @param context - Message-relevant context (includes `error`)
 * @param stepNumber - Step number being rendered
 * @param activeState - Normalized workflow state
 * @returns ErrorMessage or null
 */
export function createErrorMessage(
  context: MessageRelevantContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message | null {
  if (activeState.stepNumber !== stepNumber) return null;
  if (activeState.status !== STEP_STATES.INTERVIEW.ERROR) return null;

  return {
    type: "error",
    id: `step-${stepNumber}-error`,
    role: "assistant",
    timestamp: context.updatedAt,
    content: humanizeError(context.error),
  };
}
