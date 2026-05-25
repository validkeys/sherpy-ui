/**
 * Domain layer: Pure query functions for planning step state.
 *
 * These functions calculate derived state from ProjectStepState without side effects.
 * All functions are pure - same input always produces same output, no mutations.
 *
 * @module features/planning/domain/step-state
 */

import type { PlanningStep, ProjectStepState } from "../types";
import type {
  ProjectProgress,
  StepNumber,
  StepProgress,
  StepSummary,
} from "./types";

/**
 * Create a summary of a single step's current state.
 *
 * @param step - The planning step to summarize
 * @param currentStep - The current step number in the workflow
 * @returns Summary with boolean flags for UI rendering
 */
export function getStepSummary(
  step: PlanningStep,
  currentStep: number,
): StepSummary {
  return {
    stepNumber: step.stepNumber as StepNumber,
    name: step.name,
    isComplete: step.status === "complete",
    isCurrent: step.status === "now",
    isPending: step.status === "pending",
    isSkipped: step.status === "skipped",
  };
}

/**
 * Calculate aggregate progress statistics across all steps.
 *
 * @param steps - Array of all planning steps
 * @returns Progress statistics including counts and percentage
 */
export function getStepProgress(steps: PlanningStep[]): StepProgress {
  const completed = steps.filter((s) => s.status === "complete").length;
  const inProgress = steps.filter((s) => s.status === "now").length;
  const pending = steps.filter((s) => s.status === "pending").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const total = steps.length;

  return {
    completed,
    inProgress,
    pending,
    skipped,
    total,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Get the current active step number from project state.
 *
 * @param state - The project's step state
 * @returns Current step number (1-10)
 */
export function getCurrentStepNumber(state: ProjectStepState): number {
  return state.currentStep;
}

/**
 * Check if a step is accessible based on workflow business rules.
 *
 * Business rule: Users can only access the current step or previously completed steps.
 * Future steps are locked until the workflow progresses to them.
 *
 * @param stepNumber - The step number to check
 * @param state - The project's step state
 * @returns true if the step is accessible, false otherwise
 */
export function isStepAccessible(
  stepNumber: number,
  state: ProjectStepState,
): boolean {
  // Can only access current step or completed steps
  return stepNumber <= state.currentStep;
}

/**
 * Get complete project progress including current step, statistics, and step summaries.
 *
 * This is a convenience function that combines multiple queries for UI consumption.
 *
 * @param state - The project's step state
 * @returns Complete project progress data
 */
export function getProjectProgress(state: ProjectStepState): ProjectProgress {
  return {
    currentStepNumber: state.currentStep as StepNumber,
    progress: getStepProgress(state.steps),
    stepSummaries: state.steps.map((step) =>
      getStepSummary(step, state.currentStep),
    ),
  };
}
