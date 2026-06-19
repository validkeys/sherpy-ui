/**
 * Planning Machine Constants
 *
 * SINGLE SOURCE OF TRUTH for all planning workflow strings.
 * Import these constants instead of using string literals.
 *
 * Benefits:
 * - Compile-time checking (typos caught by TypeScript)
 * - IntelliSense autocomplete
 * - Refactoring safety (rename propagates everywhere)
 * - Self-documenting (constants have semantic names)
 *
 * Created: 2026-06-11
 * Related: BUG-029 (state name mismatch), Planning doc 006
 */

// ══════════════════════════════════════════════════════════════════════════════
// STEP IDENTIFIERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Step keys used throughout the planning workflow.
 * These are the state names in the XState machine.
 *
 * Usage:
 *   import { STEP_KEYS } from './constants';
 *   const config = STEP_CONFIG[STEP_KEYS.STEP_1_GAP_ANALYSIS];
 */
export const STEP_KEYS = {
  STEP_1_GAP_ANALYSIS: "step1_gapAnalysis",
  STEP_2_BUSINESS_REQS: "step2_businessReqs",
  STEP_3_TECH_REQS: "step3_techReqs",
  STEP_4_STYLE_ANCHORS: "step4_styleAnchors",
  STEP_5_IMPL_PLANNER: "step5_implPlanner",
  STEP_6_DEFINITION_OF_DONE: "step6_definitionOfDone",
  STEP_7_ARCH_DECISIONS: "step7_archDecisions",
  STEP_8_DELIVERY_TIMELINE: "step8_deliveryTimeline",
  STEP_9_QA_TEST_PLAN: "step9_qaTestPlan",
  STEP_10_SUMMARIES: "step10_summaries",
} as const;

export type StepKey = (typeof STEP_KEYS)[keyof typeof STEP_KEYS];

/**
 * Bidirectional mappings between step keys and numbers.
 *
 * Usage:
 *   const stepNum = STEP_KEY_TO_NUMBER[STEP_KEYS.STEP_1_GAP_ANALYSIS]; // 1
 *   const stepKey = STEP_NUMBER_TO_KEY[1]; // "step1_gapAnalysis"
 */
export const STEP_KEY_TO_NUMBER: Record<StepKey, number> = {
  [STEP_KEYS.STEP_1_GAP_ANALYSIS]: 1,
  [STEP_KEYS.STEP_2_BUSINESS_REQS]: 2,
  [STEP_KEYS.STEP_3_TECH_REQS]: 3,
  [STEP_KEYS.STEP_4_STYLE_ANCHORS]: 4,
  [STEP_KEYS.STEP_5_IMPL_PLANNER]: 5,
  [STEP_KEYS.STEP_6_DEFINITION_OF_DONE]: 6,
  [STEP_KEYS.STEP_7_ARCH_DECISIONS]: 7,
  [STEP_KEYS.STEP_8_DELIVERY_TIMELINE]: 8,
  [STEP_KEYS.STEP_9_QA_TEST_PLAN]: 9,
  [STEP_KEYS.STEP_10_SUMMARIES]: 10,
} as const;

export const STEP_NUMBER_TO_KEY: Record<number, StepKey> = {
  1: STEP_KEYS.STEP_1_GAP_ANALYSIS,
  2: STEP_KEYS.STEP_2_BUSINESS_REQS,
  3: STEP_KEYS.STEP_3_TECH_REQS,
  4: STEP_KEYS.STEP_4_STYLE_ANCHORS,
  5: STEP_KEYS.STEP_5_IMPL_PLANNER,
  6: STEP_KEYS.STEP_6_DEFINITION_OF_DONE,
  7: STEP_KEYS.STEP_7_ARCH_DECISIONS,
  8: STEP_KEYS.STEP_8_DELIVERY_TIMELINE,
  9: STEP_KEYS.STEP_9_QA_TEST_PLAN,
  10: STEP_KEYS.STEP_10_SUMMARIES,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// STATE NAMES (CRITICAL: Fixes BUG-029)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 CRITICAL: These constants FIX BUG-029
 *
 * BUG-029 Root Cause:
 *   Machine used:  "collectingInfo"
 *   Adapter checked for: "collecting"
 *   Result: Mismatch → Form never appeared
 *
 * Solution: Both machine AND adapter import from this file
 *   → Impossible to have mismatch
 *   → TypeScript enforces correctness
 *
 * Usage (Machine):
 *   import { STEP_STATES } from './constants';
 *
 *   step1_gapAnalysis: {
 *     initial: STEP_STATES.STEP_1.COLLECTING_INFO,  // ✅ Type-safe
 *     states: {
 *       [STEP_STATES.STEP_1.COLLECTING_INFO]: { ... }
 *     }
 *   }
 *
 * Usage (Adapter):
 *   import { STEP_STATES } from '../machines/constants';
 *
 *   if (activeState.status === STEP_STATES.STEP_1.COLLECTING_INFO) {
 *     // ✅ GUARANTEED to match machine because same constant
 *     messages.push(createFormQuestionMessage(...));
 *   }
 */
export const STEP_STATES = {
  // ────────────────────────────────────────────────────────────────────────────
  // Step 1: Gap Analysis (Form-based)
  // ────────────────────────────────────────────────────────────────────────────
  STEP_1: {
    /**
     * Initial state - waiting for user to fill form.
     * UI should render form with 2 fields:
     *   - existingRequirements (text)
     *   - projectDescription (textarea)
     */
    COLLECTING_INFO: "collectingInfo",

    /**
     * Invoking actor to assess if gap analysis artifact needed.
     * UI should show loading indicator.
     */
    ASSESSING_NEED: "assessingNeed",

    /**
     * Invoking actor to generate gap analysis artifact.
     * UI should show loading spinner with "Generating artifact..." text.
     * NOTE: BUG-030 fix - this state runs ALWAYS, not conditionally.
     */
    SUBMITTING: "submitting",

    /**
     * Final state - step complete.
     * Machine will transition to Step 2.
     */
    COMPLETE: "complete",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Steps 2 & 3: Business/Technical Requirements (Interview-based)
  // ────────────────────────────────────────────────────────────────────────────
  INTERVIEW: {
    /**
     * Invoking actor to fetch next question from LLM.
     * UI should show loading spinner with "Loading next question..." text.
     */
    FETCHING_QUESTION: "fetchingQuestion",

    /**
     * Question received, waiting for user answer.
     * UI should show:
     *   - Question text
     *   - Text input OR option buttons (if multiple choice)
     *   - Submit button
     */
    AWAITING_ANSWER: "awaitingAnswer",

    /**
     * Checking if interview complete (e.g., 10/10 questions answered).
     * UI should show loading spinner with "Checking progress..." text.
     */
    CHECKING_COMPLETE: "checkingComplete",

    /**
     * Invoking actor to generate artifact (business-requirements.yaml).
     * UI should show loading spinner with "Generating artifact..." text.
     */
    GENERATING_ARTIFACT: "generatingArtifact",

    /**
     * Final state - step complete.
     * Machine will transition to next step.
     */
    COMPLETE: "complete",

    /**
     * Error state - something went wrong.
     * UI should show error message with retry button.
     */
    ERROR: "error",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Step 5: Implementation Planner (Form-based)
  // ────────────────────────────────────────────────────────────────────────────
  STEP_5: {
    /**
     * Waiting for user to fill form.
     * UI should render form with 2 fields:
     *   - deploymentStrategy (select)
     *   - techStack (text)
     */
    COLLECTING_INFO: "collectingInfo",

    /**
     * Invoking actor to generate implementation plan.
     * UI should show loading spinner.
     */
    SUBMITTING: "submitting",

    /**
     * Final state - step complete.
     */
    COMPLETE: "complete",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Steps 4, 6, 7, 8, 9, 10: Automated (No user input)
  // ────────────────────────────────────────────────────────────────────────────
  AUTOMATED: {
    /**
     * Invoking actor to generate artifact automatically.
     * UI should show loading spinner with step-specific message.
     */
    GENERATING: "generating",

    /**
     * Final state - step complete.
     */
    COMPLETE: "complete",

    /**
     * Error state - generation failed.
     * UI should show error message.
     */
    ERROR: "error",
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Workflow transient states (server-call intermediates)
  // ────────────────────────────────────────────────────────────────────────────
  WORKFLOW: {
    /**
     * Persisting an interview answer via server call.
     * UI should show loading spinner with "Saving your answer..." text.
     */
    PERSISTING_ANSWER: "persistingAnswer",

    /**
     * Persisting a generated artifact via server call.
     * UI should show loading spinner with "Saving artifact..." text.
     */
    PERSISTING_ARTIFACT: "persistingArtifact",

    /**
     * Completing a step (marking done, transitioning).
     * UI should show loading spinner with "Finalizing step..." text.
     */
    COMPLETING_STEP: "completingStep",
  },
} as const;

/**
 * Type-safe union of ALL possible step states.
 * Use this for type annotations.
 *
 * Usage:
 *   function handleState(state: StepState) { ... }
 */
export type StepState =
  | (typeof STEP_STATES.STEP_1)[keyof typeof STEP_STATES.STEP_1]
  | (typeof STEP_STATES.INTERVIEW)[keyof typeof STEP_STATES.INTERVIEW]
  | (typeof STEP_STATES.STEP_5)[keyof typeof STEP_STATES.STEP_5]
  | (typeof STEP_STATES.AUTOMATED)[keyof typeof STEP_STATES.AUTOMATED]
  | (typeof STEP_STATES.WORKFLOW)[keyof typeof STEP_STATES.WORKFLOW];

/**
 * Flat list of ALL valid states.
 * Use this for runtime validation in adapters.
 *
 * Usage:
 *   if (ALL_STEP_STATES.includes(stateValue)) { ... }
 */
export const ALL_STEP_STATES: readonly StepState[] = [
  ...Object.values(STEP_STATES.STEP_1),
  ...Object.values(STEP_STATES.INTERVIEW),
  ...Object.values(STEP_STATES.STEP_5),
  ...Object.values(STEP_STATES.AUTOMATED),
  ...Object.values(STEP_STATES.WORKFLOW),
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * All event types the planning machine can receive.
 *
 * Usage:
 *   import { EVENT_TYPES } from './constants';
 *
 *   actor.send({
 *     type: EVENT_TYPES.SUBMIT_FORM,  // ✅ Type-safe
 *     stepNumber: 1,
 *     responses: { ... }
 *   });
 */
export const EVENT_TYPES = {
  /**
   * Submit form responses (Steps 1, 5).
   * Payload: { stepNumber: number, responses: Record<string, string> }
   */
  SUBMIT_FORM: "SUBMIT_FORM",

  /**
   * Submit interview answer (Steps 2, 3).
   * Payload: { stepNumber: number, question: string, answer: string }
   */
  SUBMIT_ANSWER: "SUBMIT_ANSWER",

  /**
   * Navigate to next step.
   * Payload: none
   */
  NEXT: "NEXT",

  /**
   * Navigate to previous step.
   * Payload: none
   */
  BACK: "BACK",

  /**
   * Restore machine state from database snapshot.
   * Payload: { snapshot: PlanningSnapshot }
   */
  RESTORE_SNAPSHOT: "RESTORE_SNAPSHOT",

  /**
   * Resume an automated step (4, 6, 7, 8, 9, 10).
   * Payload: { stepNumber: number }
   */
  RESUME_AUTOMATED_STEP: "RESUME_AUTOMATED_STEP",

  /**
   * Update a single form field value (Steps 1, 5).
   * Payload: { stepNumber: number, fieldId: string, value: string }
   */
  UPDATE_FORM_FIELD: "UPDATE_FORM_FIELD",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// ══════════════════════════════════════════════════════════════════════════════
// FORM FIELD NAMES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Form field names for form-based steps.
 *
 * Usage:
 *   import { FORM_FIELDS } from './constants';
 *
 *   <input
 *     id={FORM_FIELDS.STEP_1.EXISTING_REQUIREMENTS}  // ✅ Type-safe
 *     value={formData[FORM_FIELDS.STEP_1.EXISTING_REQUIREMENTS]}
 *   />
 */
export const FORM_FIELDS = {
  STEP_1: {
    /**
     * "Do you have existing requirements?"
     * Type: text input
     */
    EXISTING_REQUIREMENTS: "existingRequirements",

    /**
     * "What are you building?"
     * Type: textarea
     */
    PROJECT_DESCRIPTION: "projectDescription",
  },

  STEP_5: {
    /**
     * "What is the deployment strategy?"
     * Type: select dropdown
     * Options: ["Cloud", "On-Premise", "Hybrid", "Not Decided"]
     */
    DEPLOYMENT_STRATEGY: "deploymentStrategy",

    /**
     * "What is the tech stack?"
     * Type: text input
     */
    TECH_STACK: "techStack",
  },
} as const;

export type Step1FieldName =
  (typeof FORM_FIELDS.STEP_1)[keyof typeof FORM_FIELDS.STEP_1];
export type Step5FieldName =
  (typeof FORM_FIELDS.STEP_5)[keyof typeof FORM_FIELDS.STEP_5];

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT KEYS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Keys for accessing machine context properties.
 *
 * Usage:
 *   import { CONTEXT_KEYS } from './constants';
 *
 *   const projectId = context[CONTEXT_KEYS.PROJECT_ID];  // ✅ Type-safe
 */
export const CONTEXT_KEYS = {
  /**
   * Project identifier (UUID)
   */
  PROJECT_ID: "projectId",

  /**
   * Current step number (1-10)
   */
  CURRENT_STEP_NUMBER: "currentStepNumber",

  /**
   * Array of completed step numbers
   */
  COMPLETED_STEPS: "completedSteps",

  /**
   * Step 1 form responses
   */
  STEP_1_RESPONSES: "step1Responses",

  /**
   * Step 2 interview answers
   */
  STEP_2_ANSWERS: "step2Answers",

  /**
   * Step 3 interview answers
   */
  STEP_3_ANSWERS: "step3Answers",

  /**
   * Step 5 form responses
   */
  STEP_5_RESPONSES: "step5Responses",

  /**
   * Generated artifacts by step
   */
  ARTIFACTS: "artifacts",

  /**
   * Error message (if any)
   */
  ERROR: "error",
} as const;

export type ContextKey = (typeof CONTEXT_KEYS)[keyof typeof CONTEXT_KEYS];

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES (WorkflowChat adapter)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Message types used by WorkflowChat adapter.
 *
 * Usage:
 *   import { MESSAGE_TYPES } from './constants';
 *
 *   const message = { type: MESSAGE_TYPES.QUESTION, ... };
 */
export const MESSAGE_TYPES = {
  /**
   * Stage divider (e.g., "Step 2: Business Requirements")
   */
  DIVIDER: "divider",

  /**
   * Question message (interview or form)
   */
  QUESTION: "question",

  /**
   * User's answer to a question
   */
  ANSWER: "answer",

  /**
   * Generated artifact (YAML, markdown)
   */
  ARTIFACT: "artifact",

  /**
   * Loading indicator
   */
  LOADING: "loading",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// ══════════════════════════════════════════════════════════════════════════════
// FIELD TYPES (Form components)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Input field types for form questions.
 *
 * Usage:
 *   import { FIELD_TYPES } from './constants';
 *
 *   if (field.type === FIELD_TYPES.TEXTAREA) { ... }
 */
export const FIELD_TYPES = {
  /**
   * Single-line text input
   */
  TEXT: "text",

  /**
   * Multi-line text input
   */
  TEXTAREA: "textarea",

  /**
   * Dropdown select
   */
  SELECT: "select",
} as const;

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES];

// ══════════════════════════════════════════════════════════════════════════════
// ARTIFACT TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Artifact format types.
 *
 * Usage:
 *   import { ARTIFACT_TYPES } from './constants';
 *
 *   if (artifact.format === ARTIFACT_TYPES.YAML) { ... }
 */
export const ARTIFACT_TYPES = {
  /**
   * Markdown format (.md)
   */
  MARKDOWN: "markdown",

  /**
   * YAML format (.yaml)
   */
  YAML: "yaml",
} as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[keyof typeof ARTIFACT_TYPES];

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard: Check if string is a valid step key.
 *
 * Usage:
 *   const key = getKeyFromUrl();
 *   if (isValidStepKey(key)) {
 *     // TypeScript now knows `key` is StepKey type
 *     const stepNum = STEP_KEY_TO_NUMBER[key];
 *   }
 */
export function isValidStepKey(key: string): key is StepKey {
  return Object.values(STEP_KEYS).includes(key as StepKey);
}

/**
 * Type guard: Check if string is a valid step state.
 *
 * Usage:
 *   const state = snapshot.value.step1_gapAnalysis;
 *   if (isValidStepState(state)) {
 *     // TypeScript now knows `state` is StepState type
 *     handleState(state);
 *   }
 */
export function isValidStepState(state: string): state is StepState {
  return ALL_STEP_STATES.includes(state as StepState);
}

/**
 * Get step number from step key (safe).
 * Returns null if invalid key.
 *
 * Usage:
 *   const stepNum = getStepNumber("step1_gapAnalysis"); // 1
 *   const invalid = getStepNumber("invalid"); // null
 */
export function getStepNumber(stepKey: string): number | null {
  if (!isValidStepKey(stepKey)) return null;
  return STEP_KEY_TO_NUMBER[stepKey];
}

/**
 * Get step key from step number (safe).
 * Returns null if invalid number.
 *
 * Usage:
 *   const stepKey = getStepKey(1); // "step1_gapAnalysis"
 *   const invalid = getStepKey(99); // null
 */
export function getStepKey(stepNumber: number): StepKey | null {
  const key = STEP_NUMBER_TO_KEY[stepNumber];
  return key ?? null;
}
