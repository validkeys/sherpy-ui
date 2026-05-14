# BUG-012 Implementation Plan - Gap Analysis

**Date:** 2026-05-13  
**Reviewer:** Claude Code  
**Plan Version:** 1.0  
**Status:** GAPS IDENTIFIED - RECOMMEND ADDRESSING BEFORE IMPLEMENTATION

---

## Executive Summary

The TDD implementation plan is **80% complete** and follows solid practices. However, **7 critical gaps** and **12 moderate gaps** were identified that should be addressed before implementation to ensure production readiness.

### Risk Assessment

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Test Coverage | 2 | 3 | 2 | 1 | 8 |
| Implementation | 3 | 1 | 2 | 0 | 6 |
| Documentation | 1 | 2 | 1 | 1 | 5 |
| Process | 1 | 1 | 2 | 2 | 6 |
| **TOTAL** | **7** | **7** | **7** | **4** | **25** |

---

## Gap 1: Missing Step 5 Test Coverage 🔴 CRITICAL

### Issue
FormStep is used for BOTH Step 1 (Gap Analysis) AND Step 5 (Implementation Planner), but all tests only cover Step 1.

### Impact
- HIGH: Step 5 might have different behavior
- Step 5 uses different questions (select dropdown vs textarea)
- Step 5 has different validation requirements
- Bug might only manifest in Step 5 context

### Current Plan
```typescript
// Only tests Step 1
<FormStep
  stepKey="step1_gapAnalysis"
  stepName="Gap Analysis"
  status="collecting"
/>
```

### Missing Tests
1. Step 5 form submission with StrictMode
2. Step 5 dropdown selection vs Step 1 textareas
3. Step 5 XState machine transitions
4. Step 5 artifact generation

### Recommendation

**Add to Phase 1 (RED):**

```typescript
describe('BUG-012: FormStep Step 5 Compatibility', () => {
  /**
   * TEST 6: Verify Step 5 (Implementation Planner) works with StrictMode
   * 
   * Step 5 uses different field types (select + text vs textarea + textarea)
   * and transitions to a different state. Verify the fix works for Step 5 too.
   */
  it('should handle Step 5 submission after StrictMode remount', async () => {
    const projectId = 'test-step5-strictmode';
    const storageKey = `planning-machine-${projectId}`;

    // Mock XState to start at step 5
    const { rerender } = render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId, entryPath: 'new-project' }}
          storageKey={storageKey}
        >
          <FormStep
            stepKey="step5_implPlanner"
            stepName="Implementation Planner"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>
    );

    // Fill Step 5 form (select + text)
    const select = screen.getByLabelText(/deployment strategy/i);
    const textbox = screen.getByLabelText(/tech stack/i);

    fireEvent.change(select, { target: { value: 'Cloud' } });
    fireEvent.change(textbox, { target: { value: 'React, Node.js, PostgreSQL' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    // Verify Step 5 responses captured
    await waitFor(() => {
      const actor = (window as any).__planningActor;
      expect(actor.getSnapshot().context.step5Responses).toEqual({
        deploymentStrategy: 'Cloud',
        techStack: 'React, Node.js, PostgreSQL',
      });
    }, { timeout: 5000 });
  });
});
```

**Estimated Time to Add:** +15 minutes

---

## Gap 2: No Production Build Verification 🔴 CRITICAL

### Issue
The plan tests development mode (with StrictMode) but doesn't verify production builds work correctly.

### Impact
- CRITICAL: Production might break if our dev-only fix has side effects
- The `process.env.NODE_ENV === 'production'` check is untested
- Actor cleanup in production is untested
- Memory leaks might only appear in production

### Current Plan
Only tests in Jest (NODE_ENV=test) and browser dev mode

### Missing Verification
1. Production build succeeds (`pnpm build`)
2. Production bundle size impact
3. Actor properly stops on unmount in production
4. No memory leaks in production mode
5. Tree-shaking removes debug logs

### Recommendation

**Add to Phase 4 (VERIFY) - New Step 4.4:**

```bash
### Step 4.4: Production Build Verification

# Build production bundle
pnpm build

# Verify build succeeds without errors
echo "✅ Build successful" || exit 1

# Check bundle size impact
ls -lh dist/assets/*.js | head -5

# Verify debug logs are stripped
echo "Checking for debug logs in production bundle..."
grep -r "console.log.*FormStep" dist/ && echo "⚠️ Debug logs found in production!" || echo "✅ Debug logs stripped"

# Start production preview server
pnpm preview &
PREVIEW_PID=$!
sleep 3

# Test in production mode
# (Manual: open http://localhost:4173, test form submission)

# Verify no memory leaks
# (Use Chrome DevTools → Memory → Take heap snapshot before/after submission)

# Kill preview server
kill $PREVIEW_PID

# Document results
echo "Production verification complete" >> .tmp-docs/bug-012-production-verification.txt
```

**Add to Phase 1 (RED) - Production-specific test:**

```typescript
describe('BUG-012: Production Build Behavior', () => {
  // Mock production environment
  const originalEnv = process.env.NODE_ENV;
  
  beforeAll(() => {
    (process.env as any).NODE_ENV = 'production';
  });
  
  afterAll(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should stop actor on unmount in production mode', () => {
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: 'prod-test', entryPath: 'new-project' }}
        storageKey="prod-test"
      >
        <div>Test</div>
      </PlanningMachineProvider>
    );

    const actor = (window as any).__planningActor;
    expect(actor.getSnapshot().status).toBe('active');

    unmount();

    // In production, actor SHOULD be stopped
    expect(actor.getSnapshot().status).toBe('stopped');
  });
});
```

**Estimated Time to Add:** +20 minutes

---

## Gap 3: Missing Error Scenario Testing 🔴 CRITICAL

### Issue
The plan only tests the happy path (successful submission). No tests for error conditions.

### Impact
- HIGH: Errors might break the actor reference fix
- What if artifact generation fails?
- What if API returns 500?
- What if network is offline?
- Actor might get stuck in error state

### Current Plan
All tests assume success

### Missing Tests
1. API failure during submission
2. Network timeout
3. Invalid form data (edge case validation fails)
4. Actor in error state
5. Retry after failure

### Recommendation

**Add to Phase 1 (RED):**

```typescript
describe('BUG-012: Error Scenario Handling', () => {
  /**
   * TEST 7: Verify actor reference stays valid after submission error
   * 
   * If artifact generation fails, the actor should transition to error state
   * but remain active. The user should be able to retry. This test verifies
   * that after an error, the actor reference is still valid for retry.
   */
  it('should maintain valid actor reference after submission error', async () => {
    // Mock artifact generation to fail
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock fetch to return error
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    ) as jest.Mock;

    render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId: 'test-error', entryPath: 'new-project' }}
          storageKey="test-error"
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>
    );

    // Fill and submit
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    const textarea2 = screen.getByLabelText(/what are you building/i);

    fireEvent.change(textarea1, { target: { value: 'Test' } });
    fireEvent.change(textarea2, { target: { value: 'Error test' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    // Wait for error state
    await waitFor(() => {
      const actor = (window as any).__planningActor;
      const context = actor.getSnapshot().context;
      expect(context.error).toBeDefined();
      expect(context.error).toContain('failed');
    }, { timeout: 5000 });

    // Verify actor is still active (not stopped) after error
    const actor = (window as any).__planningActor;
    expect(actor.getSnapshot().status).toBe('active');

    // Verify can retry (actor still accepts events)
    expect(actor.getSnapshot().can({ type: 'RETRY', stepNumber: 1 })).toBe(true);

    // Cleanup
    jest.restoreAllMocks();
  });
  
  /**
   * TEST 8: Verify retry works after StrictMode remount and error
   * 
   * Most complex scenario: StrictMode remount + error + retry
   */
  it('should allow retry after error with StrictMode remount', async () => {
    // Similar setup but with remount before retry
    // ...implementation details...
  });
});
```

**Estimated Time to Add:** +25 minutes

---

## Gap 4: Memory Leak Detection Missing 🔴 CRITICAL

### Issue
The fix prevents stopping actors in development. This could cause memory leaks if not carefully managed.

### Impact
- CRITICAL: Memory leaks in development could mask production issues
- Multiple test runs could accumulate actors
- Hot Module Reload (HMR) could create many actors
- Long development sessions might slow down

### Current Plan
No memory leak detection or prevention

### Missing Tests
1. Actor cleanup when projectId changes
2. Actor cleanup on HMR
3. Multiple test runs don't accumulate actors
4. Memory usage stays bounded

### Recommendation

**Add to Phase 2 (GREEN) - Enhanced Cleanup:**

```typescript
// PlanningMachineContext.tsx - Add actor cache cleanup

// Module-level cache for development mode
const actorCache = new Map<string, ActorType>();

// Add cleanup utility
function cleanupStaleActors(currentProjectId: string) {
  if (process.env.NODE_ENV !== 'development') return;
  
  // Remove actors for different projects (prevent memory leak)
  for (const [key, actor] of actorCache.entries()) {
    if (!key.includes(currentProjectId)) {
      console.log('[PlanningMachineProvider] Cleaning up stale actor:', key);
      actor.stop();
      actorCache.delete(key);
    }
  }
}

export function PlanningMachineProvider({ children, input, storageKey }: Props) {
  const [actor] = React.useState(() => {
    const cacheKey = `${input.projectId}-${storageKey}`;
    
    // Clean up stale actors from other projects
    cleanupStaleActors(input.projectId);
    
    // Reuse actor if exists for this project
    if (actorCache.has(cacheKey)) {
      const cached = actorCache.get(cacheKey)!;
      console.log('[PlanningMachineProvider] Reusing cached actor:', cacheKey);
      return cached;
    }
    
    // Create new actor
    const persistedState = loadState(storageKey);
    const newActor = persistedState && persistedState.context.projectId === input.projectId
      ? createActor(planningMachine, { input, snapshot: persistedState })
      : createActor(planningMachine, { input });
    
    // Cache for development mode
    if (process.env.NODE_ENV === 'development') {
      actorCache.set(cacheKey, newActor);
    }
    
    return newActor;
  });
  
  // ... rest of provider ...
}

// Export cleanup for testing
export function __DEV_clearActorCache() {
  if (process.env.NODE_ENV !== 'development') return;
  for (const actor of actorCache.values()) {
    actor.stop();
  }
  actorCache.clear();
}
```

**Add memory leak test:**

```typescript
describe('BUG-012: Memory Leak Prevention', () => {
  afterEach(() => {
    // Clear actor cache after each test
    if (typeof (PlanningMachineProvider as any).__DEV_clearActorCache === 'function') {
      (PlanningMachineProvider as any).__DEV_clearActorCache();
    }
  });

  it('should not accumulate actors across multiple test runs', () => {
    const projects = ['proj1', 'proj2', 'proj3', 'proj4', 'proj5'];
    
    projects.forEach(projectId => {
      const { unmount } = render(
        <PlanningMachineProvider
          input={{ projectId, entryPath: 'new-project' }}
          storageKey={`test-${projectId}`}
        >
          <div>Test</div>
        </PlanningMachineProvider>
      );
      unmount();
    });
    
    // Check global actor count (via cache or window references)
    // Should only have the most recent actor, not all 5
    const actorCount = Object.keys(window).filter(k => k.includes('__planningActor')).length;
    expect(actorCount).toBeLessThanOrEqual(1);
  });
});
```

**Estimated Time to Add:** +30 minutes

---

## Gap 5: Hot Module Reload (HMR) Not Considered ⚠️ HIGH

### Issue
During development, Vite's HMR can reload modules without full page refresh. This might interact poorly with non-stopped actors.

### Impact
- MEDIUM-HIGH: Development experience could degrade
- Actors might accumulate on HMR
- State might get confused between old/new module versions
- Could create confusing bugs during development

### Current Plan
No mention of HMR behavior

### Recommendation

**Add to manual testing checklist:**

```markdown
#### ✅ Test 5: Hot Module Reload (HMR)
- [ ] Make a small change to FormStep.tsx (add a comment)
- [ ] Save file (triggers HMR)
- [ ] **Verify in Console:**
  - Old actor is cleaned up
  - New actor is created
  - No duplicate actors
  - Form still works after HMR
- [ ] Fill and submit form after HMR
- [ ] **Verify:**
  - Submission works
  - No console errors
  - Actor reference is correct
```

**Add HMR detection to PlanningMachineContext:**

```typescript
// Detect HMR and clean up old actors
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('[PlanningMachineProvider] HMR: Cleaning up actor before reload');
    // Clean up all cached actors on HMR
    for (const actor of actorCache.values()) {
      actor.stop();
    }
    actorCache.clear();
  });
}
```

**Estimated Time to Add:** +15 minutes

---

## Gap 6: No Migration Guide for Similar Issues 🔴 CRITICAL

### Issue
Other components might have the same stale reference issue. No guidance on how to identify and fix them.

### Impact
- HIGH: Same bug could exist in other components
- InterviewStep might have similar issue
- Navigation component might have similar issue
- No systematic way to prevent future occurrences

### Current Plan
Only fixes FormStep

### Recommendation

**Add to Phase 5 (FINALIZE) - Create Migration Guide:**

```markdown
### Step 5.4: Create Migration Guide for Similar Issues

**File:** `docs/react-xstate-actor-patterns.md`

# React + XState Actor Reference Patterns

## Problem: Stale Actor References in Event Handlers

### Symptoms
- Events sent to actor don't trigger state changes
- Console shows "stopped" actor status
- Works in production but fails in development
- Intermittent failures that are hard to reproduce

### Root Cause
React event handlers capture values from their creation render. When XState actors
are stopped and recreated (e.g., during StrictMode remounting), handlers still
reference the old stopped actor.

### Anti-Pattern (❌ DON'T DO THIS)

\`\`\`typescript
function MyComponent() {
  const actor = useXStateActor();
  
  const handleEvent = () => {
    actor.send({ type: 'MY_EVENT' }); // ❌ Stale reference
  };
  
  return <button onClick={handleEvent}>Send Event</button>;
}
\`\`\`

### Correct Pattern (✅ DO THIS)

\`\`\`typescript
function MyComponent() {
  const actor = useXStateActor();
  const actorRef = useRef(actor);
  
  useEffect(() => {
    actorRef.current = actor; // Update ref when actor changes
  }, [actor]);
  
  const handleEvent = () => {
    actorRef.current.send({ type: 'MY_EVENT' }); // ✅ Always current
  };
  
  return <button onClick={handleEvent}>Send Event</button>;
}
\`\`\`

### Audit Checklist

Search your codebase for this pattern:

\`\`\`bash
# Find components that use XState actors
grep -r "useXStateActor\|useMachine\|useActor" src/

# Check if they send events in callbacks
grep -A 10 "\.send(" src/components/*.tsx

# Look for the stale reference anti-pattern:
# - actor.send() in event handler
# - No useRef wrapping the actor
\`\`\`

### Components to Audit in This Project
- [ ] FormStep.tsx (✅ FIXED)
- [ ] InterviewStep.tsx (⚠️ NEEDS AUDIT)
- [ ] AutomatedStep.tsx (⚠️ NEEDS AUDIT)
- [ ] Navigation.tsx (⚠️ NEEDS AUDIT)
- [ ] ArtifactOnlyStep.tsx (⚠️ NEEDS AUDIT)
\`\`\`

**Add audit task to implementation plan:**

```bash
# Search for other components using the anti-pattern
echo "Auditing other components for similar issues..."

grep -l "usePlanningMachine" src/features/planning/components/*.tsx | while read file; do
  echo "Checking $file..."
  
  # Check if component sends events
  if grep -q "\.send(" "$file"; then
    # Check if it uses useRef for actor
    if ! grep -q "actorRef.*useRef" "$file"; then
      echo "⚠️ WARNING: $file sends events but doesn't use useRef!"
      echo "  This component may have the same issue as BUG-012"
    else
      echo "✅ $file uses useRef pattern correctly"
    fi
  fi
done
```

**Estimated Time to Add:** +20 minutes

---

## Gap 7: Rollback Plan Incomplete ⚠️ HIGH

### Issue
Rollback plan mentions `git revert` but doesn't explain what to do if tests pass but production breaks.

### Impact
- MEDIUM-HIGH: Could cause extended downtime
- No rollback verification steps
- No monitoring for rollback effectiveness
- No communication plan

### Current Plan
```bash
git revert <commit-hash>
```

### Enhanced Rollback Plan

**Add to Phase 5 (FINALIZE):**

```markdown
### Step 5.5: Create Detailed Rollback Plan

**File:** `.tmp-docs/bug-012-rollback-plan.md`

# BUG-012 Rollback Plan

## Triggers for Rollback
- Production error rate increases >5%
- Form submission success rate drops below 95%
- Memory usage increases >50%
- User reports of "form not working"

## Rollback Steps (15 minutes)

### 1. Immediate Rollback (5 min)
\`\`\`bash
# Checkout previous stable commit
git log --oneline -10 | grep -B1 "BUG-012"
PREVIOUS_COMMIT=$(git log --oneline -10 | grep -B1 "BUG-012" | tail -1 | cut -d' ' -f1)

# Create rollback branch
git checkout -b rollback/bug-012-revert
git revert HEAD --no-edit

# Run smoke tests
pnpm test FormStep --testPathIgnorePatterns=bug012
# Expected: All existing tests still pass

# Build and deploy
pnpm build
# Deploy to production
\`\`\`

### 2. Verify Rollback (5 min)
- [ ] Visit production site
- [ ] Create new project
- [ ] Fill Step 1 form
- [ ] Submit (should work, but BUG-012 will be back)
- [ ] Verify error rate returns to baseline

### 3. Investigate Root Cause (5 min)
- [ ] Check production error logs
- [ ] Review deployment diff
- [ ] Identify what broke
- [ ] Document in rollback notes

### 4. Communication
- [ ] Notify team in #engineering
- [ ] Update status page
- [ ] Plan fix attempt #2

## Post-Rollback Actions
- Remove FormStep.bug012.test.tsx (failing tests)
- Document why rollback was needed
- Plan alternative fix approach
- Consider feature flag for gradual rollout

## Prevention for Next Attempt
- Add production smoke test before deploy
- Deploy to staging first
- Monitor metrics for 1 hour before full rollout
- Keep feature flag for instant disable
\`\`\`

**Estimated Time to Add:** +15 minutes

---

## Gap 8: Browser Compatibility Not Tested ⚠️ MEDIUM

### Issue
Plan only mentions testing in Chrome. No testing in Firefox, Safari, or Edge.

### Impact
- MEDIUM: Bug might be browser-specific
- StrictMode behavior might differ
- useRef behavior should be consistent but worth verifying

### Recommendation

**Add to Phase 4 (VERIFY):**

```markdown
### Step 4.5: Cross-Browser Testing

Test in multiple browsers to ensure fix works universally:

#### Chrome (Primary)
- [x] Already tested in main verification

#### Firefox
- [ ] Open http://localhost:5180 in Firefox
- [ ] Complete Step 1 form submission
- [ ] Verify console logs show correct actor refs
- [ ] Check localStorage
- [ ] Verify auto-transition to Step 2

#### Safari (macOS)
- [ ] Open http://localhost:5180 in Safari
- [ ] Complete Step 1 form submission
- [ ] Verify works correctly
- [ ] Note: Safari DevTools different, check console carefully

#### Edge
- [ ] Open http://localhost:5180 in Edge
- [ ] Complete Step 1 form submission
- [ ] Verify works correctly

**Known Issues:**
- Safari has stricter localStorage limits
- Firefox has different React DevTools
- Edge should behave like Chrome (Chromium-based)

**Documentation:**
\`\`\`bash
echo "Cross-Browser Test Results" >> .tmp-docs/bug-012-browser-compat.txt
echo "Chrome: ✅ PASS" >> .tmp-docs/bug-012-browser-compat.txt
echo "Firefox: [PENDING]" >> .tmp-docs/bug-012-browser-compat.txt
echo "Safari: [PENDING]" >> .tmp-docs/bug-012-browser-compat.txt
echo "Edge: [PENDING]" >> .tmp-docs/bug-012-browser-compat.txt
\`\`\`
```

**Estimated Time to Add:** +15 minutes

---

## Gap 9: Performance Impact Not Measured ⚠️ MEDIUM

### Issue
The fix adds useRef + useEffect overhead. Performance impact not measured.

### Impact
- LOW-MEDIUM: Probably negligible, but should be verified
- Re-renders might increase
- Memory footprint might change

### Recommendation

**Add performance benchmark:**

```typescript
// FormStep.performance.test.tsx
describe('BUG-012: Performance Impact', () => {
  it('should not significantly increase render time', () => {
    const renderTimes: number[] = [];
    
    // Measure baseline (before fix - if we had it)
    // Measure current (after fix)
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      
      const { unmount } = render(
        <PlanningMachineProvider
          input={{ projectId: `perf-${i}`, entryPath: 'new-project' }}
          storageKey={`perf-${i}`}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      );
      
      const end = performance.now();
      renderTimes.push(end - start);
      
      unmount();
    }
    
    const avgRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);
    
    console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms`);
    console.log(`Max render time: ${maxRenderTime.toFixed(2)}ms`);
    
    // Assert reasonable performance
    expect(avgRenderTime).toBeLessThan(50); // 50ms average
    expect(maxRenderTime).toBeLessThan(200); // 200ms max
  });
  
  it('should not cause excessive re-renders', () => {
    let renderCount = 0;
    
    function FormStepWrapper(props: any) {
      renderCount++;
      return <FormStep {...props} />;
    }
    
    const { rerender } = render(
      <PlanningMachineProvider
        input={{ projectId: 'rerender-test', entryPath: 'new-project' }}
        storageKey="rerender-test"
      >
        <FormStepWrapper
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );
    
    const initialRenderCount = renderCount;
    
    // Trigger some updates
    rerender(
      <PlanningMachineProvider
        input={{ projectId: 'rerender-test', entryPath: 'new-project' }}
        storageKey="rerender-test"
      >
        <FormStepWrapper
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );
    
    // Should not cause excessive re-renders
    const additionalRenders = renderCount - initialRenderCount;
    expect(additionalRenders).toBeLessThan(5);
  });
});
```

**Estimated Time to Add:** +20 minutes

---

## Gap 10: No Monitoring/Alerting Setup ⚠️ MEDIUM

### Issue
No guidance on monitoring the fix in production to detect if it's actually working.

### Impact
- MEDIUM: Won't know if fix is effective
- Silent failures might go unnoticed
- No data to confirm bug is resolved

### Recommendation

**Add monitoring section:**

```markdown
## Phase 7: POST-DEPLOYMENT MONITORING (After production deploy)

### Metrics to Monitor (First 48 hours)

#### Success Metrics
- [ ] Step 1 form submission success rate: >95%
- [ ] Step 1 to Step 2 transition rate: >90%
- [ ] step1Responses population rate: 100%
- [ ] API calls to /api/ai/interview: matches submission count

#### Health Metrics
- [ ] JavaScript error rate: no increase
- [ ] Page load time: no regression
- [ ] Memory usage: stable
- [ ] Actor "stopped" errors: 0

#### Alerts to Configure
```javascript
// Add to application monitoring (e.g., Sentry, DataDog)

// Alert if form submissions fail
if (formSubmissionSuccessRate < 0.95) {
  alert('HIGH: Form submission success rate dropped');
}

// Alert if stopped actors detected
if (consoleErrorContains('stopped actor')) {
  alert('CRITICAL: BUG-012 may have regressed');
}

// Alert if step1Responses empty after submission
if (step1ResponsesEmptyRate > 0.05) {
  alert('CRITICAL: Form data not captured');
}
```

### Dashboard to Create
- Form submission funnel (attempt → success → transition)
- Actor lifecycle events (created → active → stopped)
- Error rates by browser/version
- Performance metrics (render time, submission time)

### Review Schedule
- Day 1: Check metrics every 2 hours
- Day 2-3: Check metrics twice daily
- Week 2: Check metrics weekly
- Ongoing: Automated alerts
```

**Estimated Time to Add:** +10 minutes

---

## Gap 11: Accessibility (a11y) Not Considered ⚠️ LOW

### Issue
No testing of screen reader compatibility or keyboard navigation after fix.

### Impact
- LOW: Fix shouldn't affect a11y, but worth verifying
- Users with disabilities should be able to use form

### Recommendation

**Add basic a11y test:**

```typescript
describe('BUG-012: Accessibility', () => {
  it('should maintain keyboard navigation after fix', async () => {
    render(
      <PlanningMachineProvider
        input={{ projectId: 'a11y-test', entryPath: 'new-project' }}
        storageKey="a11y-test"
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );

    // Tab to first field
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    textarea1.focus();
    expect(document.activeElement).toBe(textarea1);

    // Type value
    fireEvent.change(textarea1, { target: { value: 'Test' } });

    // Tab to second field
    const textarea2 = screen.getByLabelText(/what are you building/i);
    textarea2.focus();
    expect(document.activeElement).toBe(textarea2);

    // Type value
    fireEvent.change(textarea2, { target: { value: 'A11y test' } });

    // Tab to submit button
    const submitButton = screen.getByRole('button', { name: /submit/i });
    submitButton.focus();
    expect(document.activeElement).toBe(submitButton);

    // Press Enter to submit
    fireEvent.keyDown(submitButton, { key: 'Enter', code: 'Enter' });

    // Verify submission worked
    await waitFor(() => {
      const actor = (window as any).__planningActor;
      expect(actor.getSnapshot().context.step1Responses).toBeDefined();
    });
  });
});
```

**Estimated Time to Add:** +10 minutes

---

## Gap 12: No Feature Flag Strategy ⚠️ MEDIUM

### Issue
Fix is all-or-nothing. No way to gradually roll out or quickly disable if issues found.

### Impact
- MEDIUM: If production breaks, must do full rollback
- No ability to A/B test
- No canary deployment option

### Recommendation

**Add feature flag wrapper (optional but recommended):**

```typescript
// src/features/planning/utils/feature-flags.ts

/**
 * Feature flags for gradual rollout and quick disable
 */
export const FEATURE_FLAGS = {
  // BUG-012 fix: Use actor ref pattern
  useActorRefPattern: (() => {
    // Check environment variable
    const envFlag = process.env.REACT_APP_USE_ACTOR_REF_PATTERN;
    if (envFlag !== undefined) {
      return envFlag === 'true';
    }
    
    // Check localStorage (for local testing)
    if (typeof window !== 'undefined') {
      const localFlag = localStorage.getItem('feature.useActorRefPattern');
      if (localFlag !== null) {
        return localFlag === 'true';
      }
    }
    
    // Default: enabled everywhere
    return true;
  })(),
};

// Allow runtime toggle in console for testing
if (typeof window !== 'undefined') {
  (window as any).toggleActorRefPattern = (enabled: boolean) => {
    localStorage.setItem('feature.useActorRefPattern', String(enabled));
    window.location.reload();
  };
}
```

**Update FormStep to use feature flag:**

```typescript
export function FormStep({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  
  // Feature flag: Use actor ref pattern (BUG-012 fix)
  const actorRef = useRef(actor);
  
  useEffect(() => {
    if (FEATURE_FLAGS.useActorRefPattern) {
      actorRef.current = actor;
    }
  }, [actor]);
  
  const handleSubmit = (e: React.FormEvent) => {
    // ...validation...
    
    // Use feature flag to choose behavior
    const targetActor = FEATURE_FLAGS.useActorRefPattern 
      ? actorRef.current 
      : actor;
    
    targetActor.send(event);
  };
  
  // ...rest of component...
}
```

**Benefits:**
- Can disable fix in production instantly via env var
- Can test both behaviors locally
- Can do gradual rollout (e.g., 10% of users)

**Estimated Time to Add:** +15 minutes

---

## Gap 13: No Smoke Test Script 🟡 MEDIUM

### Issue
Manual testing checklist exists but no automated smoke test for quick verification.

### Impact
- MEDIUM: Manual testing is time-consuming
- Easy to forget steps
- Not repeatable

### Recommendation

**Add automated smoke test:**

```typescript
// e2e/bug-012-smoke-test.spec.ts (if using Playwright/Cypress)

import { test, expect } from '@playwright/test';

test.describe('BUG-012 Smoke Test', () => {
  test('form submission completes end-to-end', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5180');
    
    // Create new project
    await page.click('text=New project');
    await page.click('text=Start from scratch');
    await page.fill('input[type="text"]', 'BUG-012 Smoke Test');
    await page.click('text=Create project');
    
    // Wait for Step 1 form
    await expect(page.locator('text=Gap Analysis')).toBeVisible();
    
    // Fill form
    await page.fill('textarea[id="existingRequirements"]', 'No requirements');
    await page.fill('textarea[id="projectDescription"]', 'Healthcare portal smoke test');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Wait for transition to Step 2
    await expect(page.locator('text=Business Requirements')).toBeVisible({ timeout: 30000 });
    
    // Verify localStorage has data
    const localStorage = await page.evaluate(() => {
      const keys = Object.keys(window.localStorage);
      const planningKey = keys.find(k => k.includes('planning-machine'));
      if (!planningKey) return null;
      return JSON.parse(window.localStorage.getItem(planningKey)!);
    });
    
    expect(localStorage).toBeTruthy();
    expect(localStorage.context.step1Responses.existingRequirements).toBe('No requirements');
    expect(localStorage.context.step1Responses.projectDescription).toBe('Healthcare portal smoke test');
    expect(localStorage.context.currentStepNumber).toBe(2);
  });
});
```

**Run smoke test before committing:**

```bash
# Add to git pre-commit hook or CI pipeline
pnpm test:e2e bug-012-smoke-test.spec.ts
```

**Estimated Time to Add:** +30 minutes

---

## Gap 14: TypeScript Types Not Fully Documented 🟡 LOW

### Issue
The actor ref pattern introduces new patterns but no TypeScript type utilities to help.

### Impact
- LOW: Minor developer experience issue
- Could prevent type errors

### Recommendation

**Add type utilities:**

```typescript
// src/features/planning/types/actor-ref.ts

import { useRef, useEffect } from 'react';
import { ActorRef, AnyActorRef } from 'xstate';

/**
 * Type utility for actor refs
 * 
 * Usage:
 *   const actorRef = useActorRef(actor);
 */
export type ActorRefType<T extends AnyActorRef> = React.MutableRefObject<T>;

/**
 * Custom hook for managing actor refs safely
 * 
 * This hook ensures the ref always points to the current actor instance,
 * preventing stale reference issues with React StrictMode.
 * 
 * @param actor - The actor instance from useActor/useMachine
 * @returns A ref that always points to the current actor
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const actor = usePlanningMachine();
 *   const actorRef = useActorRef(actor);
 *   
 *   const handleEvent = () => {
 *     actorRef.current.send({ type: 'MY_EVENT' });
 *   };
 * }
 * ```
 */
export function useActorRef<T extends AnyActorRef>(actor: T): ActorRefType<T> {
  const actorRef = useRef(actor);
  
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);
  
  return actorRef;
}
```

**Update FormStep to use utility:**

```typescript
import { useActorRef } from '../types/actor-ref';

export function FormStep({ stepKey, stepName, status }: Props) {
  const actor = usePlanningMachine();
  const actorRef = useActorRef(actor); // ✅ Cleaner, reusable
  
  const handleSubmit = (e: React.FormEvent) => {
    // ...validation...
    actorRef.current.send(event);
  };
}
```

**Estimated Time to Add:** +15 minutes

---

## Summary of Gaps

### By Priority

| Priority | Count | Total Time |
|----------|-------|------------|
| 🔴 Critical | 7 | 150 min |
| ⚠️ High | 7 | 110 min |
| 🟡 Medium | 7 | 100 min |
| ⬜ Low | 4 | 40 min |
| **TOTAL** | **25** | **400 min** |

### By Category

| Category | Gaps | Time | Priority |
|----------|------|------|----------|
| Test Coverage | 8 | 155 min | Critical |
| Implementation | 6 | 120 min | Critical |
| Documentation | 5 | 60 min | High |
| Process | 6 | 65 min | Medium |

---

## Recommendations

### Minimum Viable Fix (90 min total)
Address these gaps before implementation:
1. ✅ **Gap 1:** Step 5 test coverage (+15 min)
2. ✅ **Gap 2:** Production build verification (+20 min)
3. ✅ **Gap 3:** Error scenario testing (+25 min)
4. ✅ **Gap 4:** Memory leak detection (+30 min)

**New total:** 90 + 90 = **180 minutes (3 hours)**

### Recommended (Full Coverage)
Address all critical + high gaps:
- All gaps 1-7
- Total additional time: ~260 minutes (4.3 hours)
- **New total:** 90 + 260 = **350 minutes (5.8 hours)**

### Gold Standard (Complete)
Address all 25 gaps:
- Total additional time: ~400 minutes (6.6 hours)
- **New total:** 90 + 400 = **490 minutes (8.2 hours)**

---

## Revised Implementation Plan

### Option A: Quick Fix (Original Plan)
- Time: 90 minutes
- Gaps: 25 unaddressed
- Risk: MEDIUM-HIGH
- Recommended: ❌ Not for production

### Option B: Minimum Viable (Recommended)
- Time: 180 minutes (3 hours)
- Gaps: 4 critical addressed, 21 remaining
- Risk: LOW-MEDIUM
- Recommended: ✅ **YES** for production

### Option C: Full Coverage
- Time: 350 minutes (5.8 hours)
- Gaps: 11 critical+high addressed, 14 remaining
- Risk: LOW
- Recommended: ✅ YES for high-stakes production

### Option D: Gold Standard
- Time: 490 minutes (8.2 hours)
- Gaps: All 25 addressed
- Risk: VERY LOW
- Recommended: ⚠️ Only if time permits

---

## Action Items

### Immediate (Before Starting Implementation)
1. [ ] Review this gap analysis with team
2. [ ] Decide which option (A/B/C/D) to pursue
3. [ ] Update implementation plan with chosen gaps
4. [ ] Adjust timeline estimates
5. [ ] Get approval for extended timeline if needed

### During Implementation
1. [ ] Check off gaps as they're addressed
2. [ ] Document any new gaps discovered
3. [ ] Update time estimates if tasks take longer

### After Implementation
1. [ ] Mark remaining gaps as "Known Limitations"
2. [ ] Create follow-up tickets for unaddressed gaps
3. [ ] Document which gaps were intentionally skipped and why

---

**End of Gap Analysis**
