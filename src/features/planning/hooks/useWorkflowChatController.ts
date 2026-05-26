import { useMemo } from "react";
import type { Artifact, Message } from "@/components/workflow-chat";
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
};

type WorkflowChatController = WorkflowChatActions & {
  messages: Message[];
  artifacts: Artifact[];
  disabled: boolean;
  isSubmitting: boolean;
};

export function useWorkflowChatController(): WorkflowChatController {
  const {
    messages,
    artifacts,
    isSubmitting,
    actor,
    currentStepNumber,
    currentQuestion,
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
    ...actions,
  };
}

export function createWorkflowChatActions({
  actor,
  currentStepNumber,
  currentQuestion,
}: WorkflowChatControllerInput): WorkflowChatActions {
  const interviewStepNumber = getInterviewStepNumber(currentStepNumber);
  const formStepNumber = getFormStepNumber(currentStepNumber);

  return {
    onSubmitMessage:
      interviewStepNumber && currentQuestion
        ? (message) => {
            submitInterviewAnswer(
              actor,
              interviewStepNumber,
              currentQuestion,
              message,
            );
          }
        : undefined,
    onSelectOption:
      interviewStepNumber && currentQuestion
        ? (question, option) => {
            if (question !== currentQuestion) return;
            submitInterviewAnswer(actor, interviewStepNumber, question, option);
          }
        : undefined,
    onSubmitForm: formStepNumber
      ? (_question, values) => {
          actor.send({
            type: "SUBMIT_FORM",
            stepNumber: formStepNumber,
            responses: trimFormValues(values),
          });
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
    type: "SUBMIT_ANSWER",
    stepNumber,
    question,
    answer: trimmedAnswer,
  });
}

function getInterviewStepNumber(stepNumber: number): 2 | 3 | null {
  return stepNumber === 2 || stepNumber === 3 ? stepNumber : null;
}

function getFormStepNumber(stepNumber: number): 1 | 5 | null {
  return stepNumber === 1 || stepNumber === 5 ? stepNumber : null;
}

function trimFormValues(
  values: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()]),
  );
}
