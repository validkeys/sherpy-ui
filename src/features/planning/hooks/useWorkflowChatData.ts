import { useMemo } from "react";
import {
  type ArtifactRelevantContext,
  adaptMachineContextToArtifacts,
} from "../adapters/machine-to-artifacts.adapter";
import {
  adaptMachineSnapshotToMessages,
  type MessageRelevantContext,
} from "../adapters/machine-to-messages.adapter";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";

const SUBMITTING_STATES = new Set([
  "submitting",
  "checkingComplete",
  "generatingArtifact",
  "generating",
]);

export function useWorkflowChatData() {
  const actor = usePlanningMachine();

  // Use selective useSelector to only subscribe to message-relevant fields (M7-010)
  const messageContext = useSelector(
    (snapshot): MessageRelevantContext => ({
      currentStepNumber: snapshot.context.currentStepNumber,
      completedSteps: snapshot.context.completedSteps,
      artifacts: snapshot.context.artifacts,
      step7Edits: snapshot.context.step7Edits,
      step1Responses: snapshot.context.step1Responses,
      step5Responses: snapshot.context.step5Responses,
      step2Answers: snapshot.context.step2Answers,
      step3Answers: snapshot.context.step3Answers,
      step2CurrentQuestion: snapshot.context.step2CurrentQuestion,
      step3CurrentQuestion: snapshot.context.step3CurrentQuestion,
      step2CurrentOptions: snapshot.context.step2CurrentOptions,
      step3CurrentOptions: snapshot.context.step3CurrentOptions,
      startedAt: snapshot.context.startedAt,
      updatedAt: snapshot.context.updatedAt,
    }),
  );

  // Use selective useSelector to only subscribe to artifact-relevant fields (M7-010)
  const artifactContext = useSelector(
    (snapshot): ArtifactRelevantContext => ({
      artifacts: snapshot.context.artifacts,
      step7Edits: snapshot.context.step7Edits,
    }),
  );

  const stateValue = useSelector((snapshot) => snapshot.value);

  const messages = useMemo(
    () =>
      adaptMachineSnapshotToMessages({ context: messageContext, stateValue }),
    [messageContext, stateValue],
  );
  const artifacts = useMemo(
    () => adaptMachineContextToArtifacts(artifactContext),
    [artifactContext],
  );

  return {
    messages,
    artifacts,
    currentStepNumber: messageContext.currentStepNumber,
    currentQuestion: getCurrentQuestion(messageContext),
    currentOptions: getCurrentOptions(messageContext),
    formValues: getFormValues(messageContext),
    isSubmitting: isSubmittingState(stateValue),
    actor,
  };
}

function getCurrentQuestion(context: MessageRelevantContext): string | null {
  if (context.currentStepNumber === 2) return context.step2CurrentQuestion;
  if (context.currentStepNumber === 3) return context.step3CurrentQuestion;

  return null;
}

function getCurrentOptions(context: MessageRelevantContext): string[] | null {
  if (context.currentStepNumber === 2) return context.step2CurrentOptions;
  if (context.currentStepNumber === 3) return context.step3CurrentOptions;

  return null;
}

function getFormValues(
  context: MessageRelevantContext,
): Record<string, string> | null {
  if (context.currentStepNumber === 1) return context.step1Responses;
  if (context.currentStepNumber === 5) return context.step5Responses;

  return null;
}

function isSubmittingState(stateValue: unknown): boolean {
  if (typeof stateValue === "string") {
    return SUBMITTING_STATES.has(stateValue);
  }

  if (!isRecord(stateValue)) return false;

  return Object.values(stateValue).some(
    (nestedStateValue) =>
      typeof nestedStateValue === "string" &&
      SUBMITTING_STATES.has(nestedStateValue),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
