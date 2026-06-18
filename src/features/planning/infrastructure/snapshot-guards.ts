/**
 * Snapshot Type Guards for XState Planning Machine
 *
 * Runtime validation to prevent crashes from corrupted localStorage data.
 * Guards ensure snapshot structure is valid before deserialization.
 */

import type { SnapshotFrom } from "xstate";
import type { planningMachine } from "../machines/planning-machine-factory";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type PlanningSnapshot = SnapshotFrom<typeof planningMachine>;

// ─────────────────────────────────────────────────────────────
// TYPE GUARDS
// ─────────────────────────────────────────────────────────────

/**
 * Type guard to validate XState snapshot structure at runtime.
 * Prevents crashes from corrupted localStorage data.
 *
 * Validates:
 * - Top-level structure (context, value, status)
 * - Required context fields exist
 * - Field types match expected types
 *
 * @param data - Unknown data from localStorage
 * @returns True if data is valid snapshot structure
 *
 * @example
 * ```typescript
 * const stored = localStorage.getItem('planning-machine-state');
 * if (stored) {
 *   const parsed = JSON.parse(stored);
 *   if (isValidSnapshot(parsed)) {
 *     // Safe to use as PlanningSnapshot
 *     const snapshot: PlanningSnapshot = parsed;
 *   }
 * }
 * ```
 */
export function isValidSnapshot(data: unknown): data is PlanningSnapshot {
  if (!data || typeof data !== "object") {
    return false;
  }

  const snapshot = data as Record<string, unknown>;

  // Required top-level fields
  if (!("context" in snapshot) || typeof snapshot.context !== "object") {
    console.warn("[Snapshot validation] Missing or invalid context");
    return false;
  }

  if (!("value" in snapshot)) {
    console.warn("[Snapshot validation] Missing value field");
    return false;
  }

  // Validate status field (required by XState)
  if (!("status" in snapshot) || typeof snapshot.status !== "string") {
    console.warn("[Snapshot validation] Missing or invalid status field");
    return false;
  }

  // Validate status is valid XState status
  if (
    !["active", "done", "error", "stopped"].includes(snapshot.status as string)
  ) {
    console.warn(
      "[Snapshot validation] Invalid status value:",
      snapshot.status,
    );
    return false;
  }

  const context = snapshot.context as Record<string, unknown>;

  // Context must not be null
  if (context === null) {
    console.warn("[Snapshot validation] Context is null");
    return false;
  }

  // Required context fields
  const requiredFields = [
    "projectId",
    "entryPath",
    "currentStepNumber",
    "completedSteps",
    "step1Responses",
    "step2Answers",
    "step3Answers",
    "step5Responses",
    "artifacts",
    "updatedAt",
  ];

  for (const field of requiredFields) {
    if (!(field in context)) {
      console.warn(`[Snapshot validation] Missing field: ${field}`);
      return false;
    }
  }

  // Validate field types
  if (
    typeof context.projectId !== "string" ||
    context.projectId.trim() === ""
  ) {
    console.warn(
      "[Snapshot validation] Invalid projectId (must be non-empty string)",
    );
    return false;
  }

  if (typeof context.entryPath !== "string") {
    console.warn(
      "[Snapshot validation] Invalid type for entryPath (expected string)",
    );
    return false;
  }

  if (
    typeof context.currentStepNumber !== "number" ||
    context.currentStepNumber < 1 ||
    context.currentStepNumber > 10 ||
    !Number.isInteger(context.currentStepNumber)
  ) {
    console.warn(
      "[Snapshot validation] Invalid currentStepNumber (must be integer 1-10)",
    );
    return false;
  }

  if (!Array.isArray(context.completedSteps)) {
    console.warn(
      "[Snapshot validation] Invalid type for completedSteps (expected array)",
    );
    return false;
  }

  if (!Array.isArray(context.step2Answers)) {
    console.warn(
      "[Snapshot validation] Invalid type for step2Answers (expected array)",
    );
    return false;
  }

  if (!Array.isArray(context.step3Answers)) {
    console.warn(
      "[Snapshot validation] Invalid type for step3Answers (expected array)",
    );
    return false;
  }

  if (
    typeof context.step1Responses !== "object" ||
    context.step1Responses === null ||
    Array.isArray(context.step1Responses)
  ) {
    console.warn(
      "[Snapshot validation] Invalid type for step1Responses (expected object, not array)",
    );
    return false;
  }

  if (
    typeof context.step5Responses !== "object" ||
    context.step5Responses === null ||
    Array.isArray(context.step5Responses)
  ) {
    console.warn(
      "[Snapshot validation] Invalid type for step5Responses (expected object, not array)",
    );
    return false;
  }

  if (
    typeof context.artifacts !== "object" ||
    context.artifacts === null ||
    Array.isArray(context.artifacts)
  ) {
    console.warn(
      "[Snapshot validation] Invalid type for artifacts (expected object, not array)",
    );
    return false;
  }

  if (typeof context.updatedAt !== "string") {
    console.warn(
      "[Snapshot validation] Invalid type for updatedAt (expected string)",
    );
    return false;
  }

  return true;
}

/**
 * Safe snapshot parser with validation and fallback.
 *
 * Attempts to parse and validate JSON snapshot data. On failure
 * (invalid JSON or validation failure), returns the default snapshot
 * instead of throwing.
 *
 * @param serialized - JSON string from localStorage
 * @param defaultSnapshot - Fallback if validation fails
 * @returns Validated snapshot or default
 *
 * @example
 * ```typescript
 * const stored = localStorage.getItem('planning-machine-state');
 * const machine = createPlanningMachine({...});
 * const defaultSnapshot = machine.getInitialSnapshot();
 *
 * const snapshot = stored
 *   ? parseSnapshot(stored, defaultSnapshot)
 *   : defaultSnapshot;
 *
 * const actor = createActor(machine, { snapshot });
 * ```
 */
export function parseSnapshot(
  serialized: string,
  defaultSnapshot: PlanningSnapshot,
): PlanningSnapshot {
  try {
    const parsed = JSON.parse(serialized);

    if (!isValidSnapshot(parsed)) {
      console.warn(
        "[Snapshot] Validation failed, using default state",
        "This usually means localStorage data is corrupted or from an old version.",
      );
      return defaultSnapshot;
    }

    return parsed;
  } catch (error) {
    console.error(
      "[Snapshot] Parse error, using default state:",
      error instanceof Error ? error.message : String(error),
    );
    return defaultSnapshot;
  }
}
