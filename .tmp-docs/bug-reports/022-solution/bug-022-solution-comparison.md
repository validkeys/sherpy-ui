# BUG-022: Solution Comparison

**Date**: 2026-06-01

---

## Two Approaches Analyzed

### ❌ Approach 1: Patch the Gap (Original Proposal)

**What**: Add database persistence to actor subscription (keep server function persistence too)

**Architecture**:
```
USER ACTION → Server Function → savePlanningState() → Database ✅
INTERNAL TRANSITION → Actor Subscription → savePlanningState() → Database ✅
```

**Pros**:
- ✅ Quick fix (1 day)
- ✅ Stops immediate data loss
- ✅ Minimal code changes

**Cons**:
- ❌ TWO ways to persist state (duplication)
- ❌ Race conditions (both paths write to same DB)
- ❌ Duplicate writes (same state saved twice)
- ❌ Complex debugging (which path caused the issue?)
- ❌ Harder to add features (retry logic in two places)
- ❌ Not enterprise-grade (band-aid solution)

**Verdict**: **Tactical fix, not strategic solution**

---

### ✅ Approach 2: Single Persistence Layer (Revised Proposal)

**What**: Consolidate ALL persistence into actor subscription (remove from server functions)

**Architecture**:
```
ANY STATE CHANGE → Actor Subscription → StatePersistence Layer → localStorage + Database
```

**Pros**:
- ✅ ONE way to persist (single source of truth)
- ✅ No race conditions (single writer)
- ✅ No duplicate writes (efficient)
- ✅ Simple debugging (one code path)
- ✅ Easy to extend (add features in one place)
- ✅ Proper separation of concerns
- ✅ True enterprise architecture

**Cons**:
- ⚠️ Slightly longer implementation (2-3 days vs 1 day)
- ⚠️ Requires refactoring server functions
- ⚠️ Requires more comprehensive testing

**Verdict**: **Strategic solution, worth the extra effort**

---

## Key Architectural Principle

### The Real Problem

**We don't have a "missing persistence" problem.**

**We have a "two ways of persisting" problem.**

Adding a second path to cover the gap makes it worse, not better.

---

## Decision Matrix

| Criteria | Approach 1 (Patch) | Approach 2 (Consolidate) |
|----------|-------------------|--------------------------|
| **Stops data loss** | ✅ Yes | ✅ Yes |
| **Implementation time** | 1 day | 2-3 days |
| **Code complexity** | Increases (+100 lines) | Decreases (-150 lines) |
| **Maintainability** | Worse (two paths) | Better (one path) |
| **Testing burden** | Higher (two paths) | Lower (one path) |
| **Future extensibility** | Hard (change 2 places) | Easy (change 1 place) |
| **Risk of regressions** | Medium (race conditions) | Low (single writer) |
| **Enterprise-grade** | ❌ No | ✅ Yes |

---

## Recommendation

**Implement Approach 2: Single Persistence Layer**

### Why

1. **"Single way of doing things"** - Enterprise architecture principle
2. **Lower long-term complexity** - Easier to maintain
3. **Better performance** - No duplicate writes
4. **Easier to extend** - Add retry/offline/conflict resolution in one place
5. **Pays for itself** - The 2-day investment saves weeks of debugging dual paths

### Implementation Plan

```
Day 1: Create StatePersistence class
  - Implement unified persistence
  - Add debouncing
  - Wire into Context Provider
  - Keep server function persistence (redundant but safe)
  
Day 2: Comprehensive testing
  - Unit tests for StatePersistence
  - Integration tests
  - E2E tests (Phase 9 with refresh)
  - Deploy to staging
  
Day 3: Remove redundant persistence
  - Remove persistence from server functions
  - Server functions become pure domain logic
  - Final testing
  - Deploy to production
```

---

## What Changes

### Files Created
- `src/features/planning/infrastructure/persistence.ts` (180 lines)
- `src/features/planning/infrastructure/persistence.test.ts` (120 lines)

### Files Modified
- `src/features/planning/machines/PlanningMachineContext.tsx` (-50 lines)
- `src/features/planning/infrastructure/server-functions.ts` (-155 lines)

### Net Result
- **-105 lines of code** (simpler codebase)
- **ONE persistence path** (vs TWO currently)
- **Zero data loss** (bug fixed)
- **Enterprise-grade** (single responsibility, clear ownership)

---

## Migration Risk Assessment

### Low Risk
- ✅ Backward compatible (no breaking changes)
- ✅ Gradual migration (keep dual persistence temporarily)
- ✅ Comprehensive testing before removing old path
- ✅ Rollback plan (revert to old code if issues)

### Mitigation
1. Phase 1: Add new persistence (keep old) - SAFE
2. Monitor for 48 hours - VALIDATE
3. Phase 2: Remove old persistence - CLEANUP
4. Monitor for 24 hours - CONFIRM

---

## Long-term Vision

With single persistence layer in place, we can easily add:

1. **Retry logic** - Add to `StatePersistence.persistAllToDatabase()`
2. **Offline queue** - Add to `StatePersistence.debouncedPersistToDatabase()`
3. **Conflict resolution** - Add to `StatePersistence.persist()`
4. **Metrics/tracing** - Add to `StatePersistence` constructor
5. **Circuit breaker** - Add to `StatePersistence.persistAllToDatabase()`

**All in ONE place. ONE time. ONE way.**

With dual paths, we'd implement each feature TWICE (in server functions AND in subscription).

---

## Conclusion

**Original proposal was tactical (patch the gap).**

**Revised proposal is strategic (consolidate persistence).**

The revised approach:
- Takes 2 days instead of 1 day
- Reduces code by 105 lines
- Eliminates architectural duplication
- Enables easy future enhancements
- Follows enterprise "single way" principle

**Recommendation: Implement Approach 2 (Single Persistence Layer)**

The extra day of work pays for itself in:
- Simpler codebase
- Easier maintenance
- Better performance
- Future extensibility
- True enterprise architecture
