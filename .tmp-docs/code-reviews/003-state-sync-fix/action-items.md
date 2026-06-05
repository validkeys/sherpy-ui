# Action Items: State Sync Fix Implementation

**Date:** 2026-05-29  
**Review Status:** ✅ Approved with fixes  
**Next Step:** Address critical issue, then implement Phase 1

---

## Critical (Must Do Before Coding) ⚠️

### 1. Fix RESTORE_SNAPSHOT Merge Logic

**Priority:** P0 - BLOCKING  
**Time Estimate:** 10 minutes  
**Assignee:** Phase 1 Engineer

**Current Code (Incorrect):**
```typescript
RESTORE_SNAPSHOT: {
  actions: assign((context, event) => ({
    ...context,      // Local state
    ...dbContext,    // DB overwrites everything ← LOSES LOCAL CHANGES
    updatedAt: /* timestamp comparison */
  })),
}
```

**Fixed Code (Correct):**
```typescript
RESTORE_SNAPSHOT: {
  actions: assign((context, event) => {
    const dbContext = event.snapshot.context;
    
    const localTime = new Date(context.updatedAt).getTime();
    const dbTime = new Date(dbContext.updatedAt).getTime();
    
    // If local is newer, keep local (optimistic updates)
    if (localTime > dbTime) {
      console.log('[RESTORE_SNAPSHOT] Keeping local (newer)');
      return context; // No-op
    }
    
    // If DB is newer, apply DB snapshot
    console.log('[RESTORE_SNAPSHOT] Applying DB (newer)');
    return dbContext;
  }),
}
```

**Test Coverage Required:**
```typescript
describe('RESTORE_SNAPSHOT', () => {
  it('keeps local changes when local is newer', () => { ... });
  it('accepts DB changes when DB is newer', () => { ... });
  it('handles equal timestamps gracefully', () => { ... });
});
```

**Location:** `src/features/planning/machines/planningMachine.ts`  
**Reference:** Review document, Major Issue #1

---

## Phase 1 Improvements (Should Do) ⚠️

### 2. Tune React Query Configuration

**Priority:** P1  
**Time Estimate:** 2 minutes  
**Assignee:** Phase 1 Engineer

**Change:**
```typescript
// Before
staleTime: 5000,   // Too aggressive
gcTime: 30000,

// After
staleTime: 30000,          // 30 seconds (reduce DB calls)
gcTime: 5 * 60 * 1000,     // 5 minutes (better offline)
refetchOnMount: false,     // Don't refetch if fresh
```

**Location:** `src/features/planning/machines/PlanningMachineContext.tsx`  
**Reference:** Review document, Minor Issue #2

---

### 3. Fix Loading State Condition

**Priority:** P1  
**Time Estimate:** 1 minute  
**Assignee:** Phase 1 Engineer

**Change:**
```typescript
// Before
if (isLoading && !cachedSnapshot) {
  return <LoadingSpinner />;
}

// After
if (!authoritativeSnapshot && isLoading) {
  return <LoadingSpinner />;
}
```

**Location:** `src/features/planning/machines/PlanningMachineContext.tsx`  
**Reference:** Review document, Minor Issue #3

---

### 4. Add React Error Boundary

**Priority:** P1  
**Time Estimate:** 15 minutes  
**Assignee:** Phase 1 Engineer

**Tasks:**
1. Create `src/features/planning/components/PlanningErrorBoundary.tsx`
2. Wrap `<PlanningMachineProvider>` in route with error boundary
3. Handle both DB errors and React render errors

**Reference:** Review document, Minor Issue #4

---

### 5. Improve snapshotsEqual Function

**Priority:** P1  
**Time Estimate:** 5 minutes  
**Assignee:** Phase 1 Engineer

**Change:**
```typescript
// Before (shallow comparison)
function snapshotsEqual(a: SnapshotType, b: any): boolean {
  return (
    a.context.updatedAt === b.context?.updatedAt &&
    a.context.currentStepNumber === b.context?.currentStepNumber &&
    a.value === b.value
  );
}

// After (deep comparison)
import { isEqual } from 'lodash-es';

function snapshotsEqual(a: SnapshotType, b: any): boolean {
  if (!a || !b) return false;
  
  // Quick check: same timestamp = same snapshot
  if (a.context.updatedAt === b.context?.updatedAt) {
    return true;
  }
  
  // Deep comparison of context
  return isEqual(a.context, b.context);
}
```

**Location:** `src/features/planning/machines/PlanningMachineContext.tsx`  
**Reference:** Review document, Minor Issue #5

---

### 6. Add Hot-Reload Prevention Test

**Priority:** P1  
**Time Estimate:** 5 minutes  
**Assignee:** Phase 1 Engineer

**Test:**
```typescript
it('does not hot-reload when snapshots are equal', async () => {
  // Setup: Cache and DB have identical snapshots
  const snapshot = createStep2Snapshot();
  localStorage.setItem('planning-machine-test', JSON.stringify(snapshot));
  mockLoadPlanningState.mockResolvedValue(snapshot);
  
  const sendSpy = vi.spyOn(actor, 'send');
  
  render(<PlanningMachineProvider ... />);
  
  await waitFor(() => {
    expect(mockLoadPlanningState).toHaveBeenCalled();
  });
  
  // RESTORE_SNAPSHOT should NOT be called
  expect(sendSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: 'RESTORE_SNAPSHOT' })
  );
});
```

**Location:** `src/features/planning/machines/PlanningMachineContext.test.tsx`  
**Reference:** Review document, Testing section

---

## Phase 1 Total Effort

**Critical (P0):** 10 minutes  
**Improvements (P1):** 28 minutes  
**Total:** ~38 minutes of targeted fixes

**Benefit:** Prevents data loss + improves stability

---

## Phase 2 Enhancements (Nice to Have) ℹ️

### 7. Add Feature Flag

**Priority:** P2  
**Time Estimate:** 10 minutes  
**Assignee:** DevOps + Phase 1 Engineer

**Implementation:**
```typescript
// server/config.ts
export const FEATURE_FLAGS = {
  DATABASE_FIRST_INIT: process.env.FEATURE_DATABASE_FIRST_INIT === 'true',
};

// PlanningMachineContext.tsx
if (!FEATURE_FLAGS.DATABASE_FIRST_INIT) {
  return <OldPlanningMachineProvider {...props} />;
}
return <NewPlanningMachineProvider {...props} />;
```

**Benefit:** Instant rollback without code deploy

---

### 8. Add Structured Logging

**Priority:** P2  
**Time Estimate:** 15 minutes  
**Assignee:** Phase 2 Engineer

**Tasks:**
1. Create `src/features/planning/infrastructure/metrics.ts`
2. Replace console.log with structured logging
3. Add environment check (verbose in dev, errors-only in prod)

**Reference:** Review document, Trivial Issue #6

---

### 9. Create ADR Document

**Priority:** P2  
**Time Estimate:** 10 minutes  
**Assignee:** Tech Lead

**File:** `docs/architecture/decisions/003-database-first-state-sync.md`

**Template:**
```markdown
# ADR-003: Database-First State Synchronization

## Status: Implemented

## Context
localStorage-first init caused state desync when cache was stale.

## Decision
Implement database-first init with React Query + hot-reload.

## Consequences
Positive:
- Database as single source of truth
- Fixes cross-device sync
- Enables real-time collaboration

Negative:
- Slightly more complex
- Requires RESTORE_SNAPSHOT event
```

---

## Pre-Implementation Checklist

- [ ] **Critical Issue #1 fixed** (RESTORE_SNAPSHOT merge logic) ⚠️
- [ ] Engineer assigned to Phase 1 (Issue #16)
- [ ] Engineer has read implementation plan
- [ ] Engineer has read review document
- [ ] QA has reviewed test plan
- [ ] DevOps has reviewed deployment strategy
- [ ] Baseline test run complete (`pnpm test src/features/planning`)
- [ ] Git branch created (`feature/state-sync-fix-phase1`)

---

## Phase 1 Implementation Checklist

### Week 1: Core Fix (4-6 hours)

**Monday (3.5 hours)**
- [ ] Task 1.1: Add RESTORE_SNAPSHOT event (30min)
  - [ ] Implement event handler with correct merge logic ⚠️
  - [ ] Add unit tests (3 scenarios)
  - [ ] TypeScript compiles
- [ ] Task 1.2: Refactor PlanningMachineContext (2-3h)
  - [ ] Add React Query useQuery hook
  - [ ] Implement optimistic cache read
  - [ ] Implement hot-reload effect
  - [ ] Add loading state (only if no cache)
  - [ ] Add error boundary
  - [ ] Apply all P1 improvements ⚠️

**Tuesday (1 hour)**
- [ ] Task 1.3: Update documentation (30min)
  - [ ] Update `docs/planning/003-workflow-chat-integration/plan.md`
  - [ ] Mark Issue #15 as "In Progress"
  - [ ] Update CLAUDE.md if needed
- [ ] Task 1.4: Integration testing (30min)
  - [ ] Create integration test file
  - [ ] Test seed workflow
  - [ ] Test cross-device sync

**Wednesday (1 hour)**
- [ ] Task 1.5: Manual QA (30min)
  - [ ] Seed script happy path
  - [ ] Seed script with WorkflowChat
  - [ ] Fresh project creation
  - [ ] Page refresh persistence
  - [ ] Offline behavior
  - [ ] Error recovery
- [ ] Code review preparation (30min)
  - [ ] Self-review checklist
  - [ ] Run full test suite
  - [ ] Check for console errors

**Thursday (1 hour)**
- [ ] Code review
  - [ ] Request 2 reviewers
  - [ ] Address feedback
  - [ ] Final test run

**Friday (0.5 hours)**
- [ ] Deploy to staging
  - [ ] Run deployment script
  - [ ] Validate on staging
  - [ ] Monitor logs for 30 minutes

---

## Phase 2 Implementation Checklist

### Week 2: Enhancements (2-3 hours)

**Monday (2 hours)**
- [ ] Task 2.1: Optimistic mutations (1-2h)
  - [ ] Create `infrastructure/mutations.ts`
  - [ ] Implement useSubmitAnswerMutation
  - [ ] Implement useSubmitFormMutation
  - [ ] Add rollback logic
  - [ ] Test happy path + error cases

**Tuesday (1 hour)**
- [ ] Task 2.2: Real-time sync (1h)
  - [ ] Implement short polling (5s interval)
  - [ ] Add adaptive polling (optional)
  - [ ] Test cross-device updates

**Tuesday (0.5 hours)**
- [ ] Task 2.3: Observability (30min)
  - [ ] Create `infrastructure/metrics.ts`
  - [ ] Track cache hit rate
  - [ ] Track sync latency
  - [ ] Track error rate

**Wednesday (1 hour)**
- [ ] Testing & QA
  - [ ] Run full test suite
  - [ ] Manual QA of Phase 2 features
  - [ ] Performance testing

**Thursday (0.5 hours)**
- [ ] Deploy to staging
  - [ ] Validate Phase 2 features
  - [ ] Check metrics dashboard

**Friday (0.5 hours)**
- [ ] Deploy to production
  - [ ] Canary release (10% traffic)
  - [ ] Monitor for 1 hour
  - [ ] Promote to 100%

---

## Post-Deployment Checklist

**24 Hours After Production Deploy:**
- [ ] Error rate < 0.1%
- [ ] Cache hit rate > 80%
- [ ] Sync latency p99 < 500ms
- [ ] Zero state consistency bugs reported
- [ ] Issue #15 closed
- [ ] GitHub Issues #16 and #17 closed
- [ ] Update team documentation
- [ ] Share learnings in team meeting

---

## Rollback Triggers

**Automatic Rollback If:**
- Error rate > 1% for 5 minutes
- Sync latency p99 > 2 seconds for 5 minutes
- Cache hit rate < 50% for 30 minutes

**Manual Rollback:**
```bash
# Option 1: Feature flag (instant)
heroku config:set FEATURE_DATABASE_FIRST_INIT=false

# Option 2: Git revert (5 minutes)
git revert <commit-sha>
git push origin main
pnpm deploy:production
```

---

## Questions?

**Technical Questions:**
- Implementation plan: `.tmp-docs/implementation-plan-state-sync-fix.md`
- Full review: `.tmp-docs/code-reviews/003-state-sync-fix/review.md`

**Project Management:**
- GitHub Issue #15 (bug tracking)
- GitHub Issue #16 (Phase 1 tasks)
- GitHub Issue #17 (Phase 2 tasks)

**Blockers?**
- Escalate to tech lead immediately
- Consider rollback if blocked > 24 hours

---

**Last Updated:** 2026-05-29  
**Status:** Ready to implement (after fixing Critical Issue #1)  
**Owner:** Engineering team
