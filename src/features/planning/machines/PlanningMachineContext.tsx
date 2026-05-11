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
    actor.start();
    return () => {
      actor.stop();
    };
  }, [actor]);

  // Persist to localStorage on context changes
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      saveState(storageKey, snapshot);
    });
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

type PersistedSnapshot = {
  value: string | Record<string, any>;
  context: PlanningContext;
};

function saveState(key: string, snapshot: SnapshotType): void {
  try {
    const persistedSnapshot: PersistedSnapshot = {
      value: snapshot.value,
      context: snapshot.context,
    };
    localStorage.setItem(key, JSON.stringify(persistedSnapshot));
  } catch (error) {
    console.error('[PlanningMachineContext] Failed to save state:', error);
  }
}

function loadState(key: string): SnapshotType | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedSnapshot;

    // Cast to unknown first, then to SnapshotType
    // This is safe because XState will reconstruct the full snapshot internally
    return parsed as unknown as SnapshotType;
  } catch (error) {
    console.error('[PlanningMachineContext] Failed to load state:', error);
    return null;
  }
}
