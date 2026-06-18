/**
 * Domain types for planning feature business logic.
 *
 * CRITICAL: This file MUST NOT import from React, XState, or UI libraries.
 * All types must be JSON-serializable for persistence.
 */

/**
 * Valid step numbers in the planning workflow (1-10)
 */
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Summary view of a single planning step.
 * Represents the business state of a step independent of UI presentation.
 */
export interface StepSummary {
  /** Step number (1-10) */
  stepNumber: StepNumber;
  /** Human-readable step name */
  name: string;
  /** True if step has been completed */
  isComplete: boolean;
  /** True if this is the current active step */
  isCurrent: boolean;
  /** True if step is not yet accessible */
  isPending: boolean;
  /** True if step was intentionally skipped */
  isSkipped: boolean;
}

/**
 * Aggregate progress statistics across all steps.
 * Used for progress indicators and completion tracking.
 */
export interface StepProgress {
  /** Number of completed steps */
  completed: number;
  /** Number of steps currently in progress (typically 0 or 1) */
  inProgress: number;
  /** Number of steps not yet accessible */
  pending: number;
  /** Number of steps that were skipped */
  skipped: number;
  /** Total number of steps in workflow */
  total: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
}

/**
 * Complete progress view of a project's planning workflow.
 * Combines current position with step-by-step progress details.
 */
export interface ProjectProgress {
  /** The current step number (1-10) */
  currentStepNumber: StepNumber;
  /** Aggregate progress statistics */
  progress: StepProgress;
  /** Individual step summaries */
  stepSummaries: StepSummary[];
}
