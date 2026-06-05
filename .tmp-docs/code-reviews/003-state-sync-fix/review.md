# Code Review: State Synchronization Fix Implementation Plan

**Reviewer:** Claude Code (Architecture Review)  
**Date:** 2026-05-29  
**Plan Version:** v1.0  
**Scope:** Phase 1 Core Fix (4-6 hours) + Phase 2 Enhancements (2-3 hours)

---

## Overall Assessment

**Verdict:** ✅ **APPROVED with minor recommendations**

**Score:** 8.5/10 (Excellent - Enterprise grade with room for optimization)

**Summary:** The implementation plan is thorough, well-architected, and addresses the root cause correctly. The phased approach balances risk mitigation with business value delivery. Documentation quality is exceptional.

---

## Strengths

### 1. **Root Cause Analysis** ✅ (Outstanding)

The plan correctly identifies the fundamental issue:
- Split source of truth (localStorage init vs database runtime)
- Synchronous init pattern incompatible with async database
- Background sync runs too late to affect actor initialization

**Evidence of thorough investigation:**
- Code flow analysis with line numbers
- Multiple test scenarios documented
- Visual architecture diagrams
- Clear reproduction steps

### 2. **Solution Architecture** ✅ (Excellent)

Option 2+ (Enhanced Async Init) is the right choice:
- Database-first (single source of truth) ✅
- Optimistic rendering (UX preserved) ✅
- Hot-reload via RESTORE_SNAPSHOT (no page refresh) ✅
- Graceful degradation (offline support) ✅
- React Query integration (caching, refetching) ✅

**Why this beats alternatives:**
- Option 1 is a band-aid (doesn't fix root cause)
- Option 3 requires SSR fix first (larger scope, blocked by BUG-018)
- Option 2+ works with current `ssr: false` (no dependencies)

### 3. **Implementation Plan** ✅ (Very Good)

Phase 1 tasks are well-defined:
- Task 1.1: RESTORE_SNAPSHOT event (30min) - Clear scope ✅
- Task 1.2: Refactor PlanningMachineContext (2-3h) - Detailed pseudocode ✅
- Task 1.3: Documentation (30min) - Files specified ✅
- Task 1.4: Integration testing (1h) - Test scenarios provided ✅
- Task 1.5: Manual QA (30min) - Checklist included ✅

**Time estimates are realistic** based on complexity and team experience.

### 4. **Testing Strategy** ✅ (Excellent)

Comprehensive coverage across multiple layers:
- **Unit tests:** RESTORE_SNAPSHOT event, snapshot comparison, error boundaries
- **Integration tests:** Seed workflow, cross-device sync, page refresh
- **E2E tests:** Playwright MCP scenarios
- **Performance tests:** Load time targets (< 100ms cache, < 500ms DB)

**Test scenarios cover edge cases:**
- Empty cache + DB load ✅
- Stale cache + fresh DB ✅
- DB error + cache fallback ✅
- DB error + no cache (error boundary) ✅
- Offline behavior ✅

### 5. **Risk Management** ✅ (Very Good)

All major risks identified with mitigations:
- React Query learning curve → Team has experience
- Hot-reload UI flicker → `snapshotsEqual` prevents unnecessary reloads
- DB performance → React Query caching + monitoring
- Breaking old UI → Comprehensive tests + canary deployment

### 6. **Documentation Quality** ✅ (Outstanding)

- 35-page implementation plan with TOC
- Code examples for every major change
- Architecture diagrams (before/after)
- Test coverage examples
- Deployment strategy
- Rollback plan
- Success criteria

---

## Issues & Recommendations

### Critical Issues: 0 ❌

No blocking issues found.

---

### Major Issues: 1 ⚠️

#### 1. **RESTORE_SNAPSHOT Implementation Pattern** (Severity: Medium)

**Location:** Task 1.1 pseudocode (lines 108-127 in plan)

**Issue:** The proposed `RESTORE_SNAPSHOT` handler uses timestamp comparison to preserve local changes:

```typescript
actions: assign((context, event) => {
  const dbContext = event.snapshot.context;
  
  return {
    ...context,
    ...dbContext,
    // Keep local changes if they're newer
    updatedAt: new Date(dbContext.updatedAt) > new Date(context.updatedAt)
      ? dbContext.updatedAt
      : context.updatedAt,
  };
}),
```

**Problems:**
1. **Unconditional merge** (`...context, ...dbContext`) always overwrites local state
2. **Timestamp comparison is too late** - happens AFTER the spread operators
3. **Loses optimistic updates** if DB timestamp is newer but local has unsaved work
4. **No field-level conflict detection** - all-or-nothing approach

**Recommended Fix:**

```typescript
actions: assign((context, event) => {
  const dbContext = event.snapshot.context;
  
  const localTime = new Date(context.updatedAt).getTime();
  const dbTime = new Date(dbContext.updatedAt).getTime();
  
  // If local is newer, keep local (optimistic updates not yet saved)
  if (localTime > dbTime) {
    console.log('[RESTORE_SNAPSHOT] Keeping local changes (newer than DB)');
    return context; // No-op
  }
  
  // If DB is newer, merge carefully
  console.log('[RESTORE_SNAPSHOT] Applying DB snapshot (newer than local)');
  
  // Strategy: Accept DB state, but preserve any in-flight transactions
  return {
    ...dbContext,
    // Preserve transient UI state (not persisted to DB)
    // e.g., form draft values, pending mutations, etc.
    // (Add fields as needed based on requirements)
  };
}),
```

**Alternative (Field-Level Merge):**

For more sophisticated conflict resolution:

```typescript
actions: assign((context, event) => {
  const dbContext = event.snapshot.context;
  
  const merged = { ...context };
  
  // Merge each field intelligently
  for (const key of Object.keys(dbContext)) {
    const localValue = context[key];
    const dbValue = dbContext[key];
    
    // Skip if local and DB match
    if (JSON.stringify(localValue) === JSON.stringify(dbValue)) {
      continue;
    }
    
    // Use DB value by default (DB is source of truth)
    merged[key] = dbValue;
    
    // Exception: Preserve local optimistic updates
    // (Requires tracking which fields have unsaved changes)
  }
  
  return merged;
}),
```

**Impact:** High - Incorrect merge logic can lose user data or fail to sync properly.

**Test Coverage Needed:**

```typescript
describe('RESTORE_SNAPSHOT conflict resolution', () => {
  it('keeps local changes when local is newer', () => {
    // User makes change → hasn't synced yet → DB snapshot arrives
    // Expected: Keep local changes
  });
  
  it('accepts DB changes when DB is newer', () => {
    // Other device makes change → syncs to DB → local receives snapshot
    // Expected: Apply DB changes
  });
  
  it('handles concurrent edits gracefully', () => {
    // Both devices edit different fields → last-write-wins per field
    // Expected: Merge without data loss
  });
});
```

---

### Minor Issues: 4 ⚠️

#### 2. **React Query Configuration** (Severity: Low)

**Location:** Task 1.2, useQuery configuration (lines 203-221)

**Issue:** The `staleTime: 5000` is very aggressive for a state machine snapshot.

**Current:**
```typescript
staleTime: 5000,        // Consider fresh for 5 seconds
gcTime: 30000,          // Keep in memory for 30 seconds
```

**Recommendation:**
```typescript
staleTime: 30000,       // Consider fresh for 30 seconds (reduce DB calls)
gcTime: 5 * 60 * 1000,  // Keep in memory for 5 minutes (better offline support)
refetchOnMount: false,  // Don't refetch if cache is fresh (avoid double-fetches)
```

**Rationale:**
- Planning workflows are typically 5-15 minute sessions
- Refetching every 5 seconds is wasteful for single-user workflows
- Cache can stay fresh longer without harming consistency
- Background refetch on focus/reconnect already handles staleness

**Phase 2 Enhancement:**
- Add `refetchInterval: 30000` only when `?workflowChat=1` (real-time collab mode)
- Skip interval refetch for single-user workflows

---

#### 3. **Loading State Logic** (Severity: Low)

**Location:** Task 1.2, lines 351-361 in plan

**Issue:** The loading spinner condition is slightly wrong:

**Current:**
```typescript
if (isLoading && !cachedSnapshot) {
  return <LoadingSpinner />;
}
```

**Problem:** This will show spinner even if `authoritativeSnapshot` is available (e.g., fresh actor case).

**Recommended:**
```typescript
// Show spinner ONLY if we have no state to render with
if (!authoritativeSnapshot && isLoading) {
  return <LoadingSpinner />;
}
```

**Edge Case:**
- New project (no cache, no DB state) → loading spinner shown correctly ✅
- Existing project (no cache, DB loading) → spinner shown correctly ✅
- Existing project (cache present, DB loading) → render immediately ✅

---

#### 4. **Error Boundary Implementation** (Severity: Low)

**Location:** Task 1.2, lines 363-383

**Issue:** Error boundary only handles `dbError`, but not React render errors.

**Current:** Inline error UI for `dbError && !cachedSnapshot`

**Recommendation:** Use React Error Boundary component for comprehensive error handling:

```typescript
// ErrorBoundary.tsx
export class PlanningMachineErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('[PlanningMachineErrorBoundary]', error, errorInfo);
    // Send to error tracking (Sentry, etc.)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorUI error={this.state.error} onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
}

// Usage in route
<PlanningMachineErrorBoundary onRetry={() => window.location.reload()}>
  <PlanningMachineProvider input={input}>
    {children}
  </PlanningMachineProvider>
</PlanningMachineErrorBoundary>
```

**Benefits:**
- Catches React render errors (not just DB errors)
- Prevents white screen of death
- Provides consistent error UX

---

#### 5. **Snapshot Comparison Function** (Severity: Low)

**Location:** Task 1.2, lines 395-403

**Issue:** `snapshotsEqual` comparison is too shallow.

**Current:**
```typescript
function snapshotsEqual(a: SnapshotType, b: any): boolean {
  if (!a || !b) return false;
  
  return (
    a.context.updatedAt === b.context?.updatedAt &&
    a.context.currentStepNumber === b.context?.currentStepNumber &&
    a.value === b.value
  );
}
```

**Problems:**
1. **Only checks 3 fields** - ignores step1Responses, step2Answers, etc.
2. **Timestamp equality is fragile** - millisecond differences cause false negatives
3. **State value comparison** (`a.value === b.value`) can be wrong for nested states

**Recommended:**

```typescript
function snapshotsEqual(a: SnapshotType, b: any): boolean {
  if (!a || !b) return false;
  
  // Quick check: same timestamp means same snapshot (likely)
  if (a.context.updatedAt === b.context?.updatedAt) {
    return true;
  }
  
  // Fallback: deep comparison of context
  // (State value can differ even if context is same due to transient states)
  try {
    return JSON.stringify(a.context) === JSON.stringify(b.context);
  } catch (error) {
    // JSON.stringify can fail on circular refs, Dates, etc.
    console.warn('[snapshotsEqual] JSON comparison failed:', error);
    
    // Ultra-safe fallback: consider them different
    return false;
  }
}
```

**Alternative (Faster):**

Use `lodash.isEqual` or similar deep-equality library:

```typescript
import { isEqual } from 'lodash-es';

function snapshotsEqual(a: SnapshotType, b: any): boolean {
  return a && b && isEqual(a.context, b.context);
}
```

**Test Coverage:**

```typescript
describe('snapshotsEqual', () => {
  it('returns true for identical snapshots', () => {
    const snapshot = createTestSnapshot();
    expect(snapshotsEqual(snapshot, snapshot)).toBe(true);
  });
  
  it('returns true for snapshots with same context but different state value', () => {
    // Transient states (submitting, etc.) shouldn't trigger hot-reload
    const a = { context: { updatedAt: '2026-05-29T10:00:00Z' }, value: 'step2.idle' };
    const b = { context: { updatedAt: '2026-05-29T10:00:00Z' }, value: 'step2.submitting' };
    expect(snapshotsEqual(a, b)).toBe(true); // Same context = same logical state
  });
  
  it('returns false for different context', () => {
    const a = { context: { currentStepNumber: 1 } };
    const b = { context: { currentStepNumber: 2 } };
    expect(snapshotsEqual(a, b)).toBe(false);
  });
  
  it('handles null/undefined gracefully', () => {
    expect(snapshotsEqual(null, {})).toBe(false);
    expect(snapshotsEqual({}, null)).toBe(false);
  });
});
```

---

### Trivial Issues: 3 ℹ️

#### 6. **Console Logging** (Severity: Trivial)

**Location:** Throughout Task 1.2

**Issue:** Excessive console.log statements in production code.

**Recommendation:** Use a logging library with levels:

```typescript
import { logger } from '@/lib/logger';

// Development: verbose
logger.debug('[PlanningMachineProvider] Fetching from database');

// Production: only errors/warnings
logger.error('[PlanningMachineProvider] Database fetch failed', { error });
```

**Or:** Add environment check:

```typescript
const log = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PlanningMachineProvider]', ...args);
  }
};
```

---

#### 7. **Type Safety** (Severity: Trivial)

**Location:** Task 1.2, line 251

**Issue:** `const snapshot = dbSnapshot ?? cachedSnapshot;` can be `null`, but `createActor` call on line 263 doesn't check.

**Current:**
```typescript
const authoritativeSnapshot = React.useMemo(() => {
  // ... logic
  return null; // Last resort: null
}, [...]);

const actor = React.useMemo(() => {
  if (authoritativeSnapshot) {
    return createActor(planningMachine, { input, snapshot: authoritativeSnapshot });
  }
  
  return createActor(planningMachine, { input });
}, [authoritativeSnapshot, input]);
```

**Recommendation:** Add type assertion to clarify intent:

```typescript
const actor = React.useMemo(() => {
  if (authoritativeSnapshot) {
    return createActor(planningMachine, {
      input,
      snapshot: authoritativeSnapshot as SnapshotType, // Type assertion (plan already has this)
    });
  }
  
  console.log('[PlanningMachineProvider] No snapshot available, creating fresh actor');
  return createActor(planningMachine, { input });
}, [authoritativeSnapshot, input]);
```

**Already correct in plan** - just noting for completeness.

---

#### 8. **Unused Imports** (Severity: Trivial)

**Location:** Task 1.2, line 182

**Issue:** Plan shows importing `stepStateQueryKey` but doesn't use it.

**Current:**
```typescript
import { stepStateQueryKey } from "../application/queries";
```

**Should be:**
```typescript
// Use the centralized query key factory
queryKey: stepStateQueryKey(projectId),
```

**Already correct in plan** (line 208) - just ensure no copy-paste errors.

---

## Phase 2 Review (Enhancements)

### Task 2.1: Optimistic Mutations ✅ (Good)

**Strengths:**
- Correct React Query mutation pattern
- Proper rollback on error
- Cache invalidation on settle

**Recommendation:**

Add optimistic UI feedback:

```typescript
export function useSubmitAnswerMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: $submitAnswer,
    
    onMutate: async (variables) => {
      // ... existing logic
      
      // ADDITION: Update local actor immediately (optimistic)
      const actor = (window as any).__planningActor;
      if (actor) {
        actor.send({
          type: 'SUBMIT_ANSWER',
          answer: variables.answer,
          question: variables.question,
        });
      }
      
      return { previousSnapshot };
    },
    
    onError: (error, variables, context) => {
      // ... existing rollback
      
      // ADDITION: Rollback actor state too
      const actor = (window as any).__planningActor;
      if (actor && context?.previousSnapshot) {
        actor.send({
          type: 'RESTORE_SNAPSHOT',
          snapshot: context.previousSnapshot,
        });
      }
    },
  });
}
```

**Benefit:** Instant UI feedback, no waiting for server.

---

### Task 2.2: Real-Time Sync ✅ (Good)

**Option A (Polling):** Good fallback, but 5s is aggressive.

**Recommendation:** Adaptive polling:

```typescript
export function useRealtimeSync(projectId: string, enabled: boolean = true) {
  const [pollInterval, setPollInterval] = React.useState(30000); // Start at 30s
  
  return useQuery({
    queryKey: stepStateQueryKey(projectId),
    queryFn: () => $loadPlanningState({ data: { projectId } }),
    refetchInterval: enabled ? pollInterval : false,
    refetchIntervalInBackground: false,
    
    onSuccess: (data) => {
      // If data changed, poll more frequently for next 2 minutes
      // (Assume active collaboration happening)
      setPollInterval(5000);
      setTimeout(() => setPollInterval(30000), 2 * 60 * 1000);
    },
  });
}
```

**Option B (WebSocket):** Excellent for Phase 2, but consider:
- Server-side pub/sub (Redis, etc.) for horizontal scaling
- Reconnection logic (exponential backoff)
- Heartbeat messages (detect stale connections)

---

### Task 2.3: Observability ✅ (Adequate)

**Recommendation:** Add structured logging:

```typescript
export function trackStateSync(projectId: string, details: {
  source: 'cache' | 'database';
  cacheHit: boolean;
  syncDuration?: number;
  error?: Error;
}) {
  // Structured log for aggregation
  const logEntry = {
    timestamp: new Date().toISOString(),
    projectId,
    event: 'planning_state_sync',
    ...details,
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Send to logging backend (Datadog, Splunk, etc.)
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(logEntry),
    }).catch(console.error);
  } else {
    console.log('[Metrics]', logEntry);
  }
}
```

**Metrics to track:**
- Cache hit rate (by projectId, by time of day)
- Sync latency (p50, p95, p99)
- Error rate (by error type)
- Hot-reload frequency (how often snapshots differ)

---

## Testing Review

### Unit Tests ✅ (Excellent)

Test coverage is comprehensive. **One addition:**

```typescript
describe('PlanningMachineProvider - Hot Reload', () => {
  it('does not hot-reload if snapshots are equal', async () => {
    // Arrange
    const step2Snapshot = createStep2Snapshot();
    localStorage.setItem('planning-machine-test', JSON.stringify(step2Snapshot));
    mockLoadPlanningState.mockResolvedValue(step2Snapshot); // Same as cache
    
    const sendSpy = vi.spyOn(ActorRef.prototype, 'send');
    
    // Act
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // Assert - RESTORE_SNAPSHOT should NOT be called (snapshots equal)
    await waitFor(() => {
      expect(mockLoadPlanningState).toHaveBeenCalled();
    });
    
    expect(sendSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESTORE_SNAPSHOT' })
    );
  });
});
```

**Rationale:** Ensure `snapshotsEqual` prevents unnecessary hot-reloads.

---

### Integration Tests ✅ (Very Good)

Seed script test is perfect. **One addition:**

```typescript
describe('State Sync Integration Tests', () => {
  it('handles race condition: user edits while DB sync in-flight', async () => {
    // Arrange
    const step2Snapshot = createStep2Snapshot();
    let resolveFetch: (snapshot: any) => void;
    const dbFetch = new Promise((resolve) => { resolveFetch = resolve; });
    mockLoadPlanningState.mockReturnValue(dbFetch); // Slow DB
    
    // Act - mount and immediately edit (before DB returns)
    render(
      <QueryClientProvider client={queryClient}>
        <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
          <TestComponent />
        </PlanningMachineProvider>
      </QueryClientProvider>
    );
    
    // User edits while DB loading
    fireEvent.click(screen.getByText('Submit Answer'));
    
    // DB returns (older state)
    resolveFetch!(step2Snapshot);
    
    // Assert - local edit should NOT be overwritten
    await waitFor(() => {
      expect(screen.getByText('Your Answer')).toBeInTheDocument();
    });
  });
});
```

**Rationale:** Ensures optimistic updates aren't clobbered by slow DB fetches.

---

## Deployment & Operations

### Deployment Plan ✅ (Excellent)

Canary release strategy is correct. **One addition:**

**Feature Flag:**

```typescript
// server/config.ts
export const FEATURE_FLAGS = {
  DATABASE_FIRST_INIT: process.env.FEATURE_DATABASE_FIRST_INIT === 'true',
};

// PlanningMachineContext.tsx
import { FEATURE_FLAGS } from '@/server/config';

export function PlanningMachineProvider({ ... }) {
  const useDatabaseFirst = FEATURE_FLAGS.DATABASE_FIRST_INIT;
  
  if (!useDatabaseFirst) {
    // Old behavior (fallback)
    return <OldPlanningMachineProvider {...props} />;
  }
  
  // New behavior (Phase 1)
  return <NewPlanningMachineProvider {...props} />;
}
```

**Benefit:** Instant rollback without code deploy (just flip env var).

---

### Monitoring ✅ (Good)

**Add alerting thresholds:**

```yaml
# alerts.yaml
alerts:
  - name: PlanningStateSyncFailureRate
    query: |
      sum(rate(planning_state_sync_errors_total[5m])) /
      sum(rate(planning_state_sync_attempts_total[5m])) > 0.01
    for: 5m
    severity: warning
    message: "Planning state sync failure rate > 1% for 5 minutes"
  
  - name: PlanningStateSyncLatency
    query: |
      histogram_quantile(0.99, planning_state_sync_duration_ms) > 2000
    for: 5m
    severity: warning
    message: "Planning state sync p99 latency > 2s"
  
  - name: PlanningCacheHitRate
    query: |
      sum(rate(planning_state_cache_hits[1h])) /
      sum(rate(planning_state_cache_attempts[1h])) < 0.5
    for: 1h
    severity: info
    message: "Planning state cache hit rate < 50% for 1 hour"
```

---

## Documentation Review ✅ (Outstanding)

**Strengths:**
- Clear table of contents
- Code examples for every change
- Architecture diagrams (before/after)
- Test scenarios with expected results
- Deployment runbook
- Rollback strategy
- Sign-off checklist

**Minor Additions:**

1. **ADR (Architecture Decision Record):**

```markdown
# ADR-003: Database-First State Synchronization

## Status
Proposed

## Context
localStorage-first initialization causes state desync when cache is stale.

## Decision
Implement database-first initialization with optimistic rendering.

## Consequences
Positive:
- Database is single source of truth
- Fixes cross-device sync
- Enables real-time collaboration

Negative:
- Slightly more complex (React Query + hot-reload)
- Requires RESTORE_SNAPSHOT event in machine

## Alternatives Considered
- Option 1: Seed API populates cache (band-aid)
- Option 3: SSR injection (blocked by BUG-018)
```

2. **Migration Guide (for other teams):**

```markdown
# Migration Guide: Adopting Database-First Pattern

If your feature uses similar XState + localStorage patterns:

1. Add RESTORE_SNAPSHOT event to your machine
2. Wrap provider in React Query
3. Load DB state asynchronously
4. Hot-reload actor when DB data arrives
5. Add error boundaries

See: `src/features/planning/machines/PlanningMachineContext.tsx`
```

---

## Recommendations Summary

### Must Fix Before Implementation (P0)

1. **Fix RESTORE_SNAPSHOT merge logic** (Major Issue #1)
   - Use timestamp-aware merge or field-level conflict resolution
   - Add test coverage for concurrent edits

### Should Fix in Phase 1 (P1)

2. **Improve React Query config** (Minor Issue #2)
   - Increase `staleTime` to 30s (reduce unnecessary fetches)
   - Increase `gcTime` to 5 minutes (better offline support)

3. **Fix loading state condition** (Minor Issue #3)
   - Check `!authoritativeSnapshot` instead of `!cachedSnapshot`

4. **Add React Error Boundary** (Minor Issue #4)
   - Catch render errors, not just DB errors

5. **Improve snapshotsEqual** (Minor Issue #5)
   - Use deep equality (lodash.isEqual or JSON.stringify)

### Nice to Have in Phase 2 (P2)

6. **Reduce console logging** (Trivial Issue #6)
   - Use logging library or environment check

7. **Add feature flag** (Operations)
   - Enable instant rollback without code deploy

8. **Add structured metrics** (Observability)
   - Track cache hit rate, sync latency, error rate

9. **Add ADR document** (Documentation)
   - Capture architectural decision for future reference

---

## Final Verdict

**Overall:** ✅ **APPROVED**

**Confidence Level:** High (95%)

**Recommended Action:** Proceed with Phase 1 implementation after addressing Major Issue #1 (RESTORE_SNAPSHOT merge logic).

**Timeline:** Achievable within stated 4-6 hours for Phase 1, 2-3 hours for Phase 2.

**Risk Level:** Low (with recommended fixes applied)

---

## Sign-Off Checklist

- [x] Root cause correctly identified
- [x] Solution architecture is sound
- [x] Implementation plan is detailed and realistic
- [x] Test coverage is comprehensive
- [x] Deployment strategy includes rollback plan
- [x] Documentation quality is excellent
- [ ] **RESTORE_SNAPSHOT merge logic reviewed** (Must address before coding)
- [ ] React Query configuration tuned (Should address in Phase 1)
- [ ] Error boundaries added (Should address in Phase 1)

**Reviewer Signature:** Claude Code  
**Date:** 2026-05-29  
**Recommendation:** Proceed with implementation after addressing RESTORE_SNAPSHOT merge logic (Major Issue #1)

---

## Appendix: Quick Wins

If time is limited, prioritize these changes for maximum impact:

1. **Fix RESTORE_SNAPSHOT merge** (10 min) - Prevents data loss
2. **Improve snapshotsEqual** (5 min) - Prevents unnecessary hot-reloads
3. **Add error boundary** (15 min) - Better error UX
4. **Tune React Query config** (2 min) - Reduce DB load

**Total:** 32 minutes of targeted improvements for 80% of the benefit.
