/**
 * React Context Provider for Planning Machine
 * XState v5 pattern with database-first initialization (React Query)
 *
 * ARCHITECTURE (State Sync Fix - Issue #15):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. Optimistic render from localStorage cache (instant, no loading state)
 * 2. Database query via React Query (background, authoritative)
 * 3. Hot-reload actor when database snapshot differs from cache
 * 4. Graceful error handling and offline support
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useQuery } from "@tanstack/react-query";
import { useSelector as useXStateSelector } from "@xstate/react";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import { createActor, type SnapshotFrom } from "xstate";
import { parseOptions } from "../../ai/parse-options";
import {
  $assessGapAnalysisNeed,
  $generateArtifact,
  $generateQuestion,
} from "../../ai/server";
import {
  trackCacheHit,
  trackError,
  trackSyncLatency,
} from "../infrastructure/metrics";
import { StatePersistence } from "../infrastructure/persistence";
import { $loadPlanningState } from "../infrastructure/server-functions";
import { parseSnapshot } from "../infrastructure/snapshot-guards";
import { STEP_KEYS } from "./constants";
import { createPlanningMachine } from "./planning-machine-factory";
import type { PlanningInput } from "./types";

// ─────────────────────────────────────────────────────────────
// MACHINE CREATION
// ─────────────────────────────────────────────────────────────

/**
 * Create planning machine with injected server functions.
 * Server functions are imported at module level (server-side safe in TanStack Start).
 * Dependencies are injected at machine creation time for better performance and testability.
 */
const planningMachine = createPlanningMachine({
  $generateQuestion,
  $assessGapAnalysisNeed,
  $generateArtifact,
  parseOptions,
});

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ActorType = ReturnType<typeof createActor<typeof planningMachine>>;
type SnapshotType = SnapshotFrom<typeof planningMachine>;

type PlanningMachineContextValue = {
  actor: ActorType;
};

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────

const PlanningMachineContext =
  createContext<PlanningMachineContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────

type PlanningMachineProviderProps = {
  children: ReactNode;
  input: PlanningInput;
  storageKey?: string;
};

export function PlanningMachineProvider({
  children,
  input,
  storageKey = "planning-machine-state",
}: PlanningMachineProviderProps) {
  const projectId = input.projectId;

  // BUG-035 DEBUG: Log provider mount/update with timestamp
  const timestamp = new Date().toISOString();
  console.log(`[BUG-035][${timestamp}] PlanningMachineProvider render START:`, {
    projectId,
    storageKey,
    inputObject: input,
    stack: new Error().stack?.split("\n").slice(2, 4).join("\n"),
  });

  // ============================================================================
  // STEP 1: Optimistic read from cache (synchronous, instant)
  // ============================================================================
  // Need default snapshot for validation fallback - create temp actor to get it
  const defaultSnapshotForValidation = React.useMemo(() => {
    const tempActor = createActor(planningMachine, { input });
    const snapshot = tempActor.getSnapshot();
    // Don't start the actor, we just need the initial snapshot structure
    return snapshot;
  }, [input]);

  const cachedSnapshot = React.useMemo(
    () => loadStateSync(storageKey, defaultSnapshotForValidation),
    [storageKey, defaultSnapshotForValidation],
  );

  // ============================================================================
  // STEP 2: Query database for authoritative state (async, background)
  // ============================================================================
  const {
    data: dbSnapshot,
    isLoading: isLoadingDb,
    error: dbError,
  } = useQuery({
    queryKey: ["planningState", projectId],
    queryFn: async () => {
      console.log("[PlanningMachineProvider] Fetching from database");
      try {
        const snapshot = await trackSyncLatency(
          "load_planning_state",
          async () => {
            return await $loadPlanningState({ data: { projectId } });
          },
        );
        console.log("[PlanningMachineProvider] Database fetch complete");
        return snapshot;
      } catch (error) {
        trackError("load_planning_state", error, { projectId });
        throw error;
      }
    },
    // Refetch on mount for fresh state; 10s staleTime for active workflows
    staleTime: 10000, // Consider fresh for 10 seconds (real-time workflow behavior)
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes (better offline support)
    refetchOnMount: true, // Fetch fresh data on remount
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // ============================================================================
  // STEP 3: Determine authoritative snapshot
  // ============================================================================
  const authoritativeSnapshot = React.useMemo(() => {
    const timestamp = new Date().toISOString();

    // Prefer database over cache
    if (dbSnapshot) {
      console.log(`[BUG-035][${timestamp}] Authoritative: DATABASE snapshot`, {
        projectIdInSnapshot: dbSnapshot.context?.projectId,
        expectedProjectId: projectId,
        MISMATCH:
          dbSnapshot.context?.projectId !== projectId
            ? "⚠️ PROJECT ID MISMATCH!"
            : "✓ Match",
      });
      trackCacheHit(projectId, false); // Database fetch = cache miss
      return dbSnapshot;
    }

    // Fallback to cache while loading
    if (isLoadingDb && cachedSnapshot?.context?.projectId === projectId) {
      console.log(
        `[BUG-035][${timestamp}] Authoritative: CACHED snapshot (while loading)`,
        {
          projectIdInSnapshot: cachedSnapshot.context?.projectId,
          expectedProjectId: projectId,
          MISMATCH:
            cachedSnapshot.context?.projectId !== projectId
              ? "⚠️ PROJECT ID MISMATCH!"
              : "✓ Match",
        },
      );
      trackCacheHit(projectId, true); // Using cache
      return cachedSnapshot;
    }

    // If database errored but we have cache, use cache
    if (dbError && cachedSnapshot?.context?.projectId === projectId) {
      console.warn(
        `[BUG-035][${timestamp}] Authoritative: CACHED snapshot (DB error fallback)`,
        {
          projectIdInSnapshot: cachedSnapshot.context?.projectId,
          expectedProjectId: projectId,
          error: dbError,
        },
      );
      trackCacheHit(projectId, true); // Using cache (error fallback)
      trackError("load_planning_state_fallback", dbError, { projectId });
      return cachedSnapshot;
    }

    // Last resort: null (will create fresh actor)
    console.log(
      `[BUG-035][${timestamp}] Authoritative: NULL (creating fresh actor)`,
      {
        expectedProjectId: projectId,
        isLoadingDb,
        hasDbSnapshot: !!dbSnapshot,
        hasCachedSnapshot: !!cachedSnapshot,
        cachedProjectId: cachedSnapshot?.context?.projectId,
        validationPassed: cachedSnapshot?.context?.projectId === projectId,
      },
    );
    trackCacheHit(projectId, false); // No cache available
    return null;
  }, [dbSnapshot, cachedSnapshot, isLoadingDb, dbError, projectId]);

  // ============================================================================
  // STEP 4: Create actor ONCE from initial snapshot (cache or database)
  // ============================================================================
  // ✅ FIX (BUG-022 Phase 3): Only create actor ONCE per projectId
  //
  // PROBLEM: Actor was being RECREATED when database snapshot arrived,
  // discarding the correctly-restored actor from cache and replacing it
  // with a (potentially stale) database snapshot.
  //
  // SOLUTION: Create actor only once from initial authoritative snapshot.
  // Use RESTORE_SNAPSHOT event (via hot-reload useEffect) to update
  // actor state when database arrives, instead of recreating the actor.
  //
  // ✅ FIX (BUG-037): Prevent cross-project state leakage
  //
  // PROBLEM: When navigating project A → B without page reload, the useRef
  // persisted project A's snapshot. Even though useMemo re-ran (input changed),
  // it read the stale ref and created project B's actor from project A's state.
  //
  // SOLUTION (defense-in-depth):
  // 1. Add key={projectId} to PlanningMachineProvider (app/routes/project/$projectId.tsx:70)
  //    Forces full unmount/remount on project change, resetting all refs
  // 2. Defensive validation: Reset ref if snapshot.context.projectId !== input.projectId
  // 3. Fail-safe: If validation fails, create fresh actor (never use wrong-project snapshot)
  //
  // Why useMemo with `input` dependency is correct:
  // - Actor should be recreated if projectId changes (different project)
  // - Input contains projectId and entryPath (project-specific, immutable per project)
  // - Actor should NOT be recreated when authoritative snapshot changes
  //   (that's what hot-reload is for)
  const initialSnapshot = React.useRef(authoritativeSnapshot);

  // ✅ BUG-037 Defense: Reset ref if projectId changes
  // This is redundant with key={projectId} but provides defense if key is removed
  React.useEffect(() => {
    const currentSnapshotProjectId =
      initialSnapshot.current?.context?.projectId;
    if (
      currentSnapshotProjectId &&
      currentSnapshotProjectId !== input.projectId
    ) {
      console.warn(
        `[BUG-037] CROSS-PROJECT REF DETECTED — resetting initialSnapshot ref`,
        {
          staleProjectId: currentSnapshotProjectId,
          newProjectId: input.projectId,
          timestamp: new Date().toISOString(),
        },
      );
      trackError(
        "cross_project_ref_prevented",
        new Error("Cross-project ref detected"),
        {
          staleProjectId: currentSnapshotProjectId,
          newProjectId: input.projectId,
        },
      );
      initialSnapshot.current = null; // Reset to force fresh actor
    }
  }, [input.projectId]);

  const actor = React.useMemo(() => {
    const snapshot = initialSnapshot.current;
    const timestamp = new Date().toISOString();

    if (snapshot) {
      // ✅ BUG-037 Validation: Reject snapshot if projectId mismatch
      const projectIdMismatch = snapshot.context?.projectId !== input.projectId;

      console.log(`[BUG-035][${timestamp}] Creating actor FROM SNAPSHOT:`, {
        projectIdFromSnapshot: snapshot.context?.projectId,
        projectIdFromInput: input.projectId,
        currentStepNumber: snapshot.context?.currentStepNumber,
        stateValue: snapshot.value,
        status: snapshot.status,
        MISMATCH: projectIdMismatch ? "⚠️ PROJECT ID MISMATCH!" : "✓ Match",
      });

      // ✅ BUG-037 Fail-safe: Never use wrong-project snapshot
      if (projectIdMismatch) {
        console.error(
          `[BUG-037] CRITICAL: Prevented cross-project contamination!`,
          {
            rejectedProjectId: snapshot.context?.projectId,
            correctProjectId: input.projectId,
            timestamp,
          },
        );
        trackError(
          "cross_project_snapshot_rejected",
          new Error("Cross-project snapshot rejected"),
          {
            rejectedProjectId: snapshot.context?.projectId,
            correctProjectId: input.projectId,
          },
        );
        // Create fresh actor instead of using contaminated snapshot
        console.log(
          `[BUG-037][${timestamp}] Creating FRESH actor (rejected cross-project snapshot)`,
        );
        return createActor(planningMachine, { input });
      }

      // When restoring from snapshot, we still need to provide input for type safety,
      // but the snapshot's context will take precedence over the input's initial values.
      const newActor = createActor(planningMachine, {
        input: {
          projectId: snapshot.context.projectId,
          entryPath: snapshot.context.entryPath,
        },
        snapshot: snapshot as SnapshotType,
      });

      console.log(`[BUG-035][${timestamp}] Actor created, verifying state:`, {
        value: newActor.getSnapshot().value,
        projectId: newActor.getSnapshot().context.projectId,
        currentStepNumber: newActor.getSnapshot().context.currentStepNumber,
      });

      return newActor;
    }

    console.log(
      `[BUG-035][${timestamp}] Creating FRESH actor for projectId:`,
      input.projectId,
    );
    return createActor(planningMachine, { input });
  }, [input]); // Only recreate if input changes

  // BUG-035 DEBUG: Track input object changes that trigger actor recreation
  React.useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(
      `[BUG-035][${timestamp}] Input object changed (useMemo dependency):`,
      {
        projectId: input.projectId,
        entryPath: input.entryPath,
        actorProjectId: actor.getSnapshot().context.projectId,
      },
    );
  }, [input, actor]);

  // ============================================================================
  // STEP 5: Start actor and setup persistence
  // ============================================================================
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(
      `[BUG-035][${timestamp}] Starting actor for projectId:`,
      actor.getSnapshot().context.projectId,
    );

    try {
      actor.start();

      // Log state IMMEDIATELY after start
      const afterStartSnapshot = actor.getSnapshot();
      console.log(
        "[PlanningMachineProvider] Actor state immediately after start:",
        {
          value: afterStartSnapshot.value,
          currentStepNumber: afterStartSnapshot.context.currentStepNumber,
          status: afterStartSnapshot.status,
        },
      );
    } catch (error) {
      console.warn("[PlanningMachineProvider] Actor start failed:", error);
    }

    // Resume automated steps if needed
    const restoredAutomatedStep = getRestoredAutomatedStep(actor.getSnapshot());
    console.log(
      "[PlanningMachineProvider] Checking for restored automated step:",
      restoredAutomatedStep,
    );

    if (restoredAutomatedStep) {
      console.log(
        "[PlanningMachineProvider] Sending RESUME_AUTOMATED_STEP event:",
        restoredAutomatedStep,
      );
      actor.send({
        type: "RESUME_AUTOMATED_STEP",
        stepNumber: restoredAutomatedStep,
      });

      // Log state after RESUME event
      const afterResumeSnapshot = actor.getSnapshot();
      console.log(
        "[PlanningMachineProvider] Actor state after RESUME_AUTOMATED_STEP:",
        {
          value: afterResumeSnapshot.value,
          currentStepNumber: afterResumeSnapshot.context.currentStepNumber,
        },
      );
    }

    // ✅ Unified persistence layer (handles localStorage + database)
    // StatePersistence subscribes to actor state changes and:
    // 1. Immediately writes to localStorage (synchronous, instant)
    // 2. Debounces database writes to 500ms (async, fire-and-forget)
    // 3. Skips transient states (submitting, generatingArtifact)
    const persistence = new StatePersistence(actor, projectId, storageKey);

    // Expose actor for debugging
    if (typeof window !== "undefined") {
      // biome-ignore lint/suspicious/noExplicitAny: window augmentation for debugging
      (window as any).__planningActor = actor;
    }

    // Cleanup
    return () => {
      persistence.destroy();

      if (process.env.NODE_ENV === "production") {
        actor.stop();
      }
    };
  }, [actor, storageKey, projectId]);

  // ============================================================================
  // STEP 6: Hot-reload actor when database data arrives
  // ============================================================================
  useEffect(() => {
    if (!dbSnapshot || !actor) return;

    const currentSnapshot = actor.getSnapshot();

    // Check if database state is different from current actor state
    if (snapshotsEqual(currentSnapshot, dbSnapshot)) {
      console.log(
        "[PlanningMachineProvider] Database snapshot matches current state",
      );
      return;
    }

    console.log(
      "[PlanningMachineProvider] Database snapshot differs, hot-reloading actor",
    );

    // Send RESTORE event to machine
    actor.send({ type: "RESTORE_SNAPSHOT", snapshot: dbSnapshot });
  }, [dbSnapshot, actor]);

  // ============================================================================
  // STEP 7: Loading and error states
  // ============================================================================

  // Show loading spinner ONLY if no authoritative state available
  if (!authoritativeSnapshot && isLoadingDb) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading workflow state...</p>
        </div>
      </div>
    );
  }

  // Show error boundary if database fails AND no authoritative state available
  if (dbError && !authoritativeSnapshot) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Failed to load workflow state
          </h2>
          <p className="text-gray-600 mb-4">
            {dbError instanceof Error ? dbError.message : "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      {children}
    </PlanningMachineContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────

/**
 * Access the planning machine actor
 */
export function usePlanningMachine() {
  const context = useContext(PlanningMachineContext);
  if (!context) {
    throw new Error(
      "usePlanningMachine must be used within PlanningMachineProvider",
    );
  }
  return context.actor;
}

/**
 * Select a value from the machine state with automatic re-renders
 *
 * @example
 * const currentStep = useSelector((state) => state.value);
 * const error = useSelector((state) => state.context.error);
 */
export function useSelector<T>(selector: (snapshot: SnapshotType) => T): T {
  const actor = usePlanningMachine();
  return useXStateSelector(actor, selector);
}

function getRestoredAutomatedStep(snapshot: SnapshotType): number | null {
  const stateValue = snapshot.value;
  if (typeof stateValue !== "object" || stateValue === null) return null;

  const automatedStates: Array<[string, number]> = [
    [STEP_KEYS.STEP_4_STYLE_ANCHORS, 4],
    [STEP_KEYS.STEP_6_DEFINITION_OF_DONE, 6],
    [STEP_KEYS.STEP_8_DELIVERY_TIMELINE, 8],
    [STEP_KEYS.STEP_9_QA_TEST_PLAN, 9],
    [STEP_KEYS.STEP_10_SUMMARIES, 10],
  ];

  for (const [stateName, stepNumber] of automatedStates) {
    if (
      stateName in stateValue &&
      stateValue[stateName as keyof typeof stateValue] === "generating" &&
      !snapshot.context.artifacts[stepNumber]
    ) {
      return stepNumber;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// UTILITY: Snapshot comparison
// ─────────────────────────────────────────────────────────────

/**
 * Compare two snapshots for equality (deep comparison)
 * Used to prevent unnecessary hot-reloads when database snapshot matches current state
 */
function snapshotsEqual(
  a: SnapshotType,
  // biome-ignore lint/suspicious/noExplicitAny: database snapshot may have different structure
  b: any,
): boolean {
  if (!a || !b) return false;

  // Quick check: same timestamp means same snapshot (high confidence)
  if (a.context.updatedAt === b.context?.updatedAt) {
    return true;
  }

  // Fallback: deep comparison of context
  // (State value can differ due to transient states like "submitting")
  try {
    return JSON.stringify(a.context) === JSON.stringify(b.context);
  } catch (error) {
    // JSON.stringify can fail on circular refs, functions, etc.
    console.warn("[snapshotsEqual] JSON comparison failed:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// PERSISTENCE HELPERS
// ─────────────────────────────────────────────────────────────

function _toPlainSnapshot(snapshot: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

/**
 * Load state synchronously from localStorage cache
 * Database serves as single source of truth, loaded via React Query
 *
 * Uses type-safe parseSnapshot() to validate structure before deserialization.
 * Invalid/corrupted data results in null (fresh state), not a crash.
 *
 * @param key - localStorage key
 * @param defaultSnapshot - Fallback snapshot if validation fails
 */
function loadStateSync(
  key: string,
  defaultSnapshot: SnapshotType,
): SnapshotType | null {
  // Skip during SSR
  if (typeof window === "undefined") return null;

  // BUG-035 DEBUG: Log localStorage lookup with timestamp
  const timestamp = new Date().toISOString();
  console.log(`[BUG-035][${timestamp}] loadStateSync called:`, {
    key,
    stack: new Error().stack?.split("\n").slice(2, 5).join("\n"),
  });

  try {
    const stored = localStorage.getItem(key);
    const parsedData = stored ? JSON.parse(stored) : null;
    console.log(`[BUG-035][${timestamp}] localStorage.getItem result:`, {
      key,
      hasData: !!stored,
      projectIdInData: parsedData?.context?.projectId,
      currentStepInData: parsedData?.context?.currentStepNumber,
      dataPreview: stored ? stored.substring(0, 200) : null,
    });
    if (!stored) return null;

    // Type-safe parsing with validation
    const snapshot = parseSnapshot(stored, defaultSnapshot);

    // If validation failed, parseSnapshot returned default - treat as no cached state
    if (snapshot === defaultSnapshot) {
      console.warn(
        "[PlanningMachineContext] Cached state invalid, clearing localStorage",
      );
      try {
        localStorage.removeItem(key);
      } catch (clearError) {
        console.error(
          "[PlanningMachineContext] Failed to clear cache:",
          clearError,
        );
      }
      return null;
    }

    // Defensive reset of status to 'active' (snapshots should always be active when loaded)
    if (snapshot.status !== "active") {
      console.warn(
        "[PlanningMachineContext] Restoring snapshot with non-active status:",
        snapshot.status,
        "- forcing to active",
      );
      // biome-ignore lint/suspicious/noExplicitAny: Snapshot mutation for status reset
      (snapshot as any).status = "active";
    }

    return snapshot;
  } catch (error) {
    // parseSnapshot already handles parse errors, but catch any unexpected errors
    console.error(
      "[PlanningMachineContext] Unexpected error loading state:",
      error,
    );
    return null;
  }
}
