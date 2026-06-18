/**
 * Domain query functions for planning step state.
 *
 * CRITICAL: All functions MUST be pure (no side effects, deterministic).
 * NO database calls, NO API calls, NO mutations.
 */

import type { PlanningStep, ProjectStepState } from "../types";
import type {
  ProjectProgress,
  StepNumber,
  StepProgress,
  StepSummary,
} from "./types";

/**
 * Get summary view of a single planning step.
 *
 * @param step - The planning step to summarize
 * @param currentStep - The current step number in the workflow
 * @returns StepSummary with boolean flags for UI presentation
 */
export function getStepSummary(
  step: PlanningStep,
  _currentStep: number,
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
 * @param steps - Array of planning steps
 * @returns StepProgress with counts and percentage
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
 * Get the current step number from project state.
 *
 * @param state - The project step state
 * @returns Current step number (1-10)
 */
export function getCurrentStepNumber(state: ProjectStepState): number {
  return state.currentStep;
}

/**
 * Check if a step is accessible based on business rules.
 * Business rule: Users can only access current step or completed steps.
 *
 * @param stepNumber - The step number to check
 * @param state - The project step state
 * @returns True if step is accessible, false otherwise
 */
export function isStepAccessible(
  stepNumber: number,
  state: ProjectStepState,
): boolean {
  // Business rule: can only access current step or completed steps
  return stepNumber > 0 && stepNumber <= state.currentStep;
}

/**
 * Get complete project progress including all step summaries.
 *
 * @param state - The project step state
 * @returns ProjectProgress with current step, progress stats, and summaries
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
