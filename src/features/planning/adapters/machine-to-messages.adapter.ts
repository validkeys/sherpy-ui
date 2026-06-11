import type {
  Message,
  QuestionMessage,
} from "@/components/workflow-chat/types";
import { STEP_STATES } from "../machines/constants";
import type { InterviewAnswer, PlanningContext } from "../machines/types";
import { getStepName } from "../step-config";
import {
  getWorkflowArtifactId,
  getWorkflowArtifactName,
  getWorkflowStepNumbers,
  type WorkflowStepNumber,
} from "./machine-to-artifacts.adapter";

const STAGE_COLORS: Record<WorkflowStepNumber, string> = {
  1: "var(--bot-1)",
  2: "var(--bot-2)",
  3: "var(--bot-3)",
  4: "var(--bot-4)",
  5: "var(--bot-5)",
  6: "var(--bot-6)",
  7: "var(--bot-7)",
  8: "var(--bot-8)",
  9: "var(--bot-9)",
  10: "var(--neutral-4)",
};

const FORM_FIELDS = {
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

export type WorkflowChatAdapterInput = {
  context: PlanningContext;
  stateValue: unknown;
};

/**
 * Normalized workflow step statuses.
 * Maps XState machine states to simplified status values for the adapter.
 */
type WorkflowStepStatus =
  | typeof STEP_STATES.STEP_1.COLLECTING_INFO // "collectingInfo"
  | typeof STEP_STATES.STEP_1.ASSESSING_NEED // "assessingNeed"
  | typeof STEP_STATES.STEP_5.COLLECTING_INFO // "collectingInfo"
  | typeof STEP_STATES.STEP_5.SUBMITTING // "submitting"
  | typeof STEP_STATES.INTERVIEW.FETCHING_QUESTION // "fetchingQuestion"
  | typeof STEP_STATES.INTERVIEW.AWAITING_ANSWER // "awaitingAnswer"
  | typeof STEP_STATES.INTERVIEW.CHECKING_COMPLETE // "checkingComplete"
  | typeof STEP_STATES.INTERVIEW.GENERATING_ARTIFACT // "generatingArtifact"
  | typeof STEP_STATES.AUTOMATED.GENERATING // "generating"
  | typeof STEP_STATES.INTERVIEW.COMPLETE // "complete"
  | "unknown";

type NormalizedWorkflowState = {
  stepNumber: WorkflowStepNumber | null;
  status: WorkflowStepStatus;
};

const STEP_STATE_NAMES = {
  step1_gapAnalysis: 1,
  step2_businessReqs: 2,
  step3_techReqs: 3,
  step4_styleAnchors: 4,
  step5_implPlanner: 5,
  step6_definitionOfDone: 6,
  step7_archDecisions: 7,
  step8_deliveryTimeline: 8,
  step9_qaTestPlan: 9,
  step10_summaries: 10,
} as const satisfies Record<string, WorkflowStepNumber>;

const WORKFLOW_STEP_STATUSES: readonly WorkflowStepStatus[] = [
  STEP_STATES.STEP_1.COLLECTING_INFO,
  STEP_STATES.STEP_1.ASSESSING_NEED,
  STEP_STATES.STEP_5.COLLECTING_INFO,
  STEP_STATES.STEP_5.SUBMITTING,
  STEP_STATES.INTERVIEW.FETCHING_QUESTION,
  STEP_STATES.INTERVIEW.AWAITING_ANSWER,
  STEP_STATES.INTERVIEW.CHECKING_COMPLETE,
  STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
  STEP_STATES.AUTOMATED.GENERATING,
  STEP_STATES.INTERVIEW.COMPLETE,
  "unknown",
] as const;

export function adaptMachineSnapshotToMessages({
  context,
  stateValue,
}: WorkflowChatAdapterInput): Message[] {
  const activeState = normalizeWorkflowState(stateValue);
  const messages: Message[] = [];

  for (const stepNumber of getReachedSteps(context, activeState)) {
    messages.push(createDividerMessage(stepNumber));
    messages.push(...createStepMessages(context, stepNumber, activeState));
  }

  return messages;
}

function getReachedSteps(
  context: PlanningContext,
  activeState: NormalizedWorkflowState,
): readonly WorkflowStepNumber[] {
  const artifactStepNumbers = getWorkflowStepNumbers().filter((stepNumber) => {
    const artifact = context.artifacts[stepNumber];
    const content =
      stepNumber === 7 && context.step7Edits
        ? context.step7Edits
        : artifact?.content;

    return Boolean(artifact && content?.trim());
  });
  const highestReachedStep = Math.max(
    context.currentStepNumber,
    activeState.stepNumber ?? 0,
    ...context.completedSteps,
    ...artifactStepNumbers,
  );

  return getWorkflowStepNumbers().filter(
    (stepNumber) => stepNumber <= highestReachedStep,
  );
}

function createDividerMessage(stepNumber: WorkflowStepNumber): Message {
  return {
    type: "divider",
    id: `divider-step-${stepNumber}`,
    stageNumber: stepNumber,
    stageName: getStepName(stepNumber),
    stageColor: STAGE_COLORS[stepNumber],
  };
}

function createStepMessages(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message[] {
  const messages: Message[] = [];
  const isActiveStep = activeState.stepNumber === stepNumber;

  if (stepNumber === 1) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step1Responses,
        context.startedAt,
      ),
    );
    if (
      isActiveStep &&
      activeState.status === STEP_STATES.STEP_1.COLLECTING_INFO &&
      Object.keys(context.step1Responses).length === 0
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  if (stepNumber === 2) {
    messages.push(...createInterviewMessages(stepNumber, context.step2Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  if (stepNumber === 3) {
    messages.push(...createInterviewMessages(stepNumber, context.step3Answers));
    messages.push(
      ...createCurrentInterviewMessages(context, stepNumber, activeState),
    );
  }

  if (stepNumber === 5) {
    messages.push(
      ...createFormResponseMessages(
        stepNumber,
        context.step5Responses,
        context.startedAt,
      ),
    );
    if (
      isActiveStep &&
      activeState.status === STEP_STATES.STEP_5.COLLECTING_INFO &&
      Object.keys(context.step5Responses).length === 0
    ) {
      messages.push(createFormQuestionMessage(context, stepNumber));
    }
  }

  const artifact = context.artifacts[stepNumber];
  const artifactContent =
    stepNumber === 7 && context.step7Edits
      ? context.step7Edits
      : artifact?.content;

  if (artifact && artifactContent?.trim()) {
    messages.push({
      type: "artifact",
      id: `step-${stepNumber}-artifact-message`,
      role: "assistant",
      timestamp: artifact.generatedAt,
      content: `I've created the ${getStepName(stepNumber)} artifact.`,
      artifactName: getWorkflowArtifactName(stepNumber),
      artifactId: getWorkflowArtifactId(stepNumber),
    });
  } else if (isActiveStep) {
    const loadingMessage = createLoadingMessage(
      context,
      stepNumber,
      activeState,
    );

    if (loadingMessage) {
      messages.push(loadingMessage);
    }
  }

  return messages;
}

function createFormQuestionMessage(
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

function createFormResponseMessages(
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

function createInterviewMessages(
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

function createCurrentInterviewMessages(
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

function createLoadingMessage(
  context: PlanningContext,
  stepNumber: WorkflowStepNumber,
  activeState: NormalizedWorkflowState,
): Message | null {
  const shouldShowArtifactGeneration =
    activeState.status === STEP_STATES.STEP_1.ASSESSING_NEED ||
    activeState.status === STEP_STATES.STEP_5.SUBMITTING ||
    activeState.status === STEP_STATES.AUTOMATED.GENERATING;

  if (!shouldShowArtifactGeneration) return null;

  return {
    type: "loading",
    id: `step-${stepNumber}-loading-artifact`,
    role: "assistant",
    timestamp: context.updatedAt,
    content: `Generating ${getStepName(stepNumber)}...`,
  };
}

function normalizeWorkflowState(stateValue: unknown): NormalizedWorkflowState {
  if (stateValue === STEP_STATES.INTERVIEW.COMPLETE) {
    return { stepNumber: null, status: STEP_STATES.INTERVIEW.COMPLETE };
  }

  if (!isRecord(stateValue)) {
    return { stepNumber: null, status: "unknown" };
  }

  for (const [stateName, nestedStateValue] of Object.entries(stateValue)) {
    const stepNumber = getStepNumberForStateName(stateName);
    if (!stepNumber) continue;

    return {
      stepNumber,
      status: normalizeWorkflowStepStatus(nestedStateValue),
    };
  }

  return { stepNumber: null, status: "unknown" };
}

function normalizeWorkflowStepStatus(stateValue: unknown): WorkflowStepStatus {
  if (typeof stateValue === "string" && isWorkflowStepStatus(stateValue)) {
    return stateValue;
  }

  return "unknown";
}

function getStepNumberForStateName(
  stateName: string,
): WorkflowStepNumber | null {
  return STEP_STATE_NAMES[stateName as keyof typeof STEP_STATE_NAMES] ?? null;
}

function isWorkflowStepStatus(value: string): value is WorkflowStepStatus {
  return WORKFLOW_STEP_STATUSES.includes(value as WorkflowStepStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
