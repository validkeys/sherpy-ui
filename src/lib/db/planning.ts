/**
 * Database operations for planning_state table
 * Stores XState machine snapshots for persistence
 */

import type { SnapshotFrom } from "xstate";
import type { planningMachine } from "../../features/planning/machines/planningMachine";
import { db } from "./index";
import type { DBPlanningState } from "./types";

type PlanningSnapshot = SnapshotFrom<typeof planningMachine>;

/**
 * Save or update planning state snapshot for a project
 */
export function savePlanningState(
  projectId: string,
  snapshot: PlanningSnapshot,
): void {
  const now = new Date().toISOString();
  const xstateSnapshot = JSON.stringify(snapshot.toJSON());

  const stmt = db.prepare(`
    INSERT INTO planning_state (project_id, xstate_snapshot, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      xstate_snapshot = excluded.xstate_snapshot,
      updated_at = excluded.updated_at
  `);

  stmt.run(projectId, xstateSnapshot, now, now);
}

/**
 * Load planning state snapshot for a project
 * Returns null if no snapshot exists
 */
export function loadPlanningState(projectId: string): PlanningSnapshot | null {
  const stmt = db.prepare<[string], DBPlanningState>(`
    SELECT project_id, xstate_snapshot, created_at, updated_at
    FROM planning_state
    WHERE project_id = ?
  `);

  const row = stmt.get(projectId);
  if (!row) return null;

  try {
    // Parse the stored JSON snapshot
    const parsed = JSON.parse(row.xstate_snapshot);

    // Validate snapshot structure (same validation as localStorage)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.status ||
      !parsed.value ||
      !parsed.context ||
      typeof parsed.context !== "object"
    ) {
      throw new Error(
        "Invalid snapshot structure: missing required fields (status, value, context)",
      );
    }

    // Validate critical context fields
    if (
      !parsed.context.projectId ||
      typeof parsed.context.currentStepNumber !== "number"
    ) {
      throw new Error(
        "Invalid context: missing projectId or currentStepNumber",
      );
    }

    // Force status to 'active' for restoration (defense-in-depth)
    if (parsed.status !== "active") {
      console.warn(
        "[planning.ts] Restoring snapshot with non-active status:",
        parsed.status,
        "- forcing to active",
      );
      parsed.status = "active";
    }

    return parsed as PlanningSnapshot;
  } catch (error) {
    console.error(
      "[planning.ts] Failed to parse planning state snapshot:",
      error,
    );
    return null;
  }
}

/**
 * Delete planning state for a project
 * Automatically cascades when project is deleted due to FOREIGN KEY
 */
export function deletePlanningState(projectId: string): void {
  const stmt = db.prepare(`
    DELETE FROM planning_state WHERE project_id = ?
  `);
  stmt.run(projectId);
}

/**
 * Check if planning state exists for a project
 */
export function hasPlanningState(projectId: string): boolean {
  const stmt = db.prepare<[string], { count: number }>(`
    SELECT COUNT(*) as count FROM planning_state WHERE project_id = ?
  `);
  const row = stmt.get(projectId);
  return row ? row.count > 0 : false;
}

/**
 * Clear all planning state (for testing only)
 * @internal
 */
export function _clearPlanningState(): void {
  db.prepare("DELETE FROM planning_state").run();
}
