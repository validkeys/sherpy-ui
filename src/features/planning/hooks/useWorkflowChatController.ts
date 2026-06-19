import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Artifact, Message } from "@/components/workflow-chat";
import { EVENT_TYPES } from "../machines/constants";
import type { PlanningEvent } from "../machines/types";
import { useWorkflowChatData } from "./useWorkflowChatData";

type WorkflowChatActor = {
  send: (event: PlanningEvent) => void;
};

type WorkflowChatControllerInput = {
  actor: WorkflowChatActor;
  currentStepNumber: number;
  currentQuestionRef: React.RefObject<string | null>;
};

type WorkflowChatActions = {
  onSubmitMessage?: (message: string) => void;
  onSelectOption?: (question: string, option: string, index: number) => void;
  onSubmitForm?: (question: string, values: Record<string, string>) => void;
  onFormValueChange?: (
    question: string,
    fieldId: string,
    value: string,
  ) => void;
  onRetry?: () => void;
};

type WorkflowChatController = WorkflowChatActions & {
  messages: Message[];
  artifacts: Artifact[];
  disabled: boolean;
  isSubmitting: boolean;
  formValues: Record<string, string> | null;
  autoSubmit: boolean;
};

/**
 * Returns stable action callbacks using refs to avoid re-renders.
 * Callbacks don't depend on currentQuestion to prevent cascading updates.
 */
export function useWorkflowChatController(): WorkflowChatController {
  const {
    messages,
    artifacts,
    isSubmitting,
    actor,
    currentStepNumber,
    currentQuestion,
    formValues,
  } = useWorkflowChatData();

  // Use ref to keep currentQuestion in sync without triggering re-renders
  const currentQuestionRef = useRef(currentQuestion);

  // Keep ref in sync with latest question
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const actions = useMemo(
    () =>
      createWorkflowChatActions({
        actor,
        currentStepNumber,
        currentQuestionRef,
      }),
    [actor, currentStepNumber],
  );

  const onRetry = useCallback(() => {
    actor.send({ type: "RETRY", stepNumber: currentStepNumber });
  }, [actor, currentStepNumber]);

  const isInteractiveInterview =
    currentStepNumber === 2 || currentStepNumber === 3;

  return {
    messages,
    artifacts,
    disabled: isSubmitting,
    isSubmitting,
    formValues,
    autoSubmit: isInteractiveInterview,
    ...actions,
    onRetry,
  };
}

export function createWorkflowChatActions({
  actor,
  currentStepNumber,
  currentQuestionRef,
}: WorkflowChatControllerInput): WorkflowChatActions {
  const isInteractiveInterview =
    currentStepNumber === 2 || currentStepNumber === 3;
  const isInteractiveForm = currentStepNumber === 1 || currentStepNumber === 5;

  return {
    onSubmitMessage: isInteractiveInterview
      ? (message) => {
          const currentQuestion = currentQuestionRef.current;
          if (!currentQuestion) return;
          submitInterviewAnswer(
            actor,
            currentStepNumber,
            currentQuestion,
            message,
          );
        }
      : undefined,
    onSelectOption: isInteractiveInterview
      ? (question, option) => {
          const currentQuestion = currentQuestionRef.current;
          if (question !== currentQuestion) return;
          if (!currentQuestion) return;
          submitInterviewAnswer(actor, currentStepNumber, question, option);
        }
      : undefined,
    onSubmitForm: isInteractiveForm
      ? (_question, values) => {
          submitFormResponses(actor, currentStepNumber, values);
        }
      : undefined,
    onFormValueChange: isInteractiveForm
      ? (_question, fieldId, value) => {
          updateFormField(actor, currentStepNumber as 1 | 5, fieldId, value);
        }
      : undefined,
  };
}

function submitInterviewAnswer(
  actor: WorkflowChatActor,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
) {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) return;

  actor.send({
    type: EVENT_TYPES.SUBMIT_ANSWER,
    stepNumber,
    question,
    answer: trimmedAnswer,
  });
}

function submitFormResponses(
  actor: WorkflowChatActor,
  stepNumber: 1 | 5,
  responses: Record<string, string>,
) {
  actor.send({
    type: EVENT_TYPES.SUBMIT_FORM,
    stepNumber,
    responses,
  });
}

function updateFormField(
  actor: WorkflowChatActor,
  stepNumber: 1 | 5,
  fieldId: string,
  value: string,
) {
  actor.send({
    type: EVENT_TYPES.UPDATE_FORM_FIELD,
    stepNumber,
    fieldId,
    value,
  });
}
