import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { getStepName } from "../step-config";
import {
  getWorkflowArtifactId,
  getWorkflowArtifactName,
  getWorkflowStepNumbers,
  type WorkflowStepNumber,
} from "./machine-to-artifacts.adapter";
import {
  createDividerMessage,
  createLoadingMessage,
} from "./message-creators/artifact-messages";
import {
  createFormQuestionMessage,
  createFormResponseMessages,
} from "./message-creators/form-messages";
import {
  createCurrentInterviewMessages,
  createInterviewMessages,
} from "./message-creators/interview-messages";
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

function createStepMessages(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message[] {
  const messages: Message[] = [];
  const isActiveStep = activeState.stepNumber === stepNumber;

  if (stepNumber === 1) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step1Responses,
        context.startedAt,
      ),
    );
    if (
      isActiveStep &&
      activeState.status === STEP_STATES.STEP_1.COLLECTING_INFO &&
      Object.keys(context.step1Responses).length === 0
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  if (stepNumber === 2) {
    messages.push(...createInterviewMessages(stepNumber, context.step2Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  if (stepNumber === 3) {
    messages.push(...createInterviewMessages(stepNumber, context.step3Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  if (stepNumber === 5) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step5Responses,
        context.startedAt,
      ),
    );
    if (
      isActiveStep &&
      activeState.status === STEP_STATES.STEP_5.COLLECTING_INFO &&
      Object.keys(context.step5Responses).length === 0
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  const artifact = context.artifacts[stepNumber];
  const artifactContent =
    stepNumber === 7 && context.step7Edits
      ? context.step7Edits
      : artifact?.content;

  if (artifact && artifactContent?.trim()) {
    messages.push({
      type: "artifact",
      id: `step-${stepNumber}-artifact-message`,
      role: "assistant",
      timestamp: artifact.generatedAt,
      content: `I've created the ${getStepName(stepNumber)} artifact.`,
      artifactName: getWorkflowArtifactName(stepNumber),
      artifactId: getWorkflowArtifactId(stepNumber),
    });
  } else if (isActiveStep) {
    const loadingMessage = createLoadingMessage(
      context,
      stepNumber,
      activeState,
    );

    if (loadingMessage) {
      messages.push(loadingMessage);
    }
  }

  return messages;
}

// M7-008: Message creation logic moved to message-creators/ modules
