import type { Message } from "@/components/workflow-chat/types";
import type { PlanningContext } from "../machines/types";
import {
  getWorkflowStepNumbers,
  type WorkflowStepNumber,
} from "./machine-to-artifacts.adapter";
import { createDividerMessage } from "./message-creators/artifact-messages";
import { createStepMessages } from "./step-messages.adapter";
import {
  type NormalizedWorkflowState,
  normalizeWorkflowState,
} from "./step-normalizer";

/**
 * Minimal context fields required by message adapter chain.
 *
 * Only includes fields actually used by adaptMachineSnapshotToMessages and its
 * helper functions. This enables precise useMemo dependencies in useWorkflowChatData.
 *
 * Fields grouped by usage (M9 optimization):
 * - Step tracking: currentStepNumber, completedSteps
 * - Artifacts: artifacts, step7Edits
 * - Form data: step1Responses, step5Responses
 * - Interview data: step1Answers, step1CurrentQuestion, step1CurrentOptions, step2Answers, step3Answers, step2CurrentQuestion, step3CurrentQuestion, step2CurrentOptions, step3CurrentOptions
 * - Timestamps: startedAt, updatedAt
 */
export type MessageRelevantContext = Pick<
  PlanningContext,
  | "currentStepNumber"
  | "completedSteps"
  | "artifacts"
  | "step7Edits"
  | "step1Responses"
  | "step1Answers" // BUG-033: Add Step 1 interview fields
  | "step1CurrentQuestion"
  | "step1CurrentOptions"
  | "step5Responses"
  | "step2Answers"
  | "step3Answers"
  | "step2CurrentQuestion"
  | "step3CurrentQuestion"
  | "step2CurrentOptions"
  | "step3CurrentOptions"
  | "startedAt"
  | "updatedAt"
  | "error" // BUG-038: Surface error state for retry UI
>;

export type WorkflowChatAdapterInput = {
  context: MessageRelevantContext;
  stateValue: unknown;
};

export function adaptMachineSnapshotToMessages({
  context,
  stateValue,
}: WorkflowChatAdapterInput): Message[] {
  const activeState = normalizeWorkflowState(stateValue);
  const messages: Message[] = [];

  for (const stepNumber of getReachedSteps(context, activeState)) {
    messages.push(createDividerMessage(stepNumber));
    messages.push(...createStepMessages(context, stepNumber, activeState));
  }

  return messages;
}

function getReachedSteps(
  context: MessageRelevantContext,
  activeState: NormalizedWorkflowState,
): readonly WorkflowStepNumber[] {
  const artifactStepNumbers = getWorkflowStepNumbers().filter((stepNumber) => {
    const artifact = context.artifacts[stepNumber];
    const content =
      stepNumber === 7 && context.step7Edits
        ? context.step7Edits
        : artifact?.content;

    return Boolean(artifact && content?.trim());
  });
  const highestReachedStep = Math.max(
    context.currentStepNumber,
    activeState.stepNumber ?? 0,
    ...context.completedSteps,
    ...artifactStepNumbers,
  );

  return getWorkflowStepNumbers().filter(
    (stepNumber) => stepNumber <= highestReachedStep,
  );
}

// M7-009: Step orchestration logic moved to step-messages.adapter.ts
