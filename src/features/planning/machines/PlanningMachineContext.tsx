/**
 * React Context Provider for Planning Machine
 * XState v5 pattern with localStorage persistence
 */

import { useSelector as useXStateSelector } from "@xstate/react";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
} from "react";
import { createActor, type SnapshotFrom } from "xstate";
import { $loadPlanningState, $savePlanningState } from "../server";
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
  // ============================================================================
  // BUG-013 FIX: Ensure single actor instance survives StrictMode remounts
  // ============================================================================
  // HYBRID PERSISTENCE STRATEGY:
  // - localStorage: synchronous cache for instant restoration on mount
  // - Database: async primary storage, synced in background
  // This allows synchronous initialization (no loading states) while moving
  // to database persistence. localStorage acts as a read-through cache.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally empty deps - actor should be created once per component lifetime (BUG-013 fix)
  const actor = React.useMemo(() => {
    // Try to restore from localStorage cache (synchronous)
    const persistedState = loadStateSync(storageKey);

    if (
      persistedState &&
      persistedState.context.projectId === input.projectId
    ) {
      // Restore from cached state
      return createActor(planningMachine, {
        input,
        snapshot: persistedState,
      });
    }

    // Create new actor with input
    return createActor(planningMachine, { input });
  }, []); // Empty deps: only create once per component lifetime

  // Start actor and manage lifecycle
  useEffect(() => {
    console.log(
      "[PlanningMachineProvider] Starting actor, current status:",
      actor.getSnapshot().status,
    );

    // ============================================================================
    // BUG-012 FIX: Only start if not already started
    // ============================================================================
    // PROBLEM: React StrictMode causes mount → unmount → remount. If we blindly
    // call actor.start() on the remount, XState might have issues.
    //
    // SOLUTION: Try to start the actor. XState v5 actors can be started multiple
    // times safely - the second start() call is a no-op. We just need to ensure
    // we don't stop the actor in development mode (handled in cleanup below).
    try {
      actor.start();
      console.log("[PlanningMachineProvider] Actor started successfully");
    } catch (error) {
      console.warn(
        "[PlanningMachineProvider] Actor start failed (may already be started):",
        error,
      );
    }

    console.log(
      "[PlanningMachineProvider] After start check, status:",
      actor.getSnapshot().status,
    );

    // Sync from database to localStorage cache (background, non-blocking)
    // This ensures cache is up-to-date if state was modified on another device
    const projectId = input.projectId;
    syncFromDatabase(projectId, storageKey).catch((error) => {
      console.error("[PlanningMachineProvider] Database sync failed:", error);
    });

    // Expose actor globally for debugging
    if (typeof window !== "undefined") {
      (window as any).__planningActor = actor;
      console.log(
        "[PlanningMachineProvider] Actor exposed at window.__planningActor",
      );
    }

    // Subscribe for debugging logs
    const debugSubscription = actor.subscribe((snapshot) => {
      console.log("[PlanningMachineProvider] State changed:", snapshot.value);
      console.log(
        "[PlanningMachineProvider] Actor status:",
        actor.getSnapshot().status,
      );
    });

    // Subscribe for localStorage persistence
    const persistSubscription = actor.subscribe((snapshot) => {
      // Only persist stable states, not transient invoke states
      // Transient states like 'submitting', 'generating', etc. should not be persisted
      // as they represent in-progress async operations that can't be resumed
      const stateValue = snapshot.value as any;
      const isTransientState =
        typeof stateValue === "object" &&
        Object.values(stateValue).some(
          (v: any) => v === "submitting" || v === "generatingArtifact",
        );

      if (!isTransientState) {
        saveState(storageKey, snapshot);
      }
    });

    // CRITICAL: XState v5 subscriptions only fire on state changes AFTER subscription.
    // We must explicitly persist the initial state to ensure localStorage is created.
    // This fixes BUG-009: XState machine not initializing - no localStorage created.
    saveState(storageKey, actor.getSnapshot());

    return () => {
      console.log("[PlanningMachineProvider] Cleaning up actor");
      console.log(
        "[PlanningMachineProvider] Actor status before cleanup:",
        actor.getSnapshot().status,
      );
      console.log("[PlanningMachineProvider] Actor ID:", actor.id);
      console.log(
        "[PlanningMachineProvider] Environment:",
        process.env.NODE_ENV,
      );

      // CRITICAL: Unsubscribe BEFORE stopping actor
      // This prevents the stop event from triggering a save with status: 'stopped'
      persistSubscription.unsubscribe();
      debugSubscription.unsubscribe();

      // ============================================================================
      // BUG-012 FIX: Don't stop actor in development/test mode
      // ============================================================================
      // PROBLEM: React StrictMode intentionally unmounts and remounts components
      // to detect side effects. When we stop the actor on the first unmount,
      // components from the first mount (like FormStep) still have references to
      // that stopped actor. When they try to send events, the stopped actor
      // silently ignores them.
      //
      // SOLUTION: In development and test modes (where StrictMode runs), don't
      // stop the actor on unmount. Let it continue running. The actor will be
      // reused by the remounted component. In production (no StrictMode), we
      // DO want to stop the actor on real unmounts to prevent memory leaks.
      //
      // WHY THIS WORKS: StrictMode only runs in development and test, not production.
      // In development, unmounts are often "fake" (StrictMode testing for side effects).
      // In production, unmounts are real (user navigating away), so we should clean up.
      if (process.env.NODE_ENV === "production") {
        console.log(
          "[PlanningMachineProvider] Production mode: stopping actor",
        );
        actor.stop();
      } else {
        console.log(
          "[PlanningMachineProvider] ✅ Development/test mode: skipping actor.stop() for StrictMode compatibility",
        );
        console.log(
          "[PlanningMachineProvider] Actor will continue running:",
          actor.id,
        );
        console.log(
          "[PlanningMachineProvider] This prevents BUG-012 (stale actor references after StrictMode remount)",
        );
      }
    };
  }, [actor, storageKey, input.projectId]);

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

// ─────────────────────────────────────────────────────────────
// PERSISTENCE HELPERS (HYBRID STRATEGY)
// ─────────────────────────────────────────────────────────────
// Strategy: localStorage as sync cache, database as async primary storage
// - Read: Check localStorage first (fast, synchronous)
// - Write: Update both localStorage (sync) and database (async background)
// - Benefits: No loading states, no SSR issues, database durability

/**
 * Save state to both localStorage (sync cache) and database (async primary)
 */
async function saveState(key: string, snapshot: SnapshotType): Promise<void> {
  // Skip during SSR
  if (typeof window === "undefined") return;

  try {
    // BUG-011 FIX: Use snapshot.toJSON() instead of manually picking fields
    // XState v5 requires a complete snapshot with status, children, historyValue, tags, etc.
    // Restoring from a partial snapshot causes the actor to enter an error state,
    // which silently ignores all events (including SUBMIT_FORM).
    const persistedSnapshot = snapshot.toJSON();

    // 1. Save to localStorage (synchronous cache)
    localStorage.setItem(key, JSON.stringify(persistedSnapshot));

    // 2. Save to database (async background sync)
    // Extract projectId from context for database storage
    const projectId = snapshot.context.projectId as string;

    // Fire-and-forget database sync (don't await to avoid blocking)
    $savePlanningState({
      data: { projectId, snapshot: persistedSnapshot },
    }).catch((error) => {
      console.error(
        "[PlanningMachineContext] Background database sync failed:",
        error,
      );
      // localStorage save succeeded, so UX is not impacted
    });
  } catch (error) {
    console.error("[PlanningMachineContext] Failed to save state:", error);
  }
}

/**
 * Load state synchronously from localStorage cache
 * Database serves as backup/sync layer, loaded on page load
 */
function loadStateSync(key: string): SnapshotType | null {
  // Skip during SSR
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // BUG-011 FIX: Validate that we have a complete XState v5 snapshot
    // A complete snapshot must include: status, value, context, children, historyValue, tags
    // Partial snapshots (e.g., only {value, context}) will cause restoration to fail
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

    // BUG-011 FIX: Defensive reset of status to 'active'
    // This handles any existing corrupted snapshots in localStorage that have status: 'stopped'.
    // Should not happen with proper cleanup ordering, but provides defense-in-depth.
    // XState v5 respects the snapshot's status field, so we must ensure it's 'active' for restoration.
    if (parsed.status !== "active") {
      console.warn(
        "[PlanningMachineContext] Restoring snapshot with non-active status:",
        parsed.status,
        "- forcing to active",
      );
      parsed.status = "active";
    }

    // Cast to SnapshotType - safe because we validated the structure above
    // and XState will properly reconstruct the snapshot during createActor
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

/**
 * Load state from database (used for initial page load to sync cache)
 * This runs in background on mount to ensure localStorage cache is current
 */
async function syncFromDatabase(projectId: string, key: string): Promise<void> {
  try {
    const dbSnapshot = await $loadPlanningState({ data: { projectId } });
    if (!dbSnapshot) return;

    // Update localStorage cache with database state
    localStorage.setItem(key, JSON.stringify(dbSnapshot));
    console.log(
      "[PlanningMachineContext] Synced state from database to localStorage cache",
    );
  } catch (error) {
    console.error(
      "[PlanningMachineContext] Failed to sync from database:",
      error,
    );
  }
}
