import { useMemo } from "react";
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
  currentQuestion: string | null;
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
};

type WorkflowChatController = WorkflowChatActions & {
  messages: Message[];
  artifacts: Artifact[];
  disabled: boolean;
  isSubmitting: boolean;
  formValues: Record<string, string> | null;
};

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

  const actions = useMemo(
    () =>
      createWorkflowChatActions({
        actor,
        currentStepNumber,
        currentQuestion,
      }),
    [actor, currentStepNumber, currentQuestion],
  );

  return {
    messages,
    artifacts,
    disabled: isSubmitting,
    isSubmitting,
    formValues,
    ...actions,
  };
}

export function createWorkflowChatActions({
  actor,
  currentStepNumber,
  currentQuestion,
}: WorkflowChatControllerInput): WorkflowChatActions {
  const isInteractiveInterview =
    currentStepNumber === 2 || currentStepNumber === 3;
  const isInteractiveForm = currentStepNumber === 1 || currentStepNumber === 5;

  return {
    onSubmitMessage:
      isInteractiveInterview && currentQuestion
        ? (message) => {
            submitInterviewAnswer(
              actor,
              currentStepNumber,
              currentQuestion,
              message,
            );
          }
        : undefined,
    onSelectOption:
      isInteractiveInterview && currentQuestion
        ? (question, option) => {
            if (question !== currentQuestion) return;
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
