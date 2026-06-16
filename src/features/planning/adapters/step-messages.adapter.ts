import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../machines/constants";
import type { PlanningContext } from "../machines/types";
import { getStepName } from "../step-config";
import {
  getWorkflowArtifactId,
  getWorkflowArtifactName,
  type WorkflowStepNumber,
} from "./machine-to-artifacts.adapter";
import type { MessageRelevantContext } from "./machine-to-messages.adapter";
import { createLoadingMessage } from "./message-creators/artifact-messages";
import {
  createFormQuestionMessage,
  createFormResponseMessages,
  FORM_FIELDS,
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
 * @param context - Message-relevant context fields (M9 optimization)
 * @param stepNumber - Step number (1-10)
 * @param activeState - Normalized workflow state
 * @returns Array of messages for this step
 */
export function createStepMessages(
  context: MessageRelevantContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message[] {
  const messages: Message[] = [];
  const isActiveStep = activeState.stepNumber === stepNumber;

  // Step 1: Gap Analysis (Form + Interview)
  // BUG-033 FIX: Added interview messages to match Steps 2/3 pattern
  if (stepNumber === 1) {
    // 1. Show initial form responses
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step1Responses,
        context.startedAt,
      ),
    );

    // 2. Show form question if not yet submitted
    if (
      shouldShowFormQuestion(
        isActiveStep,
        activeState,
        context.step1Responses,
        1,
      )
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }

    // 3. Show AI interview messages (after form submitted)
    messages.push(...createInterviewMessages(stepNumber, context.step1Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
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
      shouldShowFormQuestion(
        isActiveStep,
        activeState,
        context.step5Responses,
        5,
      )
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
 * - NOT ALL required fields have been filled yet
 *
 * BUG FIX (2026-06-15):
 * Previously checked `Object.keys(responses).length === 0` which caused the form
 * to disappear after filling just ONE field, preventing users from accessing the
 * second field. Now checks that ALL required form fields have values before hiding
 * the form.
 *
 * @param isActiveStep - Whether this is the currently active workflow step
 * @param activeState - Current normalized workflow state
 * @param responses - Current form field responses (may be partial)
 * @param stepNumber - Step number to determine which form fields are required
 * @returns true if form should be visible, false if all fields are complete
 */
function shouldShowFormQuestion(
  isActiveStep: boolean,
  activeState: NormalizedWorkflowState,
  responses: Record<string, string>,
  stepNumber: 1 | 5,
): boolean {
  if (!isActiveStep) return false;

  const isCollectingInfo =
    activeState.status === STEP_STATES.STEP_1.COLLECTING_INFO ||
    activeState.status === STEP_STATES.STEP_5.COLLECTING_INFO;

  if (!isCollectingInfo) return false;

  // Get required form fields for this step
  const requiredFields = FORM_FIELDS[stepNumber];

  // Check if ALL required fields have non-empty values
  // Form should remain visible until ALL fields are filled
  const allFieldsFilled = requiredFields.every((field) => {
    const value = responses[field.id];
    return value !== undefined && value.trim().length > 0;
  });

  // Show form if NOT all fields are filled
  return !allFieldsFilled;
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
  context: MessageRelevantContext,
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
  context: MessageRelevantContext,
  stepNumber: WorkflowStepNumber,
  artifact: MessageRelevantContext["artifacts"][WorkflowStepNumber] | undefined,
): string | undefined {
  if (!artifact) return undefined;

  return stepNumber === 7 && context.step7Edits
    ? context.step7Edits
    : artifact.content;
}
