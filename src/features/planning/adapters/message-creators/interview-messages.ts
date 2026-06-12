import type { Message } from "@/components/workflow-chat/types";
import { STEP_STATES } from "../../machines/constants";
import type { InterviewAnswer, PlanningContext } from "../../machines/types";
import { getStepName } from "../../step-config";
import type { NormalizedWorkflowState } from "../step-normalizer";

export function createInterviewMessages(
  stepNumber: 2 | 3,
  answers: InterviewAnswer[],
): Message[] {
  return answers.flatMap((answer, index) => [
    {
      type: "question",
      id: `step-${stepNumber}-question-${index}`,
      role: "assistant",
      timestamp: answer.timestamp,
      question: answer.question,
    },
    {
      type: "answer",
      id: `step-${stepNumber}-answer-${index}`,
      role: "user",
      timestamp: answer.timestamp,
      question: answer.question,
      answer: answer.value,
    },
  ]);
}

export function createCurrentInterviewMessages(
  context: PlanningContext,
  stepNumber: 2 | 3,
  activeState: NormalizedWorkflowState,
): Message[] {
  if (activeState.stepNumber !== stepNumber) return [];

  const currentQuestion =
    stepNumber === 2
      ? context.step2CurrentQuestion
      : context.step3CurrentQuestion;
  const currentOptions =
    stepNumber === 2
      ? context.step2CurrentOptions
      : context.step3CurrentOptions;

  if (
    activeState.status === STEP_STATES.INTERVIEW.FETCHING_QUESTION &&
    !currentQuestion
  ) {
    return [
      {
        type: "loading",
        id: `step-${stepNumber}-loading-question`,
        role: "assistant",
        timestamp: context.updatedAt,
        content: "Loading next question...",
      },
    ];
  }

  if (activeState.status === STEP_STATES.INTERVIEW.CHECKING_COMPLETE) {
    return [
      {
        type: "loading",
        id: `step-${stepNumber}-loading-progress`,
        role: "assistant",
        timestamp: context.updatedAt,
        content: "Checking interview progress...",
      },
    ];
  }

  if (activeState.status === STEP_STATES.INTERVIEW.GENERATING_ARTIFACT) {
    return [
      {
        type: "loading",
        id: `step-${stepNumber}-loading-artifact`,
        role: "assistant",
        timestamp: context.updatedAt,
        content: `Generating ${getStepName(stepNumber)}...`,
      },
    ];
  }

  if (!currentQuestion) return [];

  return [
    {
      type: "question",
      id: `step-${stepNumber}-current-question`,
      role: "assistant",
      timestamp: context.updatedAt,
      question: currentQuestion,
      ...(currentOptions ? { options: currentOptions } : {}),
    },
  ];
}
