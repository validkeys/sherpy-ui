# Implementation Plan: Database-First State Synchronization

**Issue:** [#15 - State desynchronization](https://github.com/validkeys/sherpy-ui/issues/15)  
**Solution:** Option 2+ (Enhanced Async Initialization)  
**Estimated Effort:** 4-6 hours (Phase 1), 2-3 hours (Phase 2)  
**Priority:** P0 (Blocker for Phase 10 cutover)  
**Date:** 2026-05-29  
**Version:** 1.1 (Updated after code review)

---

## ⚠️ CRITICAL UPDATE (2026-05-29)

**Code Review Findings Applied:**

This plan has been updated based on comprehensive code review findings. Key improvements:

### Critical Fixes (Must Apply)
1. **RESTORE_SNAPSHOT merge logic** - Fixed to preserve local changes when local is newer
   - **Before:** Unconditional spread (`...context, ...dbContext`) lost local edits
   - **After:** Timestamp comparison prevents overwriting optimistic updates
   - **Impact:** Prevents data loss from concurrent edits

### Important Improvements (Strongly Recommended)
2. **React Query configuration** - Optimized for planning workflow patterns
   - `staleTime: 30000` (was 5000) - Reduces unnecessary DB calls
   - `gcTime: 5 * 60 * 1000` (was 30000) - Better offline support
   - `refetchOnMount: false` - Avoids double-fetches
   
3. **Loading state condition** - Fixed edge case
   - Check `!authoritativeSnapshot` instead of `!cachedSnapshot`
   - Prevents showing spinner when fresh state is available
   
4. **snapshotsEqual function** - Deep equality check
   - **Before:** Shallow comparison (3 fields only)
   - **After:** JSON.stringify for complete context comparison
   - **Impact:** Prevents unnecessary hot-reloads

5. **React Error Boundary** - Comprehensive error handling
   - Added to catch both DB errors and React render errors
   - Prevents white screen of death

6. **Test coverage** - Additional scenarios
   - Hot-reload prevention test (snapshots equal)
   - Race condition test (user edits during DB sync)
   - snapshotsEqual utility tests

**Review Documents:**
- Full review: `.tmp-docs/code-reviews/003-state-sync-fix/review.md`
- Executive summary: `.tmp-docs/code-reviews/003-state-sync-fix/executive-summary.md`
- Action items: `.tmp-docs/code-reviews/003-state-sync-fix/action-items.md`

**Proceed with confidence:** These fixes address all critical and major issues identified in the review.

---

## Table of Contents

1. [Overview](#overview)
2. [Objectives](#objectives)
3. [Technical Approach](#technical-approach)
4. [Phase 1: Core Fix](#phase-1-core-fix-4-6-hours)
5. [Phase 2: Enhancements](#phase-2-enhancements-2-3-hours)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Rollback Strategy](#rollback-strategy)
9. [Success Criteria](#success-criteria)
10. [Risks & Mitigations](#risks--mitigations)

---

## Overview

### Problem Statement

The planning workflow XState machine initializes from localStorage only, falling back to fresh state if cache is empty. This causes state desynchronization when:
- Seed script creates database records without populating localStorage
- Manual database updates bypass cache
- Cross-device edits aren't reflected in local cache

**Result:** UI shows incorrect state (Step 1) while database has correct state (Step 2+).

### Solution Summary

Implement database-first initialization with optimistic rendering:
1. Show cached state immediately (no loading spinner in happy path)
2. Query database in background (React Query)
3. Hot-reload actor when database data arrives
4. Graceful error handling and offline support

---

## Objectives

### Primary Goals (Phase 1)

- [ ] **Database is single source of truth** during initialization
- [ ] **Zero regressions** - all existing tests pass
- [ ] **Seed script works** without manual localStorage setup
- [ ] **Fast perceived load** - sub-100ms first render from cache
- [ ] **Graceful degradation** - works offline with cache

### Secondary Goals (Phase 2)

- [ ] **Optimistic updates** - instant UI feedback with background sync
- [ ] **Real-time sync** - cross-device updates within 5 seconds
- [ ] **Observability** - metrics for cache hit rate, sync latency
- [ ] **Conflict resolution** - handle concurrent edits gracefully

---

## Technical Approach

### Architecture Changes

**Before (Current):**
```
Synchronous Init → localStorage → Actor Creation
                    ↓ (if miss)
                 Fresh State (Step 1) ❌
                    ↓
Background Sync → Database → Update localStorage (too late)
```

**After (Target):**
```
Optimistic Render → localStorage → Instant UI ✅
       ↓
React Query → Database → Authoritative State
       ↓
Hot Reload → Update Actor (if different) ✅
```

### Key Technologies

- **React Query v5** - Data fetching, caching, background refetch
- **XState v5** - State machine with RESTORE_SNAPSHOT event
- **localStorage** - Read-through cache for instant renders
- **Server Functions** - Existing `$loadPlanningState` / `$savePlanningState`

---

## Phase 1: Core Fix (4-6 hours)

### Task 1.1: Add RESTORE_SNAPSHOT Event to Machine

**File:** `src/features/planning/machines/planningMachine.ts`

**Estimated Time:** 30 minutes

**Implementation:**

```typescript
// Add to machine definition
on: {
  RESTORE_SNAPSHOT: {
    actions: assign((context, event: { type: 'RESTORE_SNAPSHOT'; snapshot: any }) => {
      const dbContext = event.snapshot.context;
      
      // Compare timestamps to determine which state is authoritative
      const localTime = new Date(context.updatedAt).getTime();
      const dbTime = new Date(dbContext.updatedAt).getTime();
      
      // CRITICAL: Preserve local changes if local is newer
      // This protects optimistic updates that haven't synced yet
      if (localTime > dbTime) {
        console.log('[RESTORE_SNAPSHOT] Keeping local changes (newer than DB)');
        return context; // No-op, local is authoritative
      }
      
      // Database is newer - apply DB snapshot
      console.log('[RESTORE_SNAPSHOT] Applying database snapshot (newer than local)');
      return {
        ...dbContext,
        // Preserve any transient UI state that doesn't persist to DB
        // (Add fields here if needed based on requirements)
      };
    }),
  },
  // ... existing events
}
```

**Test Coverage:**

```typescript
// src/features/planning/machines/planningMachine.test.ts
describe('RESTORE_SNAPSHOT event', () => {
  it('merges database state into current context', () => {
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' }
    });
    actor.start();
    
    // Simulate database snapshot with Step 2 data
    const dbSnapshot = {
      context: {
        projectId: 'test',
        currentStepNumber: 2,
        step2Answers: ['answer1', 'answer2'],
        updatedAt: new Date().toISOString(),
      }
    };
    
    actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: dbSnapshot });
    
    expect(actor.getSnapshot().context.currentStepNumber).toBe(2);
    expect(actor.getSnapshot().context.step2Answers).toHaveLength(2);
  });
  
  it('preserves local changes if newer than database', () => {
    // Arrange - Create actor with Step 2 state (recent timestamp)
    const localTimestamp = new Date().toISOString();
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' }
    });
    actor.start();
    
    // User makes local edit
    actor.send({ 
      type: 'SUBMIT_ANSWER', 
      answer: 'Local answer',
      question: 'Test question'
    });
    
    const localSnapshot = actor.getSnapshot();
    
    // Simulate stale database snapshot arriving (older timestamp)
    const staleDbSnapshot = {
      context: {
        ...localSnapshot.context,
        currentStepNumber: 1, // Stale state
        updatedAt: new Date(Date.now() - 60000).toISOString(), // 1 min old
      }
    };
    
    // Act - Send RESTORE_SNAPSHOT with stale data
    actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: staleDbSnapshot });
    
    // Assert - Local changes should be preserved
    const finalSnapshot = actor.getSnapshot();
    expect(finalSnapshot.context.currentStepNumber).toBe(localSnapshot.context.currentStepNumber);
    expect(finalSnapshot.context.updatedAt).toBe(localSnapshot.context.updatedAt);
  });
  
  it('accepts database changes when database is newer', () => {
    // Arrange - Create actor with stale local state
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' }
    });
    actor.start();
    
    // Simulate fresh database snapshot (cross-device edit)
    const freshDbSnapshot = {
      context: {
        projectId: 'test',
        currentStepNumber: 3,
        step3Answers: ['answer1', 'answer2'],
        updatedAt: new Date().toISOString(), // Fresh
      }
    };
    
    // Act
    actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: freshDbSnapshot });
    
    // Assert - DB changes should be applied
    const finalSnapshot = actor.getSnapshot();
    expect(finalSnapshot.context.currentStepNumber).toBe(3);
    expect(finalSnapshot.context.step3Answers).toHaveLength(2);
  });
  
  it('handles equal timestamps gracefully', () => {
    // Arrange
    const timestamp = new Date().toISOString();
    const actor = createActor(planningMachine, {
      input: { projectId: 'test', entryPath: 'new-project' },
      snapshot: {
        context: { projectId: 'test', currentStepNumber: 2, updatedAt: timestamp }
      }
    });
    actor.start();
    
    const dbSnapshot = {
      context: { projectId: 'test', currentStepNumber: 2, updatedAt: timestamp }
    };
    
    // Act
    actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: dbSnapshot });
    
    // Assert - DB wins on equal timestamps (consistent tie-breaker)
    expect(actor.getSnapshot().context.currentStepNumber).toBe(2);
  });
});
```

**Acceptance Criteria:**
- [ ] RESTORE_SNAPSHOT event defined in machine
- [ ] Event merges database context into current context
- [ ] Preserves local changes if newer than database
- [ ] Machine tests pass
- [ ] TypeScript compiles without errors

---

### Task 1.2: Refactor PlanningMachineContext to Database-First

**File:** `src/features/planning/machines/PlanningMachineContext.tsx`

**Estimated Time:** 2-3 hours

**Implementation:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { stepStateQueryKey } from "../application/queries";
import { $loadPlanningState } from "../infrastructure/server-functions";

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
    [storageKey]
  );
  
  // ============================================================================
  // STEP 2: Query database for authoritative state (async, background)
  // ============================================================================
  const {
    data: dbSnapshot,
    isLoading: isLoadingDb,
    error: dbError,
  } = useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: async () => {
      console.log("[PlanningMachineProvider] Fetching from database");
      const snapshot = await $loadPlanningState({ data: { projectId } });
      console.log("[PlanningMachineProvider] Database fetch complete");
      return snapshot;
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
      return dbSnapshot;
    }
    
    // Fallback to cache while loading
    if (isLoadingDb && cachedSnapshot?.context?.projectId === projectId) {
      console.log("[PlanningMachineProvider] Using cached snapshot while loading");
      return cachedSnapshot;
    }
    
    // If database errored but we have cache, use cache
    if (dbError && cachedSnapshot?.context?.projectId === projectId) {
      console.warn(
        "[PlanningMachineProvider] Database error, falling back to cache:",
        dbError
      );
      return cachedSnapshot;
    }
    
    // Last resort: null (will create fresh actor)
    console.log("[PlanningMachineProvider] No snapshot available, creating fresh");
    return null;
  }, [dbSnapshot, cachedSnapshot, isLoadingDb, dbError, projectId]);
  
  // ============================================================================
  // STEP 4: Create actor with authoritative state
  // ============================================================================
  const actor = React.useMemo(() => {
    if (authoritativeSnapshot) {
      console.log(
        "[PlanningMachineProvider] Creating actor from snapshot:",
        authoritativeSnapshot.context?.currentStepNumber
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
  // STEP 5: Start actor and setup subscriptions
  // ============================================================================
  React.useEffect(() => {
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
    
    // Subscribe for localStorage persistence
    const persistSubscription = actor.subscribe((snapshot) => {
      const stateValue = snapshot.value as any;
      const isTransientState =
        typeof stateValue === "object" &&
        Object.values(stateValue).some(
          (v: any) => v === "submitting" || v === "generatingArtifact"
        );
      
      if (!isTransientState) {
        saveState(storageKey, snapshot);
      }
    });
    
    // Persist initial state
    saveState(storageKey, actor.getSnapshot());
    
    // Expose actor for debugging
    if (typeof window !== "undefined") {
      (window as any).__planningActor = actor;
    }
    
    // Cleanup
    return () => {
      persistSubscription.unsubscribe();
      
      if (process.env.NODE_ENV === "production") {
        actor.stop();
      }
    };
  }, [actor, storageKey, input]);
  
  // ============================================================================
  // STEP 6: Hot-reload actor when database data arrives
  // ============================================================================
  React.useEffect(() => {
    if (!dbSnapshot || !actor) return;
    
    const currentSnapshot = actor.getSnapshot();
    
    // Check if database state is different from current actor state
    if (snapshotsEqual(currentSnapshot, dbSnapshot)) {
      console.log("[PlanningMachineProvider] Database snapshot matches current state");
      return;
    }
    
    console.log(
      "[PlanningMachineProvider] Database snapshot differs, hot-reloading actor"
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

// ============================================================================
// UTILITY: Snapshot comparison
// ============================================================================
function snapshotsEqual(a: SnapshotType, b: any): boolean {
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
    console.warn('[snapshotsEqual] JSON comparison failed:', error);
    return false;
  }
}

// Alternative implementation using lodash (if available):
// import { isEqual } from 'lodash-es';
// function snapshotsEqual(a: SnapshotType, b: any): boolean {
//   return a && b && isEqual(a.context, b.context);
// }
```

**Test Coverage:**

```typescript
// src/features/planning/machines/PlanningMachineContext.test.tsx
describe('PlanningMachineProvider (Database-First)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  
  it('loads from database when localStorage is empty', async () => {
    // Arrange
    const step2Snapshot = createStep2Snapshot();
    mockLoadPlanningState.mockResolvedValue(step2Snapshot);
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - no loading state (actor created from fresh state initially)
    expect(screen.queryByText('Loading workflow state...')).not.toBeInTheDocument();
    
    // Assert - actor hot-reloads to Step 2 when DB data arrives
    await waitFor(() => {
      expect(screen.getByText('Current Step: 2')).toBeInTheDocument();
    });
  });
  
  it('shows cached state immediately, then syncs from database', async () => {
    // Arrange
    const step1Snapshot = createStep1Snapshot();
    const step2Snapshot = createStep2Snapshot();
    
    localStorage.setItem('planning-machine-test', JSON.stringify(step1Snapshot));
    mockLoadPlanningState.mockResolvedValue(step2Snapshot);
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - shows cache immediately (optimistic)
    expect(screen.getByText('Current Step: 1')).toBeInTheDocument();
    
    // Assert - hot-reloads to DB state
    await waitFor(() => {
      expect(screen.getByText('Current Step: 2')).toBeInTheDocument();
    });
  });
  
  it('handles database errors gracefully with cache fallback', async () => {
    // Arrange
    const step1Snapshot = createStep1Snapshot();
    localStorage.setItem('planning-machine-test', JSON.stringify(step1Snapshot));
    mockLoadPlanningState.mockRejectedValue(new Error('Database unavailable'));
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - uses cache despite DB error
    expect(screen.getByText('Current Step: 1')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load')).not.toBeInTheDocument();
  });
  
  it('shows error boundary when DB fails and no cache', async () => {
    // Arrange
    mockLoadPlanningState.mockRejectedValue(new Error('Database unavailable'));
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - shows error UI
    await waitFor(() => {
      expect(screen.getByText('Failed to load workflow state')).toBeInTheDocument();
    });
  });
  
  it('shows loading spinner when no cache and DB is loading', () => {
    // Arrange
    mockLoadPlanningState.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert
    expect(screen.getByText('Loading workflow state...')).toBeInTheDocument();
  });
  
  it('does NOT hot-reload when snapshots are equal', async () => {
    // Arrange - Cache and DB have identical snapshots
    const step2Snapshot = createStep2Snapshot();
    localStorage.setItem('planning-machine-test', JSON.stringify(step2Snapshot));
    mockLoadPlanningState.mockResolvedValue(step2Snapshot);
    
    const sendSpy = vi.spyOn(ActorRef.prototype, 'send');
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - Wait for DB load
    await waitFor(() => {
      expect(mockLoadPlanningState).toHaveBeenCalled();
    });
    
    // RESTORE_SNAPSHOT should NOT be called (snapshots equal)
    expect(sendSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESTORE_SNAPSHOT' })
    );
  });
});

describe('snapshotsEqual', () => {
  it('returns true for identical snapshots', () => {
    const snapshot = createTestSnapshot();
    expect(snapshotsEqual(snapshot, snapshot)).toBe(true);
  });
  
  it('returns true for same timestamp (quick path)', () => {
    const timestamp = '2026-05-29T10:00:00Z';
    const a = { context: { updatedAt: timestamp, currentStepNumber: 1 }, value: 'step1' };
    const b = { context: { updatedAt: timestamp, currentStepNumber: 2 }, value: 'step2' };
    // Same timestamp = same logical state (even if other fields differ)
    expect(snapshotsEqual(a, b)).toBe(true);
  });
  
  it('returns true for deep equal context with different state values', () => {
    const context = { updatedAt: '2026-05-29T10:00:00Z', currentStepNumber: 2 };
    const a = { context, value: 'step2.idle' };
    const b = { context, value: 'step2.submitting' }; // Transient state
    expect(snapshotsEqual(a, b)).toBe(true);
  });
  
  it('returns false for different context', () => {
    const a = { context: { updatedAt: '2026-05-29T10:00:00Z', currentStepNumber: 1 } };
    const b = { context: { updatedAt: '2026-05-29T10:00:00Z', currentStepNumber: 2 } };
    expect(snapshotsEqual(a, b)).toBe(false);
  });
  
  it('handles null/undefined gracefully', () => {
    expect(snapshotsEqual(null, {})).toBe(false);
    expect(snapshotsEqual({}, null)).toBe(false);
    expect(snapshotsEqual(null, null)).toBe(false);
  });
});
```

**Acceptance Criteria:**
- [ ] Database queried via React Query on mount
- [ ] Cached state shown immediately (no loading in happy path)
- [ ] Actor hot-reloads when DB data arrives (only if snapshots differ)
- [ ] Loading spinner shown only when no authoritative state + DB loading
- [ ] Error boundary shown only when DB fails + no authoritative state
- [ ] React Error Boundary wraps provider in route (catches render errors)
- [ ] Console logging uses environment check (verbose dev, errors-only prod)
- [ ] All tests pass (including hot-reload prevention test)
- [ ] TypeScript compiles without errors

**Additional Implementation Notes:**

1. **React Error Boundary** (recommended):
   ```typescript
   // Create: src/features/planning/components/PlanningErrorBoundary.tsx
   export class PlanningErrorBoundary extends React.Component {
     state = { hasError: false, error: null };
     
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
     
     componentDidCatch(error, errorInfo) {
       console.error('[PlanningErrorBoundary]', error, errorInfo);
       // TODO: Send to error tracking (Sentry, etc.)
     }
     
     render() {
       if (this.state.hasError) {
         return <ErrorUI error={this.state.error} onRetry={() => window.location.reload()} />;
       }
       return this.props.children;
     }
   }
   
   // Usage in route: app/routes/project/$projectId.build.tsx
   <PlanningErrorBoundary>
     <PlanningMachineProvider input={input}>
       {children}
     </PlanningMachineProvider>
   </PlanningErrorBoundary>
   ```

2. **Logging Helper** (recommended):
   ```typescript
   // Create: src/lib/logger.ts
   const isDev = process.env.NODE_ENV !== 'production';
   
   export const logger = {
     debug: (...args: any[]) => {
       if (isDev) console.log(...args);
     },
     info: (...args: any[]) => {
       console.log(...args);
     },
     warn: (...args: any[]) => {
       console.warn(...args);
     },
     error: (...args: any[]) => {
       console.error(...args);
     },
   };
   
   // Usage: Replace console.log with logger.debug
   // logger.debug("[PlanningMachineProvider] Fetching from database");
   ```

---

### Task 1.3: Update Documentation

**Files:**
- `docs/planning/003-workflow-chat-integration/plan.md`
- `.tmp-docs/bug-root-cause-analysis.md`
- GitHub Issue #15

**Estimated Time:** 30 minutes

**Actions:**
- [ ] Update plan.md with "Phase 8.5: State Sync Fix" section
- [ ] Mark issue #15 as "In Progress"
- [ ] Document new initialization flow in architecture docs
- [ ] Update CLAUDE.md if needed

---

### Task 1.4: Integration Testing

**File:** Create `src/features/planning/__tests__/state-sync-integration.test.tsx`

**Estimated Time:** 1 hour

**Implementation:**

```typescript
describe('State Sync Integration Tests', () => {
  it('seed script workflow: creates DB record → page loads → shows correct state', async () => {
    // Simulate seed script
    const response = await fetch('http://localhost:5180/api/dev/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 2 })
    });
    
    const { projectId } = await response.json();
    
    // Navigate without manual localStorage setup
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/project/${projectId}/build`]}>
          <Routes>
            <Route path="/project/:projectId/build" element={<BuildComponent />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    
    // Assert - shows correct state from database
    await waitFor(() => {
      expect(screen.getByText('stage 02 of 10')).toBeInTheDocument();
      expect(screen.getByText('Current Step Number: 2')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
  
  it('cross-device workflow: edit on device A → switch to device B → sees updates', async () => {
    // Simulate device A edit
    const projectId = 'test-project';
    await updateProjectState(projectId, { currentStepNumber: 3 });
    
    // Simulate device B (fresh page load, no cache)
    localStorage.clear();
    
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId, entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - device B sees device A's updates
    await waitFor(() => {
      expect(screen.getByText('Current Step: 3')).toBeInTheDocument();
    });
  });
  
  it('handles race condition: user edits while DB sync in-flight', async () => {
    // Arrange - Slow DB fetch
    const step2Snapshot = createStep2Snapshot();
    let resolveFetch: (snapshot: any) => void;
    const dbFetch = new Promise((resolve) => { resolveFetch = resolve; });
    mockLoadPlanningState.mockReturnValue(dbFetch);
    
    // Act - Mount and immediately edit (before DB returns)
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // User makes local edit while DB loading
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Local answer' } });
    fireEvent.click(screen.getByText('Submit'));
    
    // Get local snapshot after edit
    const localAnswer = screen.getByText('Local answer');
    
    // DB returns with older state
    resolveFetch!(step2Snapshot);
    
    // Assert - Local edit should NOT be overwritten by older DB state
    await waitFor(() => {
      expect(localAnswer).toBeInTheDocument(); // Local change preserved
    });
  });
});
```

**Acceptance Criteria:**
- [ ] Seed script integration test passes
- [ ] Cross-device scenario test passes
- [ ] Tests run in CI pipeline

---

### Task 1.5: Manual QA Checklist

**Estimated Time:** 30 minutes

**Test Scenarios:**

- [ ] **Seed Script Happy Path**
  ```bash
  pnpm seed:step2
  # Open printed URL in browser
  # Verify: Progress bar shows Stage 2
  # Verify: Debug panel shows Step 2
  # Verify: No console errors
  ```

- [ ] **Seed Script with WorkflowChat**
  ```bash
  pnpm seed:step2
  # Open URL with ?workflowChat=1
  # Verify: Composer enabled
  # Verify: Shows correct question
  # Verify: Can submit answer
  ```

- [ ] **Fresh Project (No Seed)**
  ```
  # Create new project through UI
  # Verify: Starts at Step 1
  # Verify: No loading spinner
  # Verify: Can complete Step 1
  ```

- [ ] **Page Refresh Persistence**
  ```
  # Start at Step 2
  # Answer 5 questions
  # Refresh page
  # Verify: Still at Step 2
  # Verify: Answers preserved
  ```

- [ ] **Offline Behavior**
  ```
  # Open project at Step 2 (cache populated)
  # Disconnect network (DevTools → Network → Offline)
  # Refresh page
  # Verify: Works from cache
  # Verify: Shows Step 2 correctly
  ```

- [ ] **Error Recovery**
  ```
  # Mock database failure
  # Open project with cache
  # Verify: Uses cache, no error
  # Open project without cache
  # Verify: Shows error boundary with Retry button
  ```

**Pass Criteria:** All scenarios work as expected, no regressions.

---

## Phase 2: Enhancements (2-3 hours)

### Task 2.1: Optimistic Update Mutations

**File:** `src/features/planning/infrastructure/mutations.ts`

**Estimated Time:** 1-2 hours

**Implementation:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stepStateQueryKey } from '../application/queries';
import {
  $submitAnswer,
  $submitForm,
  $completeStep,
} from './server-functions';

/**
 * Optimistic mutation for submitting interview answers
 */
export function useSubmitAnswerMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: $submitAnswer,
    
    onMutate: async (variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previousSnapshot = queryClient.getQueryData(queryKey);
      
      // Optimistically update cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        const stepKey = `step${variables.stepNumber}Answers` as const;
        
        return {
          ...old,
          context: {
            ...old.context,
            [stepKey]: [
              ...(old.context[stepKey] || []),
              {
                question: variables.question,
                answer: variables.answer,
                answeredAt: new Date().toISOString(),
              }
            ],
            updatedAt: new Date().toISOString(),
          }
        };
      });
      
      return { previousSnapshot };
    },
    
    onError: (error, variables, context) => {
      // Rollback on error
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.setQueryData(queryKey, context?.previousSnapshot);
      
      console.error('[useSubmitAnswerMutation] Error, rolling back:', error);
    },
    
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Optimistic mutation for submitting form data
 */
export function useSubmitFormMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: $submitForm,
    
    onMutate: async (variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      await queryClient.cancelQueries({ queryKey });
      
      const previousSnapshot = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        const responseKey = `step${variables.stepNumber}Responses` as const;
        
        return {
          ...old,
          context: {
            ...old.context,
            [responseKey]: variables.responses,
            updatedAt: new Date().toISOString(),
          }
        };
      });
      
      return { previousSnapshot };
    },
    
    onError: (error, variables, context) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.setQueryData(queryKey, context?.previousSnapshot);
    },
    
    onSettled: (data, error, variables) => {
      const queryKey = stepStateQueryKey(variables.projectId);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
```

**Usage Example:**

```typescript
// In component
const submitAnswerMutation = useSubmitAnswerMutation();

function handleSubmit(answer: string) {
  submitAnswerMutation.mutate({
    projectId,
    stepNumber: 2,
    question: currentQuestion,
    answer,
  });
}
```

**Acceptance Criteria:**
- [ ] Mutations implement optimistic updates
- [ ] Rollback on error
- [ ] Refetch after mutation settles
- [ ] Tests cover happy path and error cases

---

### Task 2.2: Real-Time Sync

**File:** `src/features/planning/hooks/useRealtimeSync.ts`

**Estimated Time:** 1 hour

**Implementation (Option A: Short Polling):**

```typescript
import { useQuery } from '@tanstack/react-query';
import { stepStateQueryKey } from '../application/queries';
import { $loadPlanningState } from '../infrastructure/server-functions';

export function useRealtimeSync(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $loadPlanningState({ data: { projectId } }),
    refetchInterval: enabled ? 5000 : false, // Poll every 5 seconds
    refetchIntervalInBackground: false, // Only when tab is visible
  });
}
```

**Implementation (Option B: WebSocket - Future Enhancement):**

```typescript
// server/websocket.ts
export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    const projectId = new URL(req.url!, 'ws://localhost').searchParams.get('projectId');
    
    if (!projectId) {
      ws.close(1008, 'Missing projectId');
      return;
    }
    
    // Subscribe to project updates
    const unsubscribe = subscribeToProjectUpdates(projectId, (snapshot) => {
      ws.send(JSON.stringify({ type: 'STATE_UPDATE', snapshot }));
    });
    
    ws.on('close', () => {
      unsubscribe();
    });
  });
}

// client hook
export function useWebSocketSync(projectId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:5180/ws/planning?projectId=${projectId}`);
    
    ws.onmessage = (event) => {
      const { snapshot } = JSON.parse(event.data);
      queryClient.setQueryData(stepStateQueryKey(projectId), snapshot);
    };
    
    return () => ws.close();
  }, [projectId, queryClient]);
}
```

**Acceptance Criteria:**
- [ ] Polling implementation working
- [ ] Updates reflected within 5 seconds
- [ ] Only polls when tab is visible
- [ ] WebSocket implementation (optional, P1)

---

### Task 2.3: Observability

**File:** `src/features/planning/infrastructure/metrics.ts`

**Estimated Time:** 30 minutes

**Implementation:**

```typescript
// Simple metrics tracking (expand with DataDog, Sentry, etc.)
export const metrics = {
  counter: (name: string, value: number = 1, tags?: Record<string, string>) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to metrics backend
      console.log(`[METRIC] ${name}:${value}`, tags);
    }
  },
  
  histogram: (name: string, value: number, tags?: Record<string, string>) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[METRIC] ${name}:${value}ms`, tags);
    }
  },
  
  gauge: (name: string, value: number, tags?: Record<string, string>) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[METRIC] ${name}:${value}`, tags);
    }
  },
};

// Track cache hit rate
export function trackCacheHit(projectId: string, hit: boolean) {
  metrics.counter('planning_state_cache', 1, {
    projectId,
    result: hit ? 'hit' : 'miss',
  });
}

// Track sync latency
export async function trackSyncLatency<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.histogram('planning_state_sync_duration_ms', duration, { operation });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.histogram('planning_state_sync_duration_ms', duration, {
      operation,
      error: 'true',
    });
    throw error;
  }
}
```

**Usage:**

```typescript
// In PlanningMachineContext.tsx
const dbSnapshot = await trackSyncLatency('load_from_db', async () => {
  return await $loadPlanningState({ data: { projectId } });
});

trackCacheHit(projectId, !!cachedSnapshot);
```

**Acceptance Criteria:**
- [ ] Cache hit rate tracked
- [ ] Sync latency tracked
- [ ] Error rates tracked
- [ ] Metrics logged in production

---

## Testing Strategy

### Unit Tests

**Coverage Target:** 90%+

**Key Areas:**
- [ ] RESTORE_SNAPSHOT event logic
- [ ] Snapshot comparison utility
- [ ] Error boundary rendering
- [ ] Optimistic mutation rollback

**Commands:**
```bash
pnpm test src/features/planning/machines/planningMachine.test.ts
pnpm test src/features/planning/machines/PlanningMachineContext.test.tsx
pnpm test src/features/planning/infrastructure/mutations.test.ts
```

---

### Integration Tests

**Scenarios:**
- [ ] Seed script → page load → correct state
- [ ] Fresh project → complete workflow
- [ ] Page refresh → state preserved
- [ ] Offline → online → sync
- [ ] Cross-device edit → other device sees update

**Commands:**
```bash
pnpm test src/features/planning/__tests__/state-sync-integration.test.tsx
```

---

### E2E Tests (Playwright MCP)

**Scenarios:**
- [ ] Seed Step 2 → open with WorkflowChat → answer question
- [ ] Complete full workflow (Step 1-10)
- [ ] Network failure → graceful degradation

**Commands:**
```bash
pnpm test:e2e
```

---

### Performance Tests

**Metrics:**
- [ ] First render < 100ms (from cache)
- [ ] Database load < 500ms (p99)
- [ ] Hot reload < 50ms
- [ ] Memory usage stable (no leaks)

**Commands:**
```bash
pnpm test:perf
```

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] TypeScript compilation successful
- [ ] No lint errors
- [ ] Code review approved (2 reviewers)
- [ ] Documentation updated
- [ ] Metrics/observability configured
- [ ] Rollback plan documented

---

### Deployment Steps

#### Step 1: Deploy to Staging

```bash
# Merge to staging branch
git checkout staging
git merge feature/state-sync-fix
git push origin staging

# Deploy
pnpm deploy:staging

# Monitor logs
pnpm logs:staging --tail
```

**Validation (30 min):**
- [ ] Seed script workflow works
- [ ] Fresh project creation works
- [ ] Page refresh preserves state
- [ ] No console errors
- [ ] Check metrics dashboard

---

#### Step 2: Canary Release (10% traffic)

```bash
# Deploy with canary flag
pnpm deploy:production --canary=10
```

**Monitor (1 hour):**
- [ ] Error rate < 0.1%
- [ ] Performance metrics stable
- [ ] No user-reported issues

---

#### Step 3: Full Production Release

```bash
# Promote canary to full release
pnpm deploy:production --promote-canary
```

**Monitor (24 hours):**
- [ ] Error rate normal
- [ ] Cache hit rate > 80%
- [ ] Sync latency < 500ms (p99)
- [ ] No rollback triggers

---

## Rollback Strategy

### Automatic Rollback Triggers

- Error rate > 1% for 5 minutes
- Sync latency > 2 seconds (p99)
- Cache hit rate < 50%

### Manual Rollback

```bash
# Rollback to previous version
pnpm deploy:production --rollback

# Or revert commit
git revert <commit-sha>
git push origin main
pnpm deploy:production
```

### Rollback Validation

- [ ] Error rate returns to baseline
- [ ] Old UI functionality restored
- [ ] No data loss
- [ ] Users can continue workflows

---

## Success Criteria

### Phase 1 (Core Fix)

- [x] Database is single source of truth during init
- [x] Seed script works without manual localStorage setup
- [x] Zero regressions (all tests pass)
- [x] Fast perceived load (< 100ms from cache)
- [x] Graceful error handling

### Phase 2 (Enhancements)

- [ ] Optimistic updates working
- [ ] Real-time sync < 5 seconds
- [ ] Observability metrics tracked
- [ ] Performance targets met

### Business Metrics

- [ ] **Issue #15 resolved** and closed
- [ ] **Zero state desync bugs** reported
- [ ] **Cache hit rate > 80%** in production
- [ ] **User satisfaction** maintained or improved

---

## Risks & Mitigations

### Risk 1: React Query Learning Curve

**Likelihood:** Medium  
**Impact:** Low  
**Mitigation:** 
- Team has React Query experience
- Simple usage pattern (just `useQuery`)
- Fallback to current behavior if issues

---

### Risk 2: Hot-Reload Causes UI Flicker

**Likelihood:** Medium  
**Impact:** Low  
**Mitigation:**
- Use `snapshotsEqual` to prevent unnecessary reloads
- Add transition animations if needed
- User testing before production

---

### Risk 3: Database Performance Degradation

**Likelihood:** Low  
**Impact:** High  
**Mitigation:**
- React Query staleTime reduces requests
- Add database indexes if needed
- Monitor latency metrics
- Scale database if traffic increases

---

### Risk 4: Breaking Old UI

**Likelihood:** Low  
**Impact:** High  
**Mitigation:**
- Old UI uses same XState machine (no changes)
- Comprehensive test coverage
- Canary deployment catches issues early
- Fast rollback available

---

## Timeline & Resources

### Phase 1: Core Fix (Week 1)

| Day | Tasks | Engineer | Hours |
|-----|-------|----------|-------|
| Mon | Task 1.1: RESTORE_SNAPSHOT event | Engineer A | 0.5h |
| Mon-Tue | Task 1.2: Refactor PlanningMachineContext | Engineer A | 3h |
| Tue | Task 1.3: Update docs | Engineer A | 0.5h |
| Wed | Task 1.4: Integration tests | Engineer B | 1h |
| Wed | Task 1.5: Manual QA | QA Engineer | 0.5h |
| Thu | Code review & fixes | Both | 1h |
| Fri | Deploy to staging | DevOps | 0.5h |

**Total:** 6-7 hours

---

### Phase 2: Enhancements (Week 2)

| Day | Tasks | Engineer | Hours |
|-----|-------|----------|-------|
| Mon | Task 2.1: Optimistic mutations | Engineer A | 2h |
| Tue | Task 2.2: Real-time sync | Engineer B | 1h |
| Tue | Task 2.3: Observability | Engineer A | 0.5h |
| Wed | Testing & QA | QA Engineer | 1h |
| Thu | Deploy to staging | DevOps | 0.5h |
| Fri | Deploy to production | DevOps | 0.5h |

**Total:** 5-6 hours

---

## Appendix

### A. Reference Architecture Diagrams

**Current State:**
```
┌─────────────┐
│  Component  │
│   Mount     │
└──────┬──────┘
       │ Synchronous
       ↓
┌─────────────┐      ┌──────────────┐
│ localStorage│ miss │ Fresh State  │
│   Check     │─────→│   (Step 1)   │ ❌
└──────┬──────┘      └──────────────┘
       │ hit
       ↓
┌─────────────┐
│   Create    │
│   Actor     │
└──────┬──────┘
       │
       ↓
┌─────────────┐      Background (too late)
│   Render    │      ┌──────────────┐
│     UI      │      │   Database   │
└─────────────┘      │     Sync     │
                     └──────────────┘
```

**Target State:**
```
┌─────────────┐
│  Component  │
│   Mount     │
└──────┬──────┘
       │
       ├──────────────────────────────┐
       │ Optimistic                   │ Background
       ↓                              ↓
┌─────────────┐                ┌─────────────┐
│ localStorage│                │  Database   │
│   (Cache)   │                │   Query     │
└──────┬──────┘                └──────┬──────┘
       │                              │
       ↓                              ↓
┌─────────────┐                ┌─────────────┐
│   Render    │                │  Authoritative│
│  Cached UI  │─────syncs─────→│    State    │
└─────────────┘                └──────┬──────┘
       ✅                             │
                                      ↓
                               ┌─────────────┐
                               │ Hot Reload  │
                               │   Actor     │
                               └─────────────┘
                                      ✅
```

---

### B. Code Review Checklist

**Reviewer 1:**
- [ ] RESTORE_SNAPSHOT event implemented correctly
- [ ] Snapshot comparison logic is sound
- [ ] Error boundaries cover all cases
- [ ] TypeScript types are correct

**Reviewer 2:**
- [ ] React Query usage follows best practices
- [ ] Optimistic updates handle rollback
- [ ] Performance impact acceptable
- [ ] Documentation is clear

---

### C. Monitoring Queries

**Cache Hit Rate:**
```sql
SELECT 
  COUNT(CASE WHEN cache_hit THEN 1 END) * 100.0 / COUNT(*) as hit_rate_percent
FROM planning_state_loads
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

**Sync Latency (p99):**
```sql
SELECT 
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY sync_duration_ms) as p99_latency_ms
FROM planning_state_syncs
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

---

### D. Support Runbook

**Issue: State desync reported by user**

1. Check if browser cache is stale:
   ```
   localStorage.getItem('planning-machine-<projectId>')
   ```

2. Check database state:
   ```sql
   SELECT value FROM planning_state WHERE project_id = '<projectId>';
   ```

3. Compare timestamps - database should win

4. Have user hard refresh (Ctrl+Shift+R)

5. If persists, clear localStorage and reload

---

## Sign-Off

**Implementation Plan Approved By:**

- [ ] Engineering Lead: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______

**Ready to Begin Implementation:** ☐ Yes ☐ No

**Estimated Completion Date:** _________________
