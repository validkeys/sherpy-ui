import type { EntryPath } from "../projects/types";
import type { PlanningStep, ProjectStepState, StepAnswer } from "./types";

const store = new Map<string, ProjectStepState>();

const STEPS: Array<{ name: string; question: string }> = [
  {
    name: "Gap Analysis Worksheet",
    question:
      "Let's start by identifying any gaps in your existing requirements. Do you have a requirements document to analyze, or are you starting from scratch?",
  },
  {
    name: "Business Requirements Interview",
    question:
      "What is the primary business problem this project is solving? Describe the current pain point and the desired outcome.",
  },
  {
    name: "Technical Requirements Interview",
    question:
      "What are the key technical constraints or non-negotiables for this project? Consider platform, integrations, performance, and security needs.",
  },
  {
    name: "Implementation Planner",
    question:
      "How should we break this project into milestones? What is the most critical slice of functionality to deliver first?",
  },
  {
    name: "Implementation Plan Review",
    question:
      "Reviewing the generated implementation plan — do the milestones and task estimates feel realistic given your team's capacity?",
  },
  {
    name: "Definition of Done",
    question:
      "What does success look like for each milestone? Define the acceptance criteria that must be met before a milestone is considered complete.",
  },
  {
    name: "Architecture Decision Records",
    question:
      "Are there any significant architectural decisions that need to be documented? Think about technology choices, patterns, or tradeoffs that future engineers should understand.",
  },
  {
    name: "Delivery Timeline",
    question:
      "Given the milestones and team capacity, what is a realistic delivery timeline? Are there external deadlines or dependencies we need to account for?",
  },
  {
    name: "QA Test Plan",
    question:
      "What are the highest-risk areas of the system that need the most test coverage? Define the testing strategy for functional, performance, and security requirements.",
  },
  {
    name: "Generate Summaries",
    question:
      "We're ready to generate the final summaries. Should we produce a developer-focused technical summary, an executive overview, or both?",
  },
];

function buildSteps(entryPath: EntryPath): PlanningStep[] {
  return STEPS.map((s, i) => ({
    stepNumber: i + 1,
    name: s.name,
    // doc-first skips Gap Analysis (step 1 starts as complete/pre-seeded)
    status:
      entryPath === "doc-first" && i === 0
        ? ("complete" as const)
        : i === (entryPath === "doc-first" ? 1 : 0)
          ? ("now" as const)
          : ("pending" as const),
    question: s.question,
    answer:
      entryPath === "doc-first" && i === 0
        ? { value: "doc-first", submittedAt: new Date().toISOString() }
        : undefined,
  }));
}

export function hasStepState(projectId: string): boolean {
  return store.has(projectId);
}

export function initProjectSteps(
  projectId: string,
  entryPath: EntryPath,
): ProjectStepState {
  const steps = buildSteps(entryPath);
  const currentStep = entryPath === "doc-first" ? 2 : 1;
  const state: ProjectStepState = { projectId, currentStep, steps };
  store.set(projectId, state);
  return state;
}

export function getStepState(projectId: string): ProjectStepState {
  const state = store.get(projectId);
  if (!state) throw new Error(`No step state for project: ${projectId}`);
  return state;
}

export function getStep(
  projectId: string,
  stepNumber: number,
): PlanningStep {
  const state = getStepState(projectId);
  const step = state.steps.find((s) => s.stepNumber === stepNumber);
  if (!step) throw new Error(`Step ${stepNumber} not found for project: ${projectId}`);
  return step;
}

export function submitAnswer(
  projectId: string,
  stepNumber: number,
  answer: string,
): ProjectStepState {
  const state = getStepState(projectId);
  const stepIndex = state.steps.findIndex((s) => s.stepNumber === stepNumber);
  if (stepIndex === -1)
    throw new Error(`Step ${stepNumber} not found for project: ${projectId}`);

  const stepAnswer: StepAnswer = {
    value: answer,
    submittedAt: new Date().toISOString(),
  };

  const updatedSteps = state.steps.map((s, i) => {
    if (i === stepIndex) return { ...s, status: "complete" as const, answer: stepAnswer };
    if (i === stepIndex + 1 && s.status === "pending")
      return { ...s, status: "now" as const };
    return s;
  });

  const nextStep = Math.min(stepNumber + 1, 10);
  const updated: ProjectStepState = {
    ...state,
    currentStep: stepIndex + 1 < 10 ? nextStep : state.currentStep,
    steps: updatedSteps,
  };
  store.set(projectId, updated);
  return updated;
}

export function _resetStore(): void {
  store.clear();
}
