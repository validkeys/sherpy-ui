# Enterprise Architecture Review: State Synchronization

**Date:** 2026-05-29  
**Scope:** Planning workflow state management and persistence  
**Issue:** [#15 - State desynchronization](https://github.com/validkeys/sherpy-ui/issues/15)

---

## Executive Summary

The current architecture has a **fundamental design flaw**: it treats localStorage as the primary source during initialization, but database as the source of truth during runtime. This creates a critical window where stale or missing cache data causes incorrect application state.

**Recommendation:** Implement **Option 2+ (Enhanced Async Initialization)** with database as single source of truth, optimistic UI updates, and proper error boundaries. Estimated effort: 4-6 hours.

---

## Current Architecture Analysis

### State Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Component Mount (Synchronous)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Check localStorage (read-through cache)                 │
│ 2. If found → Create actor from cache                      │
│ 3. If not found → Create fresh actor (Step 1) ← BUG        │
│ 4. Start actor                                             │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Background Sync (Asynchronous)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Load from database                                       │
│ 2. Compare timestamps (local vs DB)                        │
│ 3. Update localStorage if DB is newer                      │
│ 4. Log "Actor will update on next page load" ← PROBLEM     │
└─────────────────────────────────────────────────────────────┘
```

### Critical Issues

#### 1. **Split Source of Truth** (Severity: Critical)
- Initialization reads localStorage (cache)
- Runtime sync reads database (truth)
- **No cache invalidation strategy**
- Cache misses cause incorrect initialization

#### 2. **Sync Happens Too Late** (Severity: High)
- Background sync runs after actor creation
- Actor cannot be hot-swapped (XState v5 limitation)
- Only fixes itself on next page load
- Creates 30-60 second window of incorrect state

#### 3. **No Loading State** (Severity: Medium)
- Synchronous init requires instant data
- Can't wait for database on first load
- Forces reliance on potentially stale cache

#### 4. **Cross-Device Sync Gaps** (Severity: Medium)
- 30-second periodic sync interval
- Visibility change handler (only when tab becomes visible)
- No real-time updates between devices
- Can miss updates made on other devices

#### 5. **No Conflict Resolution** (Severity: Medium)
- Timestamp comparison only (`local >= db`)
- No merge strategy for conflicting edits
- Last-write-wins (can lose data)

#### 6. **Cache Invalidation Issues** (Severity: High)
- No expiry policy
- No versioning
- Manual DB updates bypass cache
- Seed script doesn't populate cache

---

## Enterprise Requirements

### Must-Have (P0)

1. **Single Source of Truth**: Database must be authoritative
2. **Correct Initial State**: First render must show correct data
3. **Fast Load Times**: Sub-500ms perceived load time
4. **Data Consistency**: No split-brain between cache and DB
5. **Error Recovery**: Graceful degradation on DB failures

### Should-Have (P1)

6. **Offline Support**: Work without network, sync when back online
7. **Optimistic Updates**: Instant UI feedback, sync in background
8. **Multi-Device Sync**: Real-time updates across tabs/devices
9. **Conflict Resolution**: Handle concurrent edits gracefully
10. **Observability**: Metrics, logging, error tracking

### Nice-to-Have (P2)

11. **Undo/Redo**: Version history and rollback
12. **Audit Trail**: Track all state changes
13. **Performance Monitoring**: Track sync latency, cache hit rate

---

## Solution Options Compared

### Option 1: Seed API Populates localStorage

**Score: 3/10 (Not Enterprise Grade)**

```typescript
// Client-side after seed API call
localStorage.setItem(storageKey, JSON.stringify(snapshot));
window.location.href = `/project/${projectId}/build`;
```

✅ **Pros:**
- Quick fix (1-2 hours)
- No architectural changes
- Maintains current patterns

❌ **Cons:**
- **Doesn't fix root cause** (split source of truth remains)
- Only helps seed script, not manual DB updates
- No cross-device sync improvement
- No conflict resolution
- Still has cache invalidation issues

**Verdict:** Band-aid solution, not sustainable.

---

### Option 2: Async Machine Initialization (Basic)

**Score: 6/10 (Acceptable but Incomplete)**

```typescript
const { data: dbSnapshot, isLoading } = useQuery({
  queryKey: ['planning-snapshot', projectId],
  queryFn: () => $loadPlanningState({ data: { projectId } })
});

const actor = useMemo(() => {
  const snapshot = dbSnapshot ?? loadStateSync(storageKey);
  return snapshot 
    ? createActor(planningMachine, { input, snapshot })
    : createActor(planningMachine, { input });
}, [dbSnapshot, projectId]);

if (isLoading) return <LoadingSpinner />;
```

✅ **Pros:**
- Database is source of truth
- Fixes initialization bug
- Works for seed script without manual steps
- React Query handles caching, refetching

❌ **Cons:**
- Loading UI on every mount (bad UX)
- No optimistic updates
- Still no conflict resolution
- No offline support

**Verdict:** Correct direction but needs enhancement.

---

### Option 2+ (Enhanced): Database-First with Optimistic Updates

**Score: 9/10 (Enterprise Grade) ← RECOMMENDED**

```typescript
// Step 1: Optimistic render from cache
const cachedSnapshot = loadStateSync(storageKey);

// Step 2: Query database (background)
const { data: dbSnapshot, isLoading, error } = useQuery({
  queryKey: ['planning-snapshot', projectId],
  queryFn: () => $loadPlanningState({ data: { projectId } }),
  staleTime: 5000,        // Cache 5 seconds
  gcTime: 30000,          // Keep in memory 30s
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

// Step 3: Determine authoritative state
const authoritativeSnapshot = useMemo(() => {
  // Prefer database over cache
  if (dbSnapshot) return dbSnapshot;
  
  // Fallback to cache while loading
  if (isLoading && cachedSnapshot?.context.projectId === projectId) {
    return cachedSnapshot;
  }
  
  // Fresh state as last resort
  return null;
}, [dbSnapshot, cachedSnapshot, isLoading, projectId]);

// Step 4: Create actor with authoritative state
const actor = useMemo(() => {
  return authoritativeSnapshot
    ? createActor(planningMachine, { input, snapshot: authoritativeSnapshot })
    : createActor(planningMachine, { input });
}, [authoritativeSnapshot, input]);

// Step 5: Hot-reload actor when DB data arrives
useEffect(() => {
  if (!dbSnapshot || !actor) return;
  
  // Check if DB state is different from current actor state
  const currentSnapshot = actor.getSnapshot();
  if (snapshotsEqual(currentSnapshot, dbSnapshot)) return;
  
  // Send RESTORE event to machine
  actor.send({ type: 'RESTORE_SNAPSHOT', snapshot: dbSnapshot });
}, [dbSnapshot, actor]);

// Step 6: Show loading overlay only if no cache available
if (isLoading && !cachedSnapshot) {
  return <LoadingSpinner />;
}

// Step 7: Show error boundary if DB fails and no cache
if (error && !cachedSnapshot) {
  return <ErrorBoundary error={error} retry={() => queryClient.invalidateQueries(...)} />;
}
```

✅ **Pros:**
- **Database is single source of truth**
- **Optimistic render from cache** (no loading UI in happy path)
- **Hot-reload when DB data arrives** (no page refresh needed)
- **Graceful degradation** (works offline with cache)
- **Error boundaries** (handles DB failures)
- **React Query benefits** (caching, refetching, deduplication)
- **Works for all scenarios** (seed, manual DB updates, cross-device)

✅ **Additional Enhancements:**
- Add `RESTORE_SNAPSHOT` event to machine
- Implement `snapshotsEqual` comparison
- Add version field to snapshot for cache invalidation
- Add mutation hooks for optimistic updates
- Add websocket/polling for real-time sync

❌ **Cons:**
- Requires machine changes (RESTORE_SNAPSHOT event)
- More complex than current implementation
- Brief "flash" if cached data differs from DB

**Verdict:** Production-ready enterprise solution.

---

### Option 3: Server-Side Snapshot Injection

**Score: 8/10 (Enterprise Grade, but requires SSR fix)**

```typescript
// Route loader (server-side)
export const Route = createFileRoute("/project/$projectId/build")({
  loader: async ({ params }) => {
    const snapshot = await loadPlanningState(params.projectId);
    return { snapshot };
  },
  component: BuildComponent,
  ssr: true,  // Re-enable SSR (currently false for BUG-018)
});

function BuildComponent() {
  const { snapshot } = Route.useLoaderData();
  
  const actor = useMemo(() => {
    return snapshot
      ? createActor(planningMachine, { input, snapshot })
      : createActor(planningMachine, { input });
  }, [snapshot, input]);
  
  // No loading state needed - SSR provides data
  // No cache needed - server fetches fresh data
}
```

✅ **Pros:**
- **Zero loading UI** (data arrives with HTML)
- **Database is source of truth**
- **Fast perceived performance** (SSR renders immediately)
- **SEO benefits** (if needed)
- **Clean architecture** (server-side data loading)

❌ **Cons:**
- **Requires fixing BUG-018** (SSR hydration mismatch)
- Currently `ssr: false` for good reason
- Larger scope (must solve hydration issue first)
- Still needs client-side updates for real-time sync

**Verdict:** Best long-term solution, but requires SSR fix first.

---

## Recommended Solution

### **Option 2+ (Enhanced Async Initialization)** ← IMPLEMENT THIS

**Rationale:**
1. **Database-first** solves root cause
2. **Optimistic rendering** maintains good UX
3. **Hot-reload** eliminates page refresh need
4. **Graceful degradation** handles offline/errors
5. **No SSR dependency** (works with `ssr: false`)
6. **Incremental migration** (can add features iteratively)

### Implementation Plan

#### Phase 1: Core Fix (2-3 hours)

**Files to modify:**
- `src/features/planning/machines/PlanningMachineContext.tsx`
- `src/features/planning/machines/planningMachine.ts`

**Changes:**

1. **Add RESTORE_SNAPSHOT event to machine**
```typescript
// planningMachine.ts
on: {
  RESTORE_SNAPSHOT: {
    actions: assign({
      // Merge DB snapshot into current context
      // Preserve any optimistic updates not in DB yet
    })
  }
}
```

2. **Refactor PlanningMachineProvider to use React Query**
```typescript
// PlanningMachineContext.tsx
const cachedSnapshot = loadStateSync(storageKey);

const { data: dbSnapshot, isLoading, error } = useQuery({
  queryKey: stepStateQueryKey(projectId),
  queryFn: () => $loadPlanningState({ data: { projectId } }),
  staleTime: 5000,
});

const authoritativeSnapshot = dbSnapshot ?? cachedSnapshot;

const actor = useMemo(() => {
  return authoritativeSnapshot
    ? createActor(planningMachine, { input, snapshot: authoritativeSnapshot })
    : createActor(planningMachine, { input });
}, [authoritativeSnapshot?.context.updatedAt]); // Recreate when DB data changes

// Show spinner only if no cache available
if (isLoading && !cachedSnapshot) {
  return <LoadingSpinner />;
}
```

3. **Add snapshot comparison utility**
```typescript
function snapshotsEqual(a: Snapshot, b: Snapshot): boolean {
  return a.context.updatedAt === b.context.updatedAt &&
         a.context.currentStepNumber === b.context.currentStepNumber;
}
```

#### Phase 2: Optimistic Updates (1-2 hours)

**Add mutation hooks:**
```typescript
// infrastructure/mutations.ts
export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: $submitAnswer,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['planning-snapshot'] });
      
      // Snapshot current value
      const previous = queryClient.getQueryData(['planning-snapshot']);
      
      // Optimistically update cache
      queryClient.setQueryData(['planning-snapshot'], (old) => ({
        ...old,
        context: {
          ...old.context,
          step2Answers: [...old.context.step2Answers, variables.answer]
        }
      }));
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['planning-snapshot'], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['planning-snapshot'] });
    }
  });
}
```

#### Phase 3: Real-Time Sync (1 hour)

**Add WebSocket or polling:**
```typescript
// Option A: WebSocket (preferred)
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:5180/ws/planning/${projectId}`);
  
  ws.onmessage = (event) => {
    const snapshot = JSON.parse(event.data);
    queryClient.setQueryData(['planning-snapshot', projectId], snapshot);
  };
  
  return () => ws.close();
}, [projectId]);

// Option B: Short polling (fallback)
useQuery({
  queryKey: ['planning-snapshot', projectId],
  queryFn: () => $loadPlanningState({ data: { projectId } }),
  refetchInterval: 5000, // Poll every 5s
});
```

#### Phase 4: Observability (30 min)

**Add metrics and logging:**
```typescript
// Track cache hit rate
const cacheHitRate = cachedSnapshot ? 'hit' : 'miss';
analytics.track('planning_state_load', { cacheHitRate, projectId });

// Track sync latency
const syncStart = Date.now();
const dbSnapshot = await $loadPlanningState({ data: { projectId } });
const syncDuration = Date.now() - syncStart;
metrics.histogram('planning_state_sync_duration_ms', syncDuration);

// Track conflicts
if (hasConflict(cachedSnapshot, dbSnapshot)) {
  analytics.track('planning_state_conflict', {
    projectId,
    localTimestamp: cachedSnapshot.context.updatedAt,
    dbTimestamp: dbSnapshot.context.updatedAt
  });
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('PlanningMachineContext', () => {
  it('loads from database when localStorage is empty', async () => {
    // Arrange
    localStorage.clear();
    mockLoadPlanningState.mockResolvedValue(step2Snapshot);
    
    // Act
    render(<PlanningMachineProvider input={{ projectId: 'test' }} />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Stage 2')).toBeInTheDocument();
    });
  });
  
  it('shows cached state immediately, then syncs from database', async () => {
    // Arrange
    localStorage.setItem('planning-machine-test', JSON.stringify(step1Snapshot));
    mockLoadPlanningState.mockResolvedValue(step2Snapshot);
    
    // Act
    render(<PlanningMachineProvider input={{ projectId: 'test' }} />);
    
    // Assert - shows cache immediately
    expect(screen.getByText('Stage 1')).toBeInTheDocument();
    
    // Assert - updates to DB state
    await waitFor(() => {
      expect(screen.getByText('Stage 2')).toBeInTheDocument();
    });
  });
  
  it('handles database errors gracefully', async () => {
    // Arrange
    mockLoadPlanningState.mockRejectedValue(new Error('DB down'));
    localStorage.setItem('planning-machine-test', JSON.stringify(step1Snapshot));
    
    // Act
    render(<PlanningMachineProvider input={{ projectId: 'test' }} />);
    
    // Assert - falls back to cache
    expect(screen.getByText('Stage 1')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
describe('Seed workflow', () => {
  it('seed script + page load shows correct state', async () => {
    // Arrange - seed Step 2 project
    const { projectId } = await fetch('/api/dev/seed', {
      method: 'POST',
      body: JSON.stringify({ step: 2 })
    }).then(r => r.json());
    
    // Act - navigate without manual localStorage setup
    await page.goto(`http://localhost:5180/project/${projectId}/build?workflowChat=1`);
    
    // Assert
    await expect(page.locator('text=stage 02 of 10')).toBeVisible();
    await expect(page.locator('text=Business Requirements')).toBeVisible();
    
    // Assert - Debug panel matches
    await expect(page.locator('text=Current Step Number: 2')).toBeVisible();
  });
});
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('loads within 500ms with warm cache', async () => {
    const start = Date.now();
    render(<PlanningMachineProvider input={{ projectId: 'test' }} />);
    await waitFor(() => expect(screen.getByText('Stage 2')).toBeInTheDocument());
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
  
  it('shows cached state within 100ms', () => {
    const start = Date.now();
    render(<PlanningMachineProvider input={{ projectId: 'test' }} />);
    expect(screen.getByText('Stage 1')).toBeInTheDocument(); // From cache
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Migration Path

### Week 1: Core Fix
- [ ] Implement Phase 1 (database-first init)
- [ ] Add RESTORE_SNAPSHOT event
- [ ] Update tests
- [ ] Deploy to staging

### Week 2: Enhancements
- [ ] Implement Phase 2 (optimistic updates)
- [ ] Add conflict resolution
- [ ] Add observability

### Week 3: Real-Time Sync
- [ ] Implement Phase 3 (WebSocket/polling)
- [ ] Test cross-device sync
- [ ] Load testing

### Week 4: Polish & Deploy
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production rollout

---

## Cost-Benefit Analysis

### Current State (Keep as-is)
- **Cost:** $0 engineering time
- **Benefit:** None
- **Risk:** High (data inconsistency, poor UX, production incidents)

### Option 1 (Seed API Fix)
- **Cost:** 1-2 hours
- **Benefit:** Fixes seed script only
- **Risk:** Medium (doesn't address root cause)

### Option 2+ (Recommended)
- **Cost:** 4-6 hours initial, 2-3 hours enhancements
- **Benefit:** Fixes root cause + improves architecture
- **Risk:** Low (incremental migration, well-tested patterns)

### Option 3 (SSR)
- **Cost:** 6-8 hours (includes fixing BUG-018)
- **Benefit:** Best long-term solution
- **Risk:** Medium (requires SSR re-architecture)

---

## Conclusion

**Recommended:** Implement **Option 2+ (Enhanced Async Initialization)** in two phases:

1. **Phase 1 (Immediate):** Database-first init with optimistic cache (4-6 hours)
2. **Phase 2 (Follow-up):** Optimistic updates + real-time sync (2-3 hours)

This provides:
- ✅ Enterprise-grade solution
- ✅ Fixes root cause (database as single source of truth)
- ✅ Good UX (optimistic rendering, no loading screens)
- ✅ Graceful degradation (offline support)
- ✅ Incremental migration (can ship Phase 1 independently)
- ✅ Foundation for future enhancements (real-time, conflict resolution)

**ROI:** 6-9 hours investment eliminates an entire class of state consistency bugs and positions the architecture for scale.

---

## Next Steps

1. **Review this document** with team
2. **Get approval** for recommended approach
3. **Create implementation tasks** in GitHub
4. **Assign engineer** to Phase 1
5. **Schedule deployment** to staging → production

**Questions?** See investigation docs:
- `.tmp-docs/bug-root-cause-analysis.md` - Root cause
- `.tmp-docs/workflow-chat-quick-assessment-findings.md` - Bug discovery
- GitHub Issue [#15](https://github.com/validkeys/sherpy-ui/issues/15) - Tracking
