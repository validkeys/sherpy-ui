/**
 * StatePersistence - Single persistence layer for planning workflow state
 *
 * Replaces the dual persistence pattern (60% DB + 100% localStorage) with a
 * unified approach that:
 * - Writes to localStorage immediately (optimistic UI, zero latency)
 * - Writes to database with 500ms debouncing (authoritative source, batched)
 * - Persists auxiliary tables (interview answers, form responses)
 * - Filters transient states to reduce noise
 * - Uses fire-and-forget error handling (workflow never blocks on persistence)
 *
 * @module features/planning/infrastructure/persistence
 */

import type { SnapshotFrom } from "xstate";
import type { planningMachine } from "../machines/planningMachine";
import { trackError } from "./metrics";

// ============================================================================
// Types
// ============================================================================

type ActorType = any; // Actor from createActor
type SnapshotType = SnapshotFrom<typeof planningMachine>;

// ============================================================================
// StatePersistence Class
// ============================================================================

/**
 * Handles all state persistence for the planning workflow.
 *
 * Subscribe once on actor creation, persist automatically on every state change.
 * Debouncing prevents database hammering during rapid transitions.
 *
 * @example
 * ```ts
 * const persistence = new StatePersistence(
 *   actor,
 *   projectId,
 *   `planning-state-${projectId}`
 * );
 *
 * // Cleanup on unmount
 * useEffect(() => {
 *   return () => persistence.destroy();
 * }, []);
 * ```
 */
export class StatePersistence {
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingSnapshot: SnapshotType | null = null;
  private unsubscribe: { unsubscribe: () => void } | null = null;

  constructor(
    private actor: ActorType,
    private projectId: string,
    private storageKey: string,
  ) {
    // Subscribe to future state changes
    this.unsubscribe = this.actor.subscribe((snapshot: SnapshotType) => {
      this.persist(snapshot);
    });

    // ✅ CRITICAL: Persist initial state immediately (BUG-009 pattern)
    // XState v5 subscribe() only fires on FUTURE changes, not current state
    // Without this, localStorage remains empty if actor is stable and no events fire
    this.persist(this.actor.getSnapshot());
  }

  /**
   * Clean up subscriptions and timers.
   * Call this when component unmounts or actor is destroyed.
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.unsubscribe) {
      this.unsubscribe.unsubscribe();
    }
  }

  /**
   * Main persistence handler - called on every state change.
   *
   * Writes to localStorage immediately (optimistic UI).
   * Debounces database writes to batch rapid transitions.
   */
  private persist(snapshot: SnapshotType): void {
    // Skip transient states
    if (this.isTransientState(snapshot)) {
      return;
    }

    // 1. IMMEDIATE: localStorage (optimistic UI)
    this.persistToLocalStorage(snapshot);

    // 2. DEBOUNCED: Database (authoritative, batched)
    this.debouncedPersistToDatabase(snapshot);
  }

  /**
   * Write to localStorage immediately (synchronous, fast).
   *
   * Provides optimistic UI updates with zero latency.
   * Errors are logged but don't block the workflow.
   */
  private persistToLocalStorage(snapshot: SnapshotType): void {
    if (typeof window === "undefined") return;

    try {
      // Convert to plain object to strip non-serializable properties
      // snapshot.toJSON() returns serializable representation
      // Double JSON parse/stringify strips getters and functions
      const plainSnapshot = JSON.parse(JSON.stringify(snapshot.toJSON()));
      const serialized = JSON.stringify(plainSnapshot);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error("[StatePersistence] localStorage failed:", error);
    }
  }

  /**
   * Debounce database writes to 500ms.
   *
   * Prevents hammering the database during rapid state transitions
   * (e.g., 10 questions answered in quick succession = 1 DB write, not 10).
   */
  private debouncedPersistToDatabase(snapshot: SnapshotType): void {
    // Store latest snapshot
    this.pendingSnapshot = snapshot;

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Wait 500ms for rapid transitions to settle
    this.debounceTimer = setTimeout(() => {
      if (this.pendingSnapshot) {
        const snapshotToSave = this.pendingSnapshot;
        this.pendingSnapshot = null;

        // Catch both synchronous throws and async rejections
        try {
          this.persistAllToDatabase(snapshotToSave).catch((error) => {
            console.error("[StatePersistence] Async persistence error:", error);
          });
        } catch (error) {
          console.error("[StatePersistence] Sync persistence error:", error);
        }
      }
    }, 500);
  }

  /**
   * Persist snapshot and auxiliary tables to database.
   *
   * Fire-and-forget pattern: async but never throws.
   * Errors are logged for observability but don't interrupt the workflow.
   */
  private async persistAllToDatabase(snapshot: SnapshotType): Promise<void> {
    const startTime = Date.now();

    try {
      // Import server function (dynamic to prevent bundling)
      const { $savePlanningState } = await import("./server-functions");

      // Persist main state snapshot
      await $savePlanningState({
        data: {
          projectId: this.projectId,
          snapshot,
        },
      });

      // Persist auxiliary tables (interview answers, form responses)
      await this.persistAuxiliaryTables(snapshot);

      const duration = Date.now() - startTime;
      console.log("[StatePersistence] ✅ Database synced:", {
        projectId: this.projectId,
        step: snapshot.context.currentStepNumber,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log but don't throw - workflow continues with localStorage
      console.error("[StatePersistence] ❌ Database sync failed:", {
        projectId: this.projectId,
        step: snapshot.context.currentStepNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      trackError("database_persistence_failed", error, {
        projectId: this.projectId,
        currentStep: snapshot.context.currentStepNumber,
      });
    }
  }

  /**
   * Persist auxiliary tables (interview answers, form responses).
   *
   * These tables support reporting and analytics outside the main workflow.
   * Errors here don't block main state persistence.
   *
   * NOTE: This re-persists ALL answers/responses on every state change.
   * Repository functions (saveInterviewAnswer, saveFormResponse) use UPSERT
   * logic to prevent duplicates. This is acceptable because:
   * 1. Debouncing (500ms) batches rapid changes
   * 2. Database handles idempotency via UPSERT
   * 3. Simpler than tracking which items are already persisted
   */
  private async persistAuxiliaryTables(snapshot: SnapshotType): Promise<void> {
    try {
      const { saveInterviewAnswer, saveFormResponse } = await import(
        "./repository"
      );

      // Persist Step 2 & 3 interview answers (UPSERT via repository)
      const step2Promises = snapshot.context.step2Answers.map((answer: any) =>
        saveInterviewAnswer(this.projectId, 2, answer.question, answer.answer),
      );
      const step3Promises = snapshot.context.step3Answers.map((answer: any) =>
        saveInterviewAnswer(this.projectId, 3, answer.question, answer.answer),
      );

      // Persist Step 1 & 5 form responses
      const step1Promises = Object.entries(snapshot.context.step1Responses).map(
        ([field, value]) =>
          saveFormResponse(this.projectId, 1, field, value as string),
      );
      const step5Promises = Object.entries(snapshot.context.step5Responses).map(
        ([field, value]) =>
          saveFormResponse(this.projectId, 5, field, value as string),
      );

      // Execute all in parallel
      await Promise.all([
        ...step2Promises,
        ...step3Promises,
        ...step1Promises,
        ...step5Promises,
      ]);
    } catch (error) {
      // Log but don't throw - auxiliary persistence failure isn't critical
      console.error(
        "[StatePersistence] Auxiliary table persistence failed:",
        error,
      );
    }
  }

  /**
   * Check if state is transient and should be skipped.
   *
   * Transient states like "submitting" or "generatingArtifact" are
   * short-lived and don't need to be persisted.
   */
  private isTransientState(snapshot: SnapshotType): boolean {
    const stateValue = snapshot.value as any;
    if (typeof stateValue !== "object" || stateValue === null) {
      return false;
    }

    return Object.values(stateValue).some(
      (v: any) => v === "submitting" || v === "generatingArtifact",
    );
  }
}
