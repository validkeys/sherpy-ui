import type { EntryPath } from "../projects/types";
import { getStepName, STEP_CONFIG } from "./step-config";
import type {
  PlanningStep,
  ProjectStepState,
  StepAnswer,
  StepOption,
} from "./types";

const store = new Map<string, ProjectStepState>();

const STEPS: Array<{ name: string; question: string }> = [
  {
    name: "Gap Analysis Worksheet",
    question:
      "Do you have an existing requirements document to analyze, or are you starting from scratch?",
  },
  {
    name: "Business Requirements Interview",
    question:
      "I'll guide you through defining your business requirements. We'll cover problem definition, user personas, success criteria, constraints, and timeline.",
  },
  {
    name: "Technical Requirements Interview",
    question:
      "Now let's define the technical requirements. We'll cover architecture, technology stack, data model, APIs, security, testing, and deployment.",
  },
  {
    name: "Style Anchors Collection",
    question:
      "Let's collect code examples that demonstrate approved patterns for this project.",
  },
  {
    name: "Implementation Planner",
    question:
      "I'll help you break this project into milestones and tasks based on the requirements.",
  },
  {
    name: "Implementation Plan Review",
    question:
      "Let's review the generated implementation plan for completeness and realism.",
  },
  {
    name: "Architecture Decision Records",
    question:
      "I'll help you document key architectural decisions from the technical requirements.",
  },
  {
    name: "Delivery Timeline",
    question:
      "Let's create a delivery timeline based on the milestones and your target deployment date.",
  },
  {
    name: "QA Test Plan",
    question:
      "I'll help you generate a comprehensive QA test plan based on your requirements.",
  },
  {
    name: "Generate Summaries",
    question:
      "I'll generate developer and executive summaries of your complete project plan.",
  },
];

function buildSteps(entryPath: EntryPath): PlanningStep[] {
  // Use STEP_CONFIG to ensure consistency with step configuration
  return Object.entries(STEP_CONFIG).map(([num, config]) => {
    const stepNumber = Number(num);
    const legacyStep = STEPS[stepNumber - 1];

    // For Step 1, pre-populate first answer based on entryPath
    const prefilledAnswer =
      stepNumber === 1 && entryPath
        ? {
            question: legacyStep?.question ?? "",
            value:
              entryPath === "scratch"
                ? "Starting from scratch"
                : "I have a requirements document",
            submittedAt: new Date().toISOString(),
          }
        : undefined;

    return {
      stepNumber,
      name: config.name,
      status: stepNumber === 1 ? ("now" as const) : ("pending" as const),
      question: legacyStep?.question ?? "",
      answer: prefilledAnswer, // legacy field for backward compatibility
      answers: prefilledAnswer ? [prefilledAnswer] : undefined,
    };
  });
}

export function hasStepState(projectId: string): boolean {
  return store.has(projectId);
}

export function initProjectSteps(
  projectId: string,
  entryPath: EntryPath,
  backendCurrentStep?: number,
): ProjectStepState {
  const steps = buildSteps(entryPath);
  const defaultStep = entryPath === "doc-first" ? 2 : 1;
  const currentStep = backendCurrentStep ?? defaultStep;

  // Update step statuses based on currentStep
  // Preserve pre-seeded answer for doc-first step 1
  const updatedSteps = steps.map((step) => {
    // For doc-first, step 1 is always pre-seeded and complete
    if (entryPath === "doc-first" && step.stepNumber === 1) {
      return { ...step, status: "complete" as const };
    }

    if (step.stepNumber < currentStep) {
      return { ...step, status: "complete" as const };
    } else if (step.stepNumber === currentStep) {
      return { ...step, status: "now" as const };
    } else {
      return { ...step, status: "pending" as const };
    }
  });

  const state: ProjectStepState = {
    projectId,
    currentStep,
    steps: updatedSteps,
  };
  store.set(projectId, state);
  return state;
}

export function getStepState(projectId: string): ProjectStepState {
  const state = store.get(projectId);
  if (!state) throw new Error(`No step state for project: ${projectId}`);
  return state;
}

export function getStep(projectId: string, stepNumber: number): PlanningStep {
  const state = getStepState(projectId);
  const step = state.steps.find((s) => s.stepNumber === stepNumber);
  if (!step)
    throw new Error(`Step ${stepNumber} not found for project: ${projectId}`);
  return step;
}

export function submitAnswer(
  projectId: string,
  stepNumber: number,
  question: string,
  answer: string,
): ProjectStepState {
  const state = getStepState(projectId);
  if (stepNumber !== state.currentStep) return state;
  const stepIndex = state.steps.findIndex((s) => s.stepNumber === stepNumber);
  if (stepIndex === -1)
    throw new Error(`Step ${stepNumber} not found for project: ${projectId}`);

  const stepAnswer: StepAnswer = {
    question,
    value: answer,
    submittedAt: new Date().toISOString(),
  };

  const updatedSteps = state.steps.map((s, i) => {
    if (i === stepIndex) {
      const existingAnswers = s.answers ?? [];
      const newAnswers = [...existingAnswers, stepAnswer];
      console.log(
        `[submitAnswer] Step ${stepNumber}: Adding answer. Total answers now: ${newAnswers.length}`,
      );
      return {
        ...s,
        answer: stepAnswer, // Keep for backward compatibility
        answers: newAnswers,
      };
    }
    return s;
  });

  const updated: ProjectStepState = {
    ...state,
    currentStep: state.currentStep,
    steps: updatedSteps,
  };
  store.set(projectId, updated);

  console.log(`[submitAnswer] State updated for project ${projectId}:`, {
    currentStep: updated.currentStep,
    stepAnswersCount: updated.steps[stepIndex]?.answers?.length,
  });

  return updated;
}

export function completeStep(
  projectId: string,
  stepNumber: number,
): ProjectStepState {
  const state = getStepState(projectId);
  const stepIndex = state.steps.findIndex((s) => s.stepNumber === stepNumber);
  if (stepIndex === -1)
    throw new Error(`Step ${stepNumber} not found for project: ${projectId}`);

  console.log(
    `[completeStep] Completing step ${stepNumber} (index ${stepIndex})`,
  );

  const updatedSteps = state.steps.map((s, i) => {
    if (i === stepIndex) {
      console.log(`  - Marking step ${s.stepNumber} as complete`);
      return { ...s, status: "complete" as const };
    }
    if (i === stepIndex + 1 && s.status === "pending") {
      console.log(`  - Marking step ${s.stepNumber} as now`);
      return { ...s, status: "now" as const };
    }
    return s;
  });

  const nextStep = Math.min(stepNumber + 1, 10);
  const updated: ProjectStepState = {
    ...state,
    currentStep: stepIndex + 1 < 10 ? nextStep : state.currentStep,
    steps: updatedSteps,
  };

  console.log(`[completeStep] Updated state:`, {
    oldCurrentStep: state.currentStep,
    newCurrentStep: updated.currentStep,
    step1Status: updated.steps[0]?.status,
    step2Status: updated.steps[1]?.status,
  });

  store.set(projectId, updated);
  return updated;
}

export function submitAnswerAndComplete(
  projectId: string,
  stepNumber: number,
  question: string,
  answer: string,
): ProjectStepState {
  // Submit the answer
  const stateAfterAnswer = submitAnswer(
    projectId,
    stepNumber,
    question,
    answer,
  );
  // Immediately complete the step
  return completeStep(projectId, stepNumber);
}

export function setStepArtifact(
  projectId: string,
  stepNumber: number,
  artifact: string,
): ProjectStepState {
  const state = getStepState(projectId);
  const updatedSteps = state.steps.map((s) =>
    s.stepNumber === stepNumber ? { ...s, artifact } : s,
  );

  const updated: ProjectStepState = {
    ...state,
    steps: updatedSteps,
  };

  store.set(projectId, updated);
  return updated;
}

export function updateStepOptions(
  projectId: string,
  stepNumber: number,
  options: StepOption[],
): ProjectStepState {
  const state = getStepState(projectId);
  const updatedSteps = state.steps.map((s) =>
    s.stepNumber === stepNumber ? { ...s, options } : s,
  );

  const updated: ProjectStepState = {
    ...state,
    steps: updatedSteps,
  };

  store.set(projectId, updated);
  return updated;
}

export function _resetStore(): void {
  store.clear();
}
