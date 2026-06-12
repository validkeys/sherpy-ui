import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { getStepName } from "../step-config";
import {
  getWorkflowArtifactId,
  getWorkflowArtifactName,
  type WorkflowStepNumber,
} from "./machine-to-artifacts.adapter";
import { createLoadingMessage } from "./message-creators/artifact-messages";
import {
  createFormQuestionMessage,
  createFormResponseMessages,
} from "./message-creators/form-messages";
import {
  createCurrentInterviewMessages,
  createInterviewMessages,
} from "./message-creators/interview-messages";
import type { NormalizedWorkflowState } from "./step-normalizer";

/**
 * Creates all messages for a specific workflow step.
 *
 * Orchestrates message creation by:
 * 1. Adding historical messages (form responses, interview Q&A)
 * 2. Adding current interaction (form questions, interview questions)
 * 3. Adding artifact messages (completed artifacts, loading states)
 *
 * @param context - Planning machine context
 * @param stepNumber - Step number (1-10)
 * @param activeState - Normalized workflow state
 * @returns Array of messages for this step
 */
export function createStepMessages(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message[] {
  const messages: Message[] = [];
  const isActiveStep = activeState.stepNumber === stepNumber;

  // Step 1: Gap Analysis Form
  if (stepNumber === 1) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step1Responses,
        context.startedAt,
      ),
    );
    if (
      shouldShowFormQuestion(isActiveStep, activeState, context.step1Responses)
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  // Step 2: Business Requirements Interview
  if (stepNumber === 2) {
    messages.push(...createInterviewMessages(stepNumber, context.step2Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  // Step 3: Technical Requirements Interview
  if (stepNumber === 3) {
    messages.push(...createInterviewMessages(stepNumber, context.step3Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  // Step 5: Implementation Details Form
  if (stepNumber === 5) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step5Responses,
        context.startedAt,
      ),
    );
    if (
      shouldShowFormQuestion(isActiveStep, activeState, context.step5Responses)
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  // Artifact messages (all steps)
  const artifactMessage = createArtifactMessage(
    context,
    stepNumber,
    activeState,
    isActiveStep,
  );
  if (artifactMessage) {
    messages.push(artifactMessage);
  }

  return messages;
}

/**
 * Determines if form question should be shown.
 *
 * Shows form when:
 * - This is the active step
 * - Currently in collecting info state
 * - No responses have been submitted yet
 */
function shouldShowFormQuestion(
  isActiveStep: boolean,
  activeState: NormalizedWorkflowState,
  responses: Record<string, string>,
): boolean {
  if (!isActiveStep) return false;

  const isCollectingInfo =
    activeState.status === STEP_STATES.STEP_1.COLLECTING_INFO ||
    activeState.status === STEP_STATES.STEP_5.COLLECTING_INFO;

  const hasNoResponses = Object.keys(responses).length === 0;

  return isCollectingInfo && hasNoResponses;
}

/**
 * Creates artifact or loading message for a step.
 *
 * Priority:
 * 1. Completed artifact message (if artifact has content)
 * 2. Loading message (if actively generating)
 * 3. null (no message needed)
 */
function createArtifactMessage(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
  isActiveStep: boolean,
): Message | null {
  const artifact = context.artifacts[stepNumber];
  const artifactContent = getArtifactContent(context, stepNumber, artifact);

  // Show completed artifact
  if (artifact && artifactContent?.trim()) {
    return {
      type: "artifact",
      id: `step-${stepNumber}-artifact-message`,
      role: "assistant",
      timestamp: artifact.generatedAt,
      content: `I've created the ${getStepName(stepNumber)} artifact.`,
      artifactName: getWorkflowArtifactName(stepNumber),
      artifactId: getWorkflowArtifactId(stepNumber),
    };
  }

  // Show loading state if actively generating
  if (isActiveStep) {
    return createLoadingMessage(context, stepNumber, activeState);
  }

  return null;
}

/**
 * Gets artifact content, handling Step 7 edits special case.
 *
 * Step 7 (Architecture Decision Records) can have edits in context.step7Edits
 * which take precedence over artifact.content.
 */
function getArtifactContent(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  artifact: PlanningContext["artifacts"][WorkflowStepNumber] | undefined,
): string | undefined {
  if (!artifact) return undefined;

  return stepNumber === 7 && context.step7Edits
    ? context.step7Edits
    : artifact.content;
}
