import type {
  Message,
  QuestionMessage,
} from "@/components/workflow-chat/types";
import type { PlanningContext } from "../../machines/types";

export const FORM_FIELDS = {
  1: [
    {
      id: "existingRequirements",
      label: "Do you have existing requirements?",
      type: "text",
    },
    {
      id: "projectDescription",
      label: "What are you building?",
      type: "textarea",
    },
  ],
  5: [
    {
      id: "deploymentStrategy",
      label: "What is the deployment strategy?",
      type: "text",
    },
    {
      id: "techStack",
      label: "What is the tech stack?",
      type: "text",
    },
  ],
} as const satisfies Record<1 | 5, QuestionMessage["formFields"]>;

const FORM_QUESTIONS = {
  1: "First, let's understand your starting point:",
  5: "Tell me how this should be implemented:",
} as const satisfies Record<1 | 5, string>;

export function createFormQuestionMessage(
  context: PlanningContext,
  stepNumber: 1 | 5,
): QuestionMessage {
  return {
    type: "question",
    id: `step-${stepNumber}-current-question`,
    role: "assistant",
    timestamp: context.updatedAt,
    question: FORM_QUESTIONS[stepNumber],
    formFields: [...FORM_FIELDS[stepNumber]],
  };
}

export function createFormResponseMessages(
  stepNumber: 1 | 5,
  responses: Record<string, string>,
  timestamp: string,
): Message[] {
  return FORM_FIELDS[stepNumber].flatMap((field) => {
    const answer = responses[field.id];
    if (!answer?.trim()) return [];

    return [
      {
        type: "answer",
        id: `step-${stepNumber}-form-answer-${field.id}`,
        role: "user",
        timestamp,
        question: field.label,
        answer,
      },
    ];
  });
}
