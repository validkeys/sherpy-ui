/**
 * Domain types for planning feature business logic.
 *
 * These types represent pure business concepts without UI or infrastructure concerns.
 * All types are JSON-serializable for persistence compatibility.
 *
 * @module features/planning/domain
 */

/**
 * Step number as a literal union type for compile-time safety.
 * Prevents invalid step numbers from being used in business logic.
 */
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Summary of a single step's current state in the workflow.
 * Used for UI rendering and progress tracking.
 */
export interface StepSummary {
  /** The step number (1-10) */
  stepNumber: StepNumber;
  /** Display name of the step */
  name: string;
  /** Whether this step has been completed */
  isComplete: boolean;
  /** Whether this step is the current active step */
  isCurrent: boolean;
  /** Whether this step is pending (not yet reached) */
  isPending: boolean;
  /** Whether this step was skipped */
  isSkipped: boolean;
}

/**
 * Aggregate progress statistics across all steps.
 * Derived from the current state of all steps.
 */
export interface StepProgress {
  /** Number of completed steps */
  completed: number;
  /** Number of steps currently in progress (typically 0 or 1) */
  inProgress: number;
  /** Number of pending steps */
  pending: number;
  /** Number of skipped steps */
  skipped: number;
  /** Total number of steps in workflow */
  total: number;
  /** Percentage complete (0-100) */
  percentComplete: number;
}

/**
 * Complete project progress state.
 * Combines current step, overall progress, and individual step summaries.
 */
export interface ProjectProgress {
  /** The current active step number */
  currentStepNumber: StepNumber;
  /** Aggregate progress statistics */
  progress: StepProgress;
  /** Summary of each individual step */
  stepSummaries: StepSummary[];
}
