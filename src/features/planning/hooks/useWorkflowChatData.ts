import { useMemo } from "react";
import { adaptMachineContextToArtifacts } from "../adapters/machine-to-artifacts.adapter";
import { adaptMachineSnapshotToMessages } from "../adapters/machine-to-messages.adapter";
import {
  usePlanningMachine,
  useSelector,
} from "../machines/PlanningMachineContext";
import type { PlanningContext } from "../machines/types";

const SUBMITTING_STATES = new Set([
  "submitting",
  "checkingComplete",
  "generatingArtifact",
  "generating",
]);

export function useWorkflowChatData() {
  const actor = usePlanningMachine();
  const { context, stateValue } = useSelector((snapshot) => ({
    context: snapshot.context,
    stateValue: snapshot.value,
  }));

  const messages = useMemo(
    () => adaptMachineSnapshotToMessages({ context, stateValue }),
    [context, stateValue],
  );
  const artifacts = useMemo(
    () => adaptMachineContextToArtifacts(context),
    [context],
  );

  return {
    messages,
    artifacts,
    currentStepNumber: context.currentStepNumber,
    currentQuestion: getCurrentQuestion(context),
    currentOptions: getCurrentOptions(context),
    isSubmitting: isSubmittingState(stateValue),
    actor,
  };
}

function getCurrentQuestion(context: PlanningContext): string | null {
  if (context.currentStepNumber === 2) return context.step2CurrentQuestion;
  if (context.currentStepNumber === 3) return context.step3CurrentQuestion;

  return null;
}

function getCurrentOptions(context: PlanningContext): string[] | null {
  if (context.currentStepNumber === 2) return context.step2CurrentOptions;
  if (context.currentStepNumber === 3) return context.step3CurrentOptions;

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
