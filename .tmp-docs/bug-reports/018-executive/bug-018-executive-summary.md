# BUG-018: Executive Summary

**Issue**: #13 - SSR Hydration mismatch causes page to display Step 1 when at Step 3  
**Severity**: Medium  
**Branch**: `fix/bug-018-ssr-hydration-mismatch`  
**Status**: Diagnosed, awaiting approval  

---

## The Problem in 60 Seconds

When a user refreshes the page mid-workflow (e.g., at Step 3), the page briefly shows Step 1 before crashing with a React hydration error. This happens because:

1. **Server renders** default state (Step 1) - localStorage isn't available during SSR
2. **Client hydrates** with restored state from localStorage (Step 3)
3. **React sees mismatch** between server HTML ("Step 1") and client state ("Step 3")
4. **React throws error** and reverts to server state, breaking the workflow

**Impact**: Users lose their place in the workflow after a page refresh.

---

## Root Cause

```
The fundamental issue is timing:
- SSR happens FIRST with default state
- State restoration happens SECOND from localStorage
- React requires them to match EXACTLY
```

Current architecture prioritizes avoiding loading states (BUG-013 fix) but this creates an impossible constraint for SSR: we can't restore state synchronously on the server because localStorage doesn't exist server-side.

---

## Proposed Solution ⭐

**Option 1: Deferred Hydration (RECOMMENDED)**

**What**: Show a brief loading indicator while state restores, ensuring server and client both render the same "loading" content.

**Changes**:
```typescript
// During hydration: render loading state
if (isHydrating) {
  return <LoadingPlaceholder />;
}

// After hydration: render actual content
return <StepContainer />;
```

**Impact**:
- ✅ Fixes the bug completely
- ✅ 100-200ms loading flash on refresh
- ✅ ~50 lines of code
- ✅ 2-3 hours implementation time
- ✅ LOW risk

---

## Alternative Solutions

### Option 2: Server-Side State Restoration
Load state from database during SSR so server and client render the same content.

**Pros**: Perfect match, no loading flash  
**Cons**: Database query on EVERY page load, higher complexity, MEDIUM risk  
**Timeline**: 1-2 days  

### Option 4: Client-Only Rendering
Disable SSR for the planning workflow entirely.

**Pros**: Simplest fix (1 line change), LOW risk  
**Cons**: Slower first paint (200-500ms blank page)  
**Timeline**: 5 minutes  

### Option 3: Suppress Warnings ❌
**DO NOT USE** - Hides the error without fixing the bug, creates technical debt.

---

## Decision Criteria

| Priority | Option 1 | Option 2 | Option 4 |
|----------|----------|----------|----------|
| **Time to Fix** | ✅ 2-3 hours | ⚠️ 1-2 days | ✅ 5 minutes |
| **Risk Level** | ✅ LOW | ⚠️ MEDIUM | ✅ LOW |
| **Code Changes** | ✅ 50 lines | ⚠️ 100 lines | ✅ 1 line |
| **Performance** | ✅ Good | ✅ Best | ⚠️ Fair |
| **User Experience** | ✅ Clear | ✅ Perfect | ⚠️ Slower |
| **Maintenance** | ✅ Simple | ⚠️ Complex | ✅ Simple |
| **Scalability** | ✅ Excellent | ⚠️ DB load | ✅ Excellent |

---

## Recommendation

**Implement Option 1: Deferred Hydration**

**Rationale**:
1. **Fastest to market**: 2-3 hours vs 1-2 days
2. **Lowest risk**: Isolated change, easy to test
3. **Best maintainability**: Clear code, easy to understand
4. **Good UX**: Brief loading indicator is honest and expected
5. **Future-proof**: Can upgrade to Option 2 later if needed

**Tradeoff**: 100-200ms loading flash on page refresh  
**Acceptable?**: YES - page refreshes are rare in normal workflow, and users expect loading states after browser actions.

---

## Implementation Plan

### Phase 1: Core Fix (2 hours)
1. Add `isHydrating` state to `PlanningMachineContext.tsx`
2. Create `LoadingPlaceholder.tsx` component
3. Update component to render loading state during hydration

### Phase 2: Validation (1 hour)
1. Manual testing with page refresh at multiple steps
2. E2E testing: resume Test Run #017 scenario
3. Browser back/forward testing

### Phase 3: Documentation (30 minutes)
1. Update `CLAUDE.md` with fix details
2. Update `docs/e2e-testing/learnings.md`
3. Close GitHub issue #13

**Total Time**: 3.5 hours

---

## Success Metrics

**After implementation, verify**:
- [ ] Page refresh at Step 3 shows Step 3 (not Step 1)
- [ ] No React hydration errors in console
- [ ] Loading indicator displays briefly (<200ms)
- [ ] Browser back/forward navigation works
- [ ] All existing tests pass
- [ ] E2E Test Run #017 can be completed

---

## Questions for Approval

1. **Is a 100-200ms loading indicator acceptable on page refresh?**  
   _Context: This is an honest UX that sets user expectations_

2. **Do we need SEO for the authenticated planning workflow?**  
   _If yes, consider Option 2 instead_

3. **What's the priority: speed to fix or perfect UX?**  
   - Speed → Option 1 (2-3 hours, good UX)
   - Perfect → Option 2 (1-2 days, perfect UX)
   - Minimum → Option 4 (5 minutes, acceptable UX)

4. **Preferred testing approach?**
   - Manual + integration tests (1 hour)
   - Full E2E test suite rerun (3-4 hours)

---

## Risk Assessment

### Technical Risks: **LOW**
- Isolated change to single context provider
- Well-understood React patterns (useState + useEffect)
- Existing tests validate state restoration logic
- Easy to rollback (single PR revert)

### Product Risks: **LOW**
- Loading flash only on page refresh (rare in normal use)
- Clear UX improvement over current broken state
- No impact on normal navigation flow

### Schedule Risks: **LOW**
- 3.5 hour implementation + testing
- Can complete within single work session
- No dependencies on other teams

---

## Documentation Reference

**Full Analysis**:
- `.tmp-docs/bug-018-diagnosis.md` - Complete technical analysis (30 pages)
- `.tmp-docs/bug-018-solution-comparison.md` - Visual comparison of all options (15 pages)

**Bug Report**: GitHub Issue #13

**Test Data**: `docs/e2e-testing/runs/017/`

**Related Fixes**: BUG-013 (StrictMode), BUG-011 (snapshot restoration)

---

## Approval Request

**Requesting approval to proceed with Option 1: Deferred Hydration**

**Estimated completion**: Same day (3.5 hours from approval)

**Rollback plan**: Single PR revert

**Testing plan**: Manual + integration + e2e tests

---

**Prepared by**: Claude AI  
**Date**: 2026-05-20  
**Branch Ready**: `fix/bug-018-ssr-hydration-mismatch`  

**Approved by**: _________________  
**Date**: _________________  
**Decision**: [ ] Proceed with Option 1  [ ] Use Option 2  [ ] Use Option 4  [ ] Need more info  
