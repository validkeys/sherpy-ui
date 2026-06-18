/**
 * M7-007: Step normalizer module
 * Extracted from machine-to-messages.adapter.ts
 *
 * Normalizes XState machine state values into simplified step numbers and statuses.
 * This enables the adapter to work with a consistent interface regardless of
 * the complexity of the underlying state machine structure.
 */

import { STEP_STATES } from "../machines/constants";
import type { WorkflowStepNumber } from "./machine-to-artifacts.adapter";

/**
 * Normalized workflow step statuses.
 * Maps XState machine states to simplified status values for the adapter.
 */
export type WorkflowStepStatus =
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

/**
 * Normalized representation of workflow state
 * Simplifies complex hierarchical state machine values into flat structure
 */
export type NormalizedWorkflowState = {
  /** Current workflow step number (1-10), or null if not in a step */
  stepNumber: WorkflowStepNumber | null;
  /** Current step status (normalized from machine state) */
  status: WorkflowStepStatus;
};

/**
 * All valid workflow step statuses
 * Used for runtime validation of state values
 */
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

/**
 * Maps XState state names to workflow step numbers
 * Used to extract step number from hierarchical state structure
 */
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

/**
 * Normalizes XState machine state value into simplified step number and status
 *
 * Handles three state value formats:
 * 1. String state (e.g., "complete") → { stepNumber: null, status: "complete" }
 * 2. Nested state (e.g., { step2_businessReqs: "awaitingAnswer" }) → { stepNumber: 2, status: "awaitingAnswer" }
 * 3. Unknown state → { stepNumber: null, status: "unknown" }
 *
 * @param stateValue - XState machine state value (from snapshot.value)
 * @returns Normalized workflow state with step number and status
 *
 * @example
 * ```typescript
 * // Complete state (string)
 * normalizeWorkflowState("complete")
 * // → { stepNumber: null, status: "complete" }
 *
 * // Active step (nested object)
 * normalizeWorkflowState({ step2_businessReqs: "awaitingAnswer" })
 * // → { stepNumber: 2, status: "awaitingAnswer" }
 *
 * // Unknown state
 * normalizeWorkflowState(null)
 * // → { stepNumber: null, status: "unknown" }
 * ```
 */
export function normalizeWorkflowState(
  stateValue: unknown,
): NormalizedWorkflowState {
  // Handle complete state (string value)
  if (stateValue === STEP_STATES.INTERVIEW.COMPLETE) {
    return { stepNumber: null, status: STEP_STATES.INTERVIEW.COMPLETE };
  }

  // State value must be an object for nested states
  if (!isRecord(stateValue)) {
    return { stepNumber: null, status: "unknown" };
  }

  // Extract step number and status from nested state
  // Format: { step2_businessReqs: "awaitingAnswer" }
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

/**
 * Normalizes nested state value into workflow step status
 *
 * @param stateValue - Nested state value (e.g., "awaitingAnswer" or unknown)
 * @returns Normalized status string, or "unknown" if invalid
 *
 * @example
 * ```typescript
 * normalizeWorkflowStepStatus("awaitingAnswer")  // → "awaitingAnswer"
 * normalizeWorkflowStepStatus("invalid")         // → "unknown"
 * normalizeWorkflowStepStatus({})                // → "unknown"
 * ```
 */
function normalizeWorkflowStepStatus(stateValue: unknown): WorkflowStepStatus {
  if (typeof stateValue === "string" && isWorkflowStepStatus(stateValue)) {
    return stateValue;
  }

  return "unknown";
}

/**
 * Maps XState state name to workflow step number
 *
 * @param stateName - XState state name (e.g., "step2_businessReqs")
 * @returns Step number (1-10), or null if not recognized
 *
 * @example
 * ```typescript
 * getStepNumberForStateName("step2_businessReqs")  // → 2
 * getStepNumberForStateName("step5_implPlanner")   // → 5
 * getStepNumberForStateName("invalidName")         // → null
 * ```
 */
function getStepNumberForStateName(
  stateName: string,
): WorkflowStepNumber | null {
  return STEP_STATE_NAMES[stateName as keyof typeof STEP_STATE_NAMES] ?? null;
}

/**
 * Type guard: Checks if value is a valid workflow step status
 *
 * @param value - String value to check
 * @returns True if value is a valid WorkflowStepStatus
 *
 * @example
 * ```typescript
 * isWorkflowStepStatus("awaitingAnswer")  // → true
 * isWorkflowStepStatus("invalid")         // → false
 * ```
 */
function isWorkflowStepStatus(value: string): value is WorkflowStepStatus {
  return WORKFLOW_STEP_STATUSES.includes(value as WorkflowStepStatus);
}

/**
 * Type guard: Checks if value is a plain object (record)
 *
 * @param value - Value to check
 * @returns True if value is a non-null, non-array object
 *
 * @example
 * ```typescript
 * isRecord({ a: 1 })  // → true
 * isRecord([1, 2])    // → false
 * isRecord(null)      // → false
 * ```
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
