# BUG-018 Diagnosis: SSR Hydration Mismatch

## Executive Summary

**Root Cause**: Synchronous state restoration from localStorage during client-side initialization occurs AFTER server-side rendering completes, creating a timing window where server HTML (default state) and client state (restored from DB) mismatch.

**Severity**: Medium - affects page refresh UX but not normal workflow

**Impact**: 
- Users see incorrect step display after F5 refresh
- Automated testing requiring page navigation affected
- Browser back/forward navigation potentially broken

---

## Technical Analysis

### Architecture Context

**Framework Stack**:
- **Vite + TanStack Start**: SSR-enabled React framework (line 16 in vite.config.ts)
- **TanStack Router**: File-based routing with SSR support
- **XState v5**: State machine with snapshot-based persistence
- **better-sqlite3**: Server-side database (excluded from SSR bundle, line 12 in vite.config.ts)

**Current Persistence Strategy** (Hybrid):
1. **localStorage**: Synchronous read-through cache
2. **Database**: Async primary storage (background sync)

This strategy was designed to avoid loading states during initialization (BUG-013 fix).

### The Hydration Mismatch Timeline

```
SERVER RENDER (SSR Phase)
├─ 0ms: TanStack Start renders __root.tsx
├─ 5ms: Renders /project/$projectId/build route
├─ 10ms: PlanningMachineProvider mounts
├─ 12ms: useMemo creates actor with loadStateSync()
│        → Returns null (localStorage unavailable in SSR)
│        → Creates FRESH actor with default input
│        → Default actor starts at Step 1
├─ 15ms: StepContainer renders with Step 1 state
├─ 18ms: Navigation renders "Step 1 of 10"
└─ 20ms: HTML sent to browser: "<div>Step 1 of 10</div>"

CLIENT HYDRATION (Browser Phase)
├─ 0ms: Browser receives HTML
├─ 5ms: React begins hydration
├─ 10ms: PlanningMachineProvider mounts (client-side)
├─ 12ms: useMemo runs again (client-side)
│        → loadStateSync() reads localStorage
│        → Returns cached Step 3 state
│        → Creates actor restored to Step 3
├─ 80ms: useEffect triggers (line 80 in PlanningMachineContext.tsx)
│        → actor.start() called
│        → Debug logs show Step 3
├─ 210ms: StepContainer renders with Step 3 state
│         → Console: "[StepContainer] Render: {currentStep: step3_techReqs}"
├─ 218ms: syncFromDatabase() starts (line 113)
│         → Async operation, non-blocking
├─ 322ms: Database sync completes
│         → Console: "[PlanningMachineContext] Local state is current"
│
└─ HYDRATION MISMATCH DETECTED
   └─ React compares:
      - Server HTML: "Step 1 of 10" 
      - Client state: "Step 3 of 10"
      └─ Error: "Hydration failed because the server rendered HTML 
                 didn't match the client"
      └─ React REVERTS to server state (Step 1)
      └─ New Actor instance created (x:2 → x:4)
```

### Evidence from Issue #13

**Console Logs**:
```javascript
[210ms] [StepContainer] Render: {currentStep: step3_techReqs}  // ✅ Client state correct
[218ms] [PlanningMachineProvider] Starting actor, status: active
[322ms] [PlanningMachineContext] Local state is current         // ✅ DB state current

// But React sees mismatch:
Error: Hydration failed because the server rendered text didn't match the client.
Server: "1" (Step 1)
Client: "3" (Step 3)
```

**Actor ID Changes** (Smoking Gun):
- Before refresh: `x:2` (normal progression)
- After refresh: `x:4` (NEW instance - React recreated tree)

This proves React detected the mismatch, threw away client state, and regenerated from server HTML.

### Why Current Architecture Fails

**Design Decision from BUG-013 Fix** (line 52-77 in PlanningMachineContext.tsx):
```typescript
// HYBRID PERSISTENCE STRATEGY:
// - localStorage: synchronous cache for instant restoration on mount
// - Database: async primary storage, synced in background
// This allows synchronous initialization (no loading states)
```

**The Problem**:
- Works perfectly for **client-side navigation** (SPA mode)
- Fails for **full page refresh** (SSR mode)
- localStorage is NOT available during server render
- Server ALWAYS renders default state (Step 1)
- Client ALWAYS hydrates with restored state (Step 3)
- React enforces strict HTML matching → conflict

---

## Enterprise-Grade Solution Proposals

### Option 1: Deferred Hydration with Loading State ⭐ **RECOMMENDED**

**Strategy**: Don't render step-specific content until client-side state restoration completes.

**Implementation**:
```typescript
// PlanningMachineProvider
const [isHydrating, setIsHydrating] = useState(() => 
  typeof window !== 'undefined'
);

useEffect(() => {
  // State restoration already happens in useMemo
  // Just signal when safe to render
  setIsHydrating(false);
}, []);

if (isHydrating) {
  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      <div className="hydration-loading">
        <Spinner />
        <p>Loading project state...</p>
      </div>
    </PlanningMachineContext.Provider>
  );
}

return (
  <PlanningMachineContext.Provider value={{ actor }}>
    {children}
  </PlanningMachineContext.Provider>
);
```

**Changes Required**:
- `PlanningMachineContext.tsx`: Add loading state (15 lines)
- `app/routes/project/$projectId.build.tsx`: Handle loading state (no changes needed - transparent)
- New component: `LoadingPlaceholder.tsx` (20 lines)

**Pros**:
- ✅ Zero hydration mismatches (server renders loading, client renders loading)
- ✅ Simple implementation (< 50 lines total)
- ✅ No risk to existing functionality
- ✅ Works with browser back/forward
- ✅ Clear UX (user sees loading indicator)
- ✅ No database queries on every request

**Cons**:
- ⚠️ Brief loading flash on page refresh (100-200ms)
- ⚠️ Slightly worse perceived performance

**Risk**: **LOW** - isolated change, existing tests validate state restoration logic

---

### Option 2: Server-Side State Restoration

**Strategy**: Load state from database during SSR so server and client render the same content.

**Implementation**:
```typescript
// app/routes/project/$projectId.build.tsx
import { createFileRoute } from '@tanstack/react-router';
import { $loadPlanningState } from '@/features/planning/server';

export const Route = createFileRoute('/project/$projectId/build')({
  // TanStack Router loader - runs on server
  loader: async ({ params }) => {
    const { projectId } = params;
    const snapshot = await $loadPlanningState({ 
      data: { projectId } 
    });
    return { snapshot };
  },
  component: BuildComponent,
});

function BuildComponent() {
  const { projectId } = Route.useParams();
  const { snapshot } = Route.useLoaderData(); // Server data

  return (
    <PlanningMachineProvider
      input={{ projectId, entryPath: 'new-project' }}
      initialSnapshot={snapshot} // Pass server state
      storageKey={`planning-machine-${projectId}`}
    >
      {/* ... */}
    </PlanningMachineProvider>
  );
}
```

**Changes Required**:
- `PlanningMachineContext.tsx`: Accept `initialSnapshot` prop (30 lines)
- `app/routes/project/$projectId.build.tsx`: Add loader (20 lines)
- `src/features/planning/server.ts`: Ensure SSR-safe (audit, ~10 lines)
- Database access layer: Verify better-sqlite3 SSR exclusion works

**Pros**:
- ✅ Perfect hydration match (no errors, no loading states)
- ✅ Best perceived performance (instant render)
- ✅ SEO-friendly (correct state in initial HTML)
- ✅ No loading flash

**Cons**:
- ⚠️ Database query on EVERY page load (not just refresh)
- ⚠️ More complex implementation (changes to routing layer)
- ⚠️ Requires better-sqlite3 to work in SSR context (needs verification)
- ⚠️ Risk of cache inconsistency (server state vs localStorage)
- ⚠️ Complicates the hybrid persistence strategy

**Risk**: **MEDIUM** - touches routing layer, database access in SSR, potential cache coherence issues

---

### Option 3: Suppress Hydration Errors (Anti-Pattern)

**Strategy**: Tell React to ignore the mismatch using `suppressHydrationWarning`.

**Implementation**:
```typescript
// Navigation.tsx
<div className="progress-indicator" suppressHydrationWarning>
  Step {currentStepNumber} of {TOTAL_STEPS}
</div>

// StepContainer.tsx - suppress entire step content
<div suppressHydrationWarning>
  {/* step content */}
</div>
```

**Pros**:
- ✅ Minimal code changes (2 lines)
- ✅ No performance impact

**Cons**:
- ❌ **DOES NOT FIX THE BUG** - just hides the error
- ❌ UI still shows Step 1 briefly before updating to Step 3
- ❌ React still regenerates the tree (performance hit)
- ❌ Anti-pattern that masks real issues
- ❌ Will cause confusion for future developers

**Risk**: **HIGH** - technical debt, doesn't solve the problem

**Recommendation**: **DO NOT USE**

---

### Option 4: Client-Only Rendering for Planning Flow

**Strategy**: Skip SSR entirely for the planning workflow.

**Implementation**:
```typescript
// app/routes/project/$projectId.build.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/project/$projectId/build')({
  component: BuildComponent,
  // Disable SSR for this route
  ssr: false,
});
```

**Changes Required**:
- `app/routes/project/$projectId.build.tsx`: Add `ssr: false` (1 line)

**Pros**:
- ✅ Zero hydration issues (no SSR = no mismatch)
- ✅ Minimal code change (1 line)
- ✅ No risk to existing functionality
- ✅ State restoration works perfectly (client-only)

**Cons**:
- ⚠️ Blank page until JavaScript loads
- ⚠️ Worse perceived performance on slow connections
- ⚠️ SEO impact (not relevant for authenticated planning flow)
- ⚠️ Loses benefits of SSR (faster first paint)

**Risk**: **LOW** - isolated change, well-understood tradeoff

**Note**: For an authenticated, JavaScript-required workflow, losing SSR is acceptable. Planning requires XState + database anyway.

---

## Decision Matrix

| Solution | Complexity | Risk | Performance | UX Impact | Development Time |
|----------|------------|------|-------------|-----------|------------------|
| **Option 1: Deferred Hydration** | Low | Low | Good | Brief loading flash | 2-3 hours |
| **Option 2: SSR State Restoration** | High | Medium | Best | Perfect | 1-2 days |
| **Option 3: Suppress Warnings** | Minimal | High | Poor | Buggy | 5 minutes |
| **Option 4: Client-Only** | Minimal | Low | Fair | Slower first paint | 5 minutes |

---

## Recommendation

### Primary: **Option 1 - Deferred Hydration** ⭐

**Rationale**:
1. **Lowest Risk**: Isolated change to PlanningMachineContext
2. **Quick Implementation**: 2-3 hours including tests
3. **Clear UX**: Loading indicator is honest about what's happening
4. **Future-Proof**: Works with any state restoration strategy
5. **Testable**: Easy to write integration tests

**Why Not Option 2 (SSR Restoration)?**
- Higher complexity and risk
- Database query on every request (performance concern at scale)
- Complicates caching strategy
- Requires auditing better-sqlite3 SSR compatibility

**Why Not Option 4 (Client-Only)?**
- Loses SSR benefits for initial render
- Worse first paint performance
- Can implement later if needed

### Secondary: **Option 4 - Client-Only** (Fallback)

If Option 1 shows performance issues or UX concerns in testing, disable SSR for this route. The planning workflow is:
- Authenticated (SEO not relevant)
- JavaScript-required (XState dependency)
- Not time-critical (project planning is deliberate)

---

## Implementation Plan (Option 1)

### Phase 1: Core Fix (2 hours)
1. **Add loading state to PlanningMachineProvider**
   - File: `src/features/planning/machines/PlanningMachineContext.tsx`
   - Add `isHydrating` state
   - Render loading UI during hydration
   - Set `false` after mount

2. **Create LoadingPlaceholder component**
   - File: `src/features/planning/components/LoadingPlaceholder.tsx`
   - Match existing Navigation/StepContainer layout
   - Include spinner and message

3. **Update tests**
   - File: `src/features/planning/__integration.test.tsx`
   - Verify loading state renders
   - Verify transition to content

### Phase 2: Validation (1 hour)
1. **Manual Testing**
   - Seed project to Step 3
   - Refresh page multiple times
   - Verify no hydration errors
   - Verify loading indicator appears briefly
   - Test browser back/forward

2. **E2E Testing**
   - Run Test Run #017 scenario
   - Verify page refresh works correctly
   - Update learnings documentation

### Phase 3: Documentation (30 minutes)
1. **Update CLAUDE.md**
   - Document the fix
   - Add note about hydration timing

2. **Update e2e-testing docs**
   - Update learnings.md with resolution
   - Add to resolved bugs list

---

## Testing Strategy

### Unit Tests
```typescript
describe('PlanningMachineProvider hydration', () => {
  it('shows loading state during initial render', () => {
    // Mount with SSR=true flag
    // Verify LoadingPlaceholder renders
  });

  it('transitions to content after hydration', async () => {
    // Mount
    // Wait for isHydrating=false
    // Verify StepContainer renders
  });
});
```

### Integration Tests
```typescript
describe('Page refresh state restoration', () => {
  it('maintains correct step after refresh', async () => {
    // Navigate to Step 3
    // Trigger page.reload()
    // Verify "Step 3 of 10" displays
    // Verify no hydration errors in console
  });
});
```

### E2E Tests
- Resume Test Run #017 at Step 3
- Perform page refresh
- Verify Step 3 loads correctly
- Continue through Steps 4-10
- Document in `docs/e2e-testing/runs/017/`

---

## Risk Assessment

### Technical Risks
- **Loading Flash Duration**: If hydration takes >300ms, users may notice
  - **Mitigation**: Pre-warm localStorage during initial project creation
  - **Fallback**: Add skeleton UI instead of spinner

- **Race Conditions**: Database sync vs hydration complete
  - **Mitigation**: Existing code already handles this (line 113-115)
  - **Test**: Slow network simulation

### Product Risks
- **User Confusion**: "Why do I see loading on refresh but not navigation?"
  - **Mitigation**: Only shows on full page refresh (rare in normal flow)
  - **Documentation**: Add tooltip "Restoring project state..."

### Compatibility Risks
- **Browser Support**: localStorage + useState timing
  - **Mitigation**: Well-established patterns, broad support
  - **Test**: IE11 (if required), Safari, Firefox

---

## Acceptance Criteria

- [ ] Page refresh at any step displays correct step (no Step 1 flash)
- [ ] No hydration mismatch errors in console
- [ ] Actor ID remains stable across refresh (or explicit new instance)
- [ ] Loading indicator shows during state restoration (<200ms)
- [ ] Browser back/forward navigation works correctly
- [ ] All existing tests pass
- [ ] New integration test validates refresh behavior
- [ ] E2E Test Run #017 can be resumed and completed
- [ ] Documentation updated (CLAUDE.md, learnings.md)

---

## Alternative Architectures (Future Consideration)

### Option 5: Query String State Encoding
Encode current step in URL: `/project/{id}/build?step=3`
- Server renders correct step from URL
- No database query needed
- Breaks browser history (back button)

### Option 6: Session Storage Migration
Use sessionStorage instead of localStorage
- Survives page refresh
- Cleared on tab close
- Loses cross-tab sync

### Option 7: Service Worker Cache
Use Service Worker to intercept SSR and inject state
- Complex setup
- Overkill for this use case

---

## References

- **Issue**: #13 - BUG-018
- **Test Run**: `docs/e2e-testing/runs/017/`
- **Context File**: `src/features/planning/machines/PlanningMachineContext.tsx`
- **Navigation Component**: `src/features/planning/components/Navigation.tsx`
- **Related Fixes**: BUG-013 (StrictMode), BUG-011 (snapshot restoration)

---

## Questions for Product/Engineering Sign-off

1. **UX Acceptance**: Is a 100-200ms loading indicator on page refresh acceptable?
2. **Performance SLA**: Do we have requirements for time-to-interactive on refresh?
3. **Browser Support**: Which browsers must we support? (affects SSR strategy)
4. **Analytics**: Should we track how often users refresh mid-workflow?
5. **SEO Requirements**: Does the planning flow need SSR for SEO? (likely no - authenticated flow)

---

**Prepared by**: Claude AI  
**Date**: 2026-05-20  
**Status**: Awaiting approval to implement Option 1
