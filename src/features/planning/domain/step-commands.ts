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
 * Skip a step in the workflow.
 * Marks step as skipped and moves to next step.
 *
 * @param state - Current project state
 * @param stepNumber - Step to skip (1-10)
 * @returns New state with step skipped (original state unchanged)
 */
export function skipStep(
  state: ProjectStepState,
  stepNumber: number,
): ProjectStepState {
  if (stepNumber < 1 || stepNumber > 10) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  // Don't skip beyond step 10
  if (stepNumber >= 10) {
    return state;
  }

  const stepIndex = stepNumber - 1;
  const nextStepIndex = stepNumber;

  const newSteps = state.steps.map((s, i) => {
    if (i === stepIndex) {
      return { ...s, status: "skipped" as const };
    }
    if (i === nextStepIndex) {
      return { ...s, status: "now" as const };
    }
    return s;
  });

  return {
    ...state,
    currentStep: stepNumber + 1,
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

/**
 * Create an interview answer object for machine context.
 *
 * Helper function used by XState machine to create properly formatted
 * interview answer objects. Pure function with no side effects.
 *
 * @param question - The interview question text
 * @param answer - The user's answer
 * @returns Interview answer object with timestamp
 */
export function createInterviewAnswer(
  question: string,
  answer: string,
): {
  question: string;
  value: string;
  timestamp: string;
} {
  return {
    question,
    value: answer,
    timestamp: new Date().toISOString(),
  };
}
