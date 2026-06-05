# BUG-022 Phase 3: READY TO COMMIT

## Status: ✅ TESTS PASSING - READY FOR E2E VERIFICATION

**Date:** 2026-06-02  
**Branch:** main (local, unpushed)

---

## Summary

Fixed state reversion bug where page refresh caused workflow to jump from Step 7 → Step 1 within 45ms.

**Root Cause:** Actor was being recreated when database snapshot arrived, discarding the correctly-restored actor from cache.

**Fix:** Use `useRef` to capture initial snapshot and only recreate actor when `projectId` changes. Database updates handled via `RESTORE_SNAPSHOT` event instead of actor recreation.

---

## Test Results

```
✅ 43/43  Planning machine tests
✅  4/4   BUG-022 regression tests  
✅  6/6   Persistence tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 53/53  TOTAL PASSING
```

---

## Files Changed

### Modified
- `src/features/planning/machines/PlanningMachineContext.tsx` (lines 149-219)
  - Added `useRef` for initial snapshot capture
  - Changed useMemo dependency from `[authoritativeSnapshot, input]` to `[input.projectId]`
  - Removed `input` parameter from `createActor()` when restoring from snapshot
  - Added comprehensive logging for debugging

### Added
- `src/features/planning/machines/__tests__/bug-022-snapshot-restoration.test.ts`
  - 4 regression tests covering snapshot restoration scenarios

### Documentation
- `.tmp-docs/bug-022-phase3-fix-complete.md` - Full analysis
- `.tmp-docs/bug-022-actual-fix-summary.md` - Quick summary
- `.tmp-docs/bug-022-before-after-diagram.md` - Visual explanation
- `.tmp-docs/bug-022-snapshot-restoration-diagnosis.md` - Investigation process

---

## Commit Message

```
fix(planning): prevent actor recreation on database snapshot arrival (BUG-022 Phase 3)

Root cause: Actor's useMemo had authoritativeSnapshot as dependency,
causing actor to be recreated when database snapshot arrived, discarding
the correctly-restored actor from cache and replacing it with stale data.

Fix: Use useRef to capture initial snapshot and only recreate actor when
projectId changes. Database updates handled via RESTORE_SNAPSHOT event
(hot-reload), not actor recreation.

Result: Page refresh now correctly preserves workflow state at Step 7
instead of reverting to Step 1.

Changes:
- PlanningMachineContext: useRef for initial snapshot (line 177)
- PlanningMachineContext: useMemo dependency changed to [input.projectId] (line 219)
- PlanningMachineContext: removed input from createActor when restoring (line 192)
- Added regression tests: bug-022-snapshot-restoration.test.ts (4 tests)

Tests: 43 machine + 4 regression + 6 persistence = 53 passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Pre-Commit Checklist

- [x] All tests passing (53/53)
- [x] TypeScript compiles without errors
- [x] Code follows project conventions
- [x] Comprehensive logging added for debugging
- [x] Regression tests added to prevent future breaks
- [x] Documentation complete
- [ ] **E2E test passed** (manual verification needed)

---

## E2E Test Instructions

### Setup
```bash
npm run dev
# Open http://localhost:5180 in browser
```

### Test Scenario
1. **Create fresh project**
   - Click "New Project" or navigate to `/project/<id>/build`
   - Complete Step 1 (Gap Analysis form)

2. **Progress to Step 7**
   - Answer all questions in Steps 2-6
   - Wait for artifacts to generate
   - Verify you reach Step 7 (Architecture Decisions)

3. **Verify Current State**
   - Check DebugPanel shows `currentStepNumber: 7`
   - Check URL is at correct step
   - Check progress stepper highlights Step 7

4. **REFRESH PAGE** (F5 or Cmd+R)

5. **Expected Results** ✅
   - Should stay at Step 7
   - DebugPanel should show:
     ```
     [PlanningMachineProvider] Creating actor from snapshot: Step 7
     [PlanningMachineProvider] Actor state after start: Step 7
     ```
   - Should NOT see state revert to Step 1
   - Should NOT see database hot-reload overwriting to Step 1

6. **Negative Test** (What used to happen)
   - Before fix: State reverted to Step 1 within 45ms
   - DebugPanel showed: Step 7 → Step 1 transition
   - User lost all progress

### Debug Commands

```javascript
// In browser console
window.__planningActor?.getSnapshot().context.currentStepNumber
// Should return: 7

localStorage.getItem('planning-machine-state')
// Should show Step 7 snapshot

window.__planningActor?.getSnapshot().value
// Should show: { step7_archDecisions: "reviewing" }
```

---

## Expected Console Logs

### Initial Load (Correct)
```
[PlanningMachineProvider] Using cached snapshot while loading
[PlanningMachineProvider] Creating actor from snapshot: Step 7
[PlanningMachineProvider] Actor state before start: Step 7
[PlanningMachineProvider] Starting actor
[PlanningMachineProvider] Actor state immediately after start: Step 7
```

### Database Arrives (Should NOT recreate actor)
```
[PlanningMachineProvider] Database fetch complete
[PlanningMachineProvider] Database snapshot matches current state
  OR
[RESTORE_SNAPSHOT] Keeping local changes (newer than DB)
```

### What NOT to See ❌
```
[PlanningMachineProvider] Creating actor from snapshot: Step 1
State changed to {"step1_gapAnalysis":"collecting"}
```

---

## Rollback Plan

If E2E test fails:
```bash
git reset --soft HEAD~1  # Undo commit, keep changes
# OR
git revert HEAD  # Create revert commit
```

Phases 1 & 2 changes preserved:
- StatePersistence infrastructure ✅
- Legacy code removed ✅
- Bug still present for investigation

---

## Success Criteria

- [x] Unit tests pass (53/53)
- [x] Code compiles without errors
- [x] Regression tests added
- [ ] **E2E test: Page refresh at Step 7 stays at Step 7**
- [ ] **No console errors during refresh**
- [ ] **Hot-reload still works for legitimate updates**

---

## Commands

### Run Tests
```bash
npm test -- planningMachine.test.ts --run
npm test -- bug-022-snapshot-restoration.test.ts --run
npm test -- persistence.test.ts --run
```

### Commit (After E2E Test Passes)
```bash
git add .
git commit -F .tmp-docs/commit-message.txt
```

### Push (After Manual Verification)
```bash
git push origin main
```

---

## Context for Future Debugging

If this bug reappears, check:

1. **Actor useMemo dependencies**
   - Should be: `[input.projectId]`
   - Should NOT include: `authoritativeSnapshot` or `cachedSnapshot`

2. **Initial snapshot capture**
   - Should use: `useRef(authoritativeSnapshot)`
   - Should NOT recompute on every render

3. **Hot-reload logic**
   - Should send: `RESTORE_SNAPSHOT` event
   - Should NOT: recreate actor

4. **Timestamp comparison**
   - Should preserve: newer local state
   - Should NOT blindly apply: database snapshot

---

## Links

- **Implementation:** `src/features/planning/machines/PlanningMachineContext.tsx`
- **Tests:** `src/features/planning/machines/__tests__/bug-022-snapshot-restoration.test.ts`
- **Full Analysis:** `.tmp-docs/bug-022-phase3-fix-complete.md`
- **Diagram:** `.tmp-docs/bug-022-before-after-diagram.md`

---

## READY TO COMMIT: ✅

**All unit tests passing. Ready for E2E verification.**
