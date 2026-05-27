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
  const isInteractiveInterview =
    currentStepNumber === 2 || currentStepNumber === 3;

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
    onSubmitForm: undefined,
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
