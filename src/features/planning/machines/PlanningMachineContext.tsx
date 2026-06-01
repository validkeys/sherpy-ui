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
import {
  trackCacheHit,
  trackError,
  trackSyncLatency,
} from "../infrastructure/metrics";
import { StatePersistence } from "../infrastructure/persistence";
import { $loadPlanningState } from "../infrastructure/server-functions";
import { planningMachine } from "./planningMachine";
import type { PlanningInput } from "./types";

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

  // ============================================================================
  // STEP 1: Optimistic read from cache (synchronous, instant)
  // ============================================================================
  const cachedSnapshot = React.useMemo(
    () => loadStateSync(storageKey),
    [storageKey],
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
    staleTime: 30000, // Consider fresh for 30 seconds (reduce DB load)
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes (better offline support)
    refetchOnMount: false, // Don't refetch if cache is fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // ============================================================================
  // STEP 3: Determine authoritative snapshot
  // ============================================================================
  const authoritativeSnapshot = React.useMemo(() => {
    // Prefer database over cache
    if (dbSnapshot) {
      console.log("[PlanningMachineProvider] Using database snapshot");
      trackCacheHit(projectId, false); // Database fetch = cache miss
      return dbSnapshot;
    }

    // Fallback to cache while loading
    if (isLoadingDb && cachedSnapshot?.context?.projectId === projectId) {
      console.log(
        "[PlanningMachineProvider] Using cached snapshot while loading",
      );
      trackCacheHit(projectId, true); // Using cache
      return cachedSnapshot;
    }

    // If database errored but we have cache, use cache
    if (dbError && cachedSnapshot?.context?.projectId === projectId) {
      console.warn(
        "[PlanningMachineProvider] Database error, falling back to cache:",
        dbError,
      );
      trackCacheHit(projectId, true); // Using cache (error fallback)
      trackError("load_planning_state_fallback", dbError, { projectId });
      return cachedSnapshot;
    }

    // Last resort: null (will create fresh actor)
    console.log(
      "[PlanningMachineProvider] No snapshot available, creating fresh",
    );
    trackCacheHit(projectId, false); // No cache available
    return null;
  }, [dbSnapshot, cachedSnapshot, isLoadingDb, dbError, projectId]);

  // ============================================================================
  // STEP 4: Create actor with authoritative state
  // ============================================================================
  const actor = React.useMemo(() => {
    if (authoritativeSnapshot) {
      console.log(
        "[PlanningMachineProvider] Creating actor from snapshot:",
        authoritativeSnapshot.context?.currentStepNumber,
      );
      return createActor(planningMachine, {
        input,
        snapshot: authoritativeSnapshot as SnapshotType,
      });
    }

    console.log("[PlanningMachineProvider] Creating fresh actor");
    return createActor(planningMachine, { input });
  }, [authoritativeSnapshot, input]);

  // ============================================================================
  // STEP 5: Start actor and setup persistence
  // ============================================================================
  useEffect(() => {
    console.log("[PlanningMachineProvider] Starting actor");

    try {
      actor.start();
    } catch (error) {
      console.warn("[PlanningMachineProvider] Actor start failed:", error);
    }

    // Resume automated steps if needed
    const restoredAutomatedStep = getRestoredAutomatedStep(actor.getSnapshot());
    if (restoredAutomatedStep) {
      actor.send({
        type: "RESUME_AUTOMATED_STEP",
        stepNumber: restoredAutomatedStep,
      });
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
    ["step4_styleAnchors", 4],
    ["step6_definitionOfDone", 6],
    ["step8_deliveryTimeline", 8],
    ["step9_qaTestPlan", 9],
    ["step10_summaries", 10],
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

/**
 * Save state to localStorage cache
 * Database persistence is handled by server-side snapshot saves
 */
function saveState(key: string, snapshot: SnapshotType): void {
  // Skip during SSR
  if (typeof window === "undefined") return;

  try {
    const persistedSnapshot = toPlainSnapshot(snapshot.toJSON());
    localStorage.setItem(key, JSON.stringify(persistedSnapshot));
  } catch (error) {
    console.error("[PlanningMachineContext] Failed to save state:", error);
  }
}

function toPlainSnapshot(snapshot: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

/**
 * Load state synchronously from localStorage cache
 * Database serves as single source of truth, loaded via React Query
 */
function loadStateSync(key: string): SnapshotType | null {
  // Skip during SSR
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate that we have a complete XState v5 snapshot
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.status ||
      !parsed.value ||
      !parsed.context ||
      typeof parsed.context !== "object"
    ) {
      throw new Error(
        "Invalid snapshot structure: missing required fields (status, value, context). " +
          "This may be from an old version. Clearing and starting fresh.",
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

    // Defensive reset of status to 'active'
    if (parsed.status !== "active") {
      console.warn(
        "[PlanningMachineContext] Restoring snapshot with non-active status:",
        parsed.status,
        "- forcing to active",
      );
      parsed.status = "active";
    }

    return parsed as unknown as SnapshotType;
  } catch (error) {
    // Auto-recover by clearing corrupted/outdated state
    console.error(
      "[PlanningMachineContext] ⚠️  Invalid state detected, clearing and starting fresh:",
      error,
    );
    try {
      localStorage.removeItem(key);
    } catch (clearError) {
      console.error(
        "[PlanningMachineContext] Failed to clear invalid state:",
        clearError,
      );
    }
    return null; // Start with fresh state
  }
}
