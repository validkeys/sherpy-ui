/**
 * React Context Provider for Planning Machine
 * XState v5 pattern with localStorage persistence
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { createActor, SnapshotFrom } from 'xstate';
import { useSelector as useXStateSelector } from '@xstate/react';
import { planningMachine } from './planningMachine';
import type { PlanningContext, PlanningEvent, PlanningInput } from './types';

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

const PlanningMachineContext = createContext<PlanningMachineContextValue | null>(null);

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
  storageKey = 'planning-machine-state',
}: PlanningMachineProviderProps) {
  // Initialize actor (memoized per projectId)
  const [actor] = React.useState(() => {
    // Try to restore from localStorage
    const persistedState = loadState(storageKey);

    if (persistedState && persistedState.context.projectId === input.projectId) {
      // Restore from persisted state
      return createActor(planningMachine, {
        input,
        snapshot: persistedState,
      });
    }

    // Create new actor with input
    return createActor(planningMachine, { input });
  });

  // Start actor on mount
  useEffect(() => {
    console.log('[PlanningMachineProvider] Starting actor, current status:', actor.getSnapshot().status);
    actor.start();
    console.log('[PlanningMachineProvider] After start, status:', actor.getSnapshot().status);

    // Expose actor globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).__planningActor = actor;
      console.log('[PlanningMachineProvider] Actor exposed at window.__planningActor');
    }

    // Subscribe to all state changes for debugging
    const subscription = actor.subscribe((snapshot) => {
      console.log('[PlanningMachineProvider] State changed:', snapshot.value);
      console.log('[PlanningMachineProvider] Actor status:', actor.getSnapshot().status);
    });

    return () => {
      console.log('[PlanningMachineProvider] Stopping actor');
      subscription.unsubscribe();
      actor.stop();
    };
  }, []); // Empty deps: actor is stable, only mount/unmount once per instance

  // Persist to localStorage on context changes
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      // BUG-011 FIX PART 2: Don't save when actor is stopping
      // When component unmounts, actor.stop() triggers a final snapshot with status: 'stopped'
      // Saving this would cause the next load to restore a stopped actor that can't process events
      if (snapshot.status !== 'stopped') {
        saveState(storageKey, snapshot);
      }
    });

    // CRITICAL: XState v5 subscriptions only fire on state changes AFTER subscription.
    // We must explicitly persist the initial state to ensure localStorage is created.
    // This fixes BUG-009: XState machine not initializing - no localStorage created.
    // BUG-011 FIX: Only save if status is active
    const initialSnapshot = actor.getSnapshot();
    if (initialSnapshot.status !== 'stopped') {
      saveState(storageKey, initialSnapshot);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [actor, storageKey]);

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
    throw new Error('usePlanningMachine must be used within PlanningMachineProvider');
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
// PERSISTENCE HELPERS
// ─────────────────────────────────────────────────────────────

function saveState(key: string, snapshot: SnapshotType): void {
  // Skip during SSR
  if (typeof window === 'undefined') return;

  try {
    // BUG-011 FIX: Use snapshot.toJSON() instead of manually picking fields
    // XState v5 requires a complete snapshot with status, children, historyValue, tags, etc.
    // Restoring from a partial snapshot causes the actor to enter an error state,
    // which silently ignores all events (including SUBMIT_FORM).
    const persistedSnapshot = snapshot.toJSON();
    localStorage.setItem(key, JSON.stringify(persistedSnapshot));
  } catch (error) {
    console.error('[PlanningMachineContext] Failed to save state:', error);
  }
}

function loadState(key: string): SnapshotType | null {
  // Skip during SSR
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // BUG-011 FIX: Validate that we have a complete XState v5 snapshot
    // A complete snapshot must include: status, value, context, children, historyValue, tags
    // Partial snapshots (e.g., only {value, context}) will cause restoration to fail
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.status ||
      !parsed.value ||
      !parsed.context ||
      typeof parsed.context !== 'object'
    ) {
      throw new Error(
        'Invalid snapshot structure: missing required fields (status, value, context). ' +
        'This may be from an old version. Clearing and starting fresh.'
      );
    }

    // Validate critical context fields
    if (!parsed.context.projectId || typeof parsed.context.currentStepNumber !== 'number') {
      throw new Error('Invalid context: missing projectId or currentStepNumber');
    }

    // BUG-011 FIX PART 2: Force status to 'active' when restoring
    // When the component unmounts, actor.stop() is called, which triggers a save with status: 'stopped'.
    // If we restore with status: 'stopped', the actor cannot process events even after actor.start().
    // XState v5 respects the snapshot's status field, so we must reset it to 'active' for restoration.
    parsed.status = 'active';

    // Cast to SnapshotType - safe because we validated the structure above
    // and XState will properly reconstruct the snapshot during createActor
    return parsed as unknown as SnapshotType;
  } catch (error) {
    // Auto-recover by clearing corrupted/outdated state
    console.error('[PlanningMachineContext] ⚠️  Invalid state detected, clearing and starting fresh:', error);
    try {
      localStorage.removeItem(key);
    } catch (clearError) {
      console.error('[PlanningMachineContext] Failed to clear invalid state:', clearError);
    }
    return null; // Start with fresh state
  }
}
