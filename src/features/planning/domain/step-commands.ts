/**
 * Domain command functions for planning step operations.
 *
 * CRITICAL: All functions MUST be pure and immutable.
 * Functions transform: oldState → newState (no mutations, no side effects).
 */

import type { ProjectStepState, StepAnswer } from "../types";

/**
 * Submit an answer for a planning step.
 *
 * @param state - Current project state
 * @param params - Answer parameters
 * @returns New state with answer added (original state unchanged)
 */
export function submitStepAnswer(
  state: ProjectStepState,
  params: {
    stepNumber: number;
    question: string;
    value: string;
  },
): ProjectStepState {
  if (params.stepNumber < 1 || params.stepNumber > 10) {
    throw new Error(`Invalid step number: ${params.stepNumber}`);
  }

  const stepIndex = params.stepNumber - 1;
  const step = state.steps[stepIndex];

  const newAnswer: StepAnswer = {
    question: params.question,
    value: params.value,
    submittedAt: new Date().toISOString(),
  };

  // Create new steps array with updated step
  const newSteps = state.steps.map((s, i) =>
    i === stepIndex
      ? {
          ...s,
          answer: newAnswer,
          answers: s.answers ? [...s.answers, newAnswer] : [newAnswer],
        }
      : s,
  );

  return {
    ...state,
    steps: newSteps,
  };
}

/**
 * Mark a step as complete.
 *
 * @param state - Current project state
 * @param stepNumber - Step to mark complete (1-10)
 * @returns New state with step marked complete (original state unchanged)
 */
export function completeStep(
  state: ProjectStepState,
  stepNumber: number,
): ProjectStepState {
  if (stepNumber < 1 || stepNumber > 10) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  const stepIndex = stepNumber - 1;

  const newSteps = state.steps.map((s, i) =>
    i === stepIndex ? { ...s, status: "complete" as const } : s,
  );

  return {
    ...state,
    steps: newSteps,
  };
}

/**
 * Set artifact content for a step.
 *
 * @param state - Current project state
 * @param params - Artifact parameters
 * @returns New state with artifact set (original state unchanged)
 */
export function setStepArtifact(
  state: ProjectStepState,
  params: {
    stepNumber: number;
    artifactKey: string;
    artifact: string;
  },
): ProjectStepState {
  if (params.stepNumber < 1 || params.stepNumber > 10) {
    throw new Error(`Invalid step number: ${params.stepNumber}`);
  }

  const stepIndex = params.stepNumber - 1;

  const newSteps = state.steps.map((s, i) =>
    i === stepIndex
      ? {
          ...s,
          artifactKey: params.artifactKey,
          artifact: params.artifact,
        }
      : s,
  );

  return {
    ...state,
    steps: newSteps,
  };
}

/**
 * Advance to the next step in the workflow.
 * Marks current step as complete and moves to next step.
 *
 * @param state - Current project state
 * @returns New state with incremented currentStep (original state unchanged)
 */
export function advanceToNextStep(state: ProjectStepState): ProjectStepState {
  // Don't advance beyond step 10
  if (state.currentStep >= 10) {
    return state;
  }

  const currentStepIndex = state.currentStep - 1;
  const nextStepIndex = state.currentStep;

  const newSteps = state.steps.map((s, i) => {
    if (i === currentStepIndex) {
      return { ...s, status: "complete" as const };
    }
    if (i === nextStepIndex) {
      return { ...s, status: "now" as const };
    }
    return s;
  });

  return {
    ...state,
    currentStep: state.currentStep + 1,
    steps: newSteps,
  };
}
