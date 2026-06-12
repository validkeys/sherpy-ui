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

export type WorkflowChatAdapterInput = {
  context: PlanningContext;
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
  context: PlanningContext,
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
