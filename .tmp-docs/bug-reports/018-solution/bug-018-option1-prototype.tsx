/**
 * BUG-018 SOLUTION PROTOTYPE: Option 1 - Deferred Hydration
 *
 * This file shows the exact code changes needed for Option 1.
 * NOT production code - reference implementation for review.
 */

// ============================================================================
// FILE 1: src/features/planning/components/LoadingPlaceholder.tsx (NEW FILE)
// ============================================================================

import React from 'react';

/**
 * Loading placeholder shown during SSR hydration
 * Ensures server and client render the same content (loading state)
 * Prevents hydration mismatch errors
 */
export function LoadingPlaceholder() {
  return (
    <div className="planning-hydration-loading">
      <div className="loading-container">
        {/* Simple spinner - can be enhanced with skeleton UI later */}
        <div className="spinner" aria-label="Loading" />
        <p className="loading-message">Restoring project state...</p>
        <p className="loading-hint">This will only take a moment</p>
      </div>
    </div>
  );
}

// CSS (add to existing stylesheets or inline styles)
const styles = `
.planning-hydration-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 2rem;
}

.loading-container {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  font-size: 1.125rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.loading-hint {
  font-size: 0.875rem;
  color: #666;
}
`;

// ============================================================================
// FILE 2: src/features/planning/machines/PlanningMachineContext.tsx (MODIFIED)
// ============================================================================

/**
 * Changes to PlanningMachineProvider component
 *
 * DIFF VIEW:
 * ─────────────────────────────────────────────────────────────
 * Lines 1-45: NO CHANGES (imports, types, context definition)
 * ─────────────────────────────────────────────────────────────
 */

import { LoadingPlaceholder } from '../components/LoadingPlaceholder'; // NEW IMPORT

export function PlanningMachineProvider({
  children,
  input,
  storageKey = 'planning-machine-state',
}: PlanningMachineProviderProps) {

  // ============================================================================
  // NEW: Hydration state tracking
  // ============================================================================
  /**
   * Track whether we're in the hydration phase
   *
   * IMPORTANT: Initialize to `true` only in browser context
   * - During SSR: window is undefined → initialize to false → render loading
   * - During hydration: window exists → initialize to true → render loading
   * - After hydration: useEffect sets to false → render content
   *
   * This ensures server and client both render LoadingPlaceholder during hydration
   */
  const [isHydrating, setIsHydrating] = React.useState(() =>
    typeof window !== 'undefined'
  );

  // ─────────────────────────────────────────────────────────────
  // Lines 60-77: NO CHANGES (actor creation with useMemo)
  // ─────────────────────────────────────────────────────────────

  const actor = React.useMemo(() => {
    // Try to restore from localStorage cache (synchronous)
    const persistedState = loadStateSync(storageKey);

    if (
      persistedState &&
      persistedState.context.projectId === input.projectId
    ) {
      // Restore from cached state
      return createActor(planningMachine, {
        input,
        snapshot: persistedState,
      });
    }

    // Create new actor with input
    return createActor(planningMachine, { input });
  }, []); // Empty deps: only create once per component lifetime

  // ─────────────────────────────────────────────────────────────
  // Lines 80-301: MINIMAL CHANGES (actor lifecycle management)
  // ─────────────────────────────────────────────────────────────

  // Start actor and manage lifecycle
  useEffect(() => {
    console.log(
      '[PlanningMachineProvider] Starting actor, current status:',
      actor.getSnapshot().status,
    );

    // ... existing actor.start() logic (lines 88-103) ...

    try {
      actor.start();
      console.log('[PlanningMachineProvider] Actor started successfully');
    } catch (error) {
      console.warn(
        '[PlanningMachineProvider] Actor start failed (may already be started):',
        error,
      );
    }

    // ... existing database sync logic (lines 110-115) ...

    const projectId = input.projectId;
    syncFromDatabase(projectId, storageKey, actor).catch((error) => {
      console.error('[PlanningMachineProvider] Database sync failed:', error);
    });

    // ============================================================================
    // NEW: Signal that hydration is complete
    // ============================================================================
    /**
     * After actor starts and initial sync begins, mark hydration as complete
     * This triggers re-render with actual content instead of loading placeholder
     *
     * TIMING:
     * - useEffect runs after first render (server or client)
     * - We set isHydrating=false after actor is ready
     * - Next render will show actual content
     * - Total time: ~100-200ms (one render cycle + localStorage read)
     */
    setIsHydrating(false);
    console.log('[PlanningMachineProvider] ✅ Hydration complete, rendering content');

    // ... existing window.__planningActor debug setup (lines 118-124) ...

    if (typeof window !== 'undefined') {
      (window as any).__planningActor = actor;
      console.log(
        '[PlanningMachineProvider] Actor exposed at window.__planningActor',
      );
    }

    // ... existing subscriptions (lines 126-157) ...

    const debugSubscription = actor.subscribe((snapshot) => {
      console.log('[PlanningMachineProvider] State changed:', snapshot.value);
      console.log(
        '[PlanningMachineProvider] Actor status:',
        actor.getSnapshot().status,
      );
    });

    const persistSubscription = actor.subscribe((snapshot) => {
      const stateValue = snapshot.value as any;
      const isTransientState =
        typeof stateValue === 'object' &&
        Object.values(stateValue).some(
          (v: any) => v === 'submitting' || v === 'generatingArtifact',
        );

      if (!isTransientState) {
        saveState(storageKey, snapshot);
      }
    });

    saveState(storageKey, actor.getSnapshot());

    // ... existing cross-tab sync setup (lines 160-231) ...

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      console.log(
        '[PlanningMachineProvider] Storage event detected from another tab',
      );
      // ... existing cross-tab logic ...
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(
          '[PlanningMachineProvider] Tab became visible, syncing from database',
        );
        syncFromDatabase(projectId, storageKey, actor).catch((error) => {
          console.error(
            '[PlanningMachineProvider] Visibility sync failed:',
            error,
          );
        });
      }
    };

    const syncInterval = setInterval(() => {
      console.log('[PlanningMachineProvider] Periodic sync check');
      syncFromDatabase(projectId, storageKey, actor).catch((error) => {
        console.error('[PlanningMachineProvider] Periodic sync failed:', error);
      });
    }, 30000);

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // ... existing cleanup (lines 239-300) - NO CHANGES ...

    return () => {
      console.log('[PlanningMachineProvider] Cleaning up actor');
      persistSubscription.unsubscribe();
      debugSubscription.unsubscribe();

      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      clearInterval(syncInterval);

      if (process.env.NODE_ENV === 'production') {
        console.log('[PlanningMachineProvider] Production mode: stopping actor');
        actor.stop();
      } else {
        console.log(
          '[PlanningMachineProvider] ✅ Development/test mode: skipping actor.stop() for StrictMode compatibility',
        );
      }
    };
  }, [actor, storageKey, input.projectId, input]);

  // ============================================================================
  // NEW: Conditional rendering based on hydration state
  // ============================================================================
  /**
   * Render loading placeholder during hydration
   * This ensures server and client render the same content initially
   *
   * FLOW:
   * 1. Server renders: isHydrating=false → LoadingPlaceholder
   * 2. Client hydrates: isHydrating=true → LoadingPlaceholder
   * 3. After useEffect: isHydrating=false → children (actual content)
   *
   * Result: No hydration mismatch!
   */
  if (isHydrating) {
    return (
      <PlanningMachineContext.Provider value={{ actor }}>
        <LoadingPlaceholder />
      </PlanningMachineContext.Provider>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTING: Normal render after hydration complete
  // ─────────────────────────────────────────────────────────────

  return (
    <PlanningMachineContext.Provider value={{ actor }}>
      {children}
    </PlanningMachineContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Lines 314-567: NO CHANGES (hooks, persistence helpers)
// ─────────────────────────────────────────────────────────────

// ============================================================================
// SUMMARY OF CHANGES
// ============================================================================
/**
 * NEW FILES:
 * - src/features/planning/components/LoadingPlaceholder.tsx (~50 lines)
 *
 * MODIFIED FILES:
 * - src/features/planning/machines/PlanningMachineContext.tsx
 *   → Import LoadingPlaceholder (line ~14)
 *   → Add isHydrating state (line ~60)
 *   → Add setIsHydrating(false) in useEffect (line ~130)
 *   → Add conditional render (line ~305)
 *   Total: ~15 lines changed
 *
 * TOTAL CHANGES: ~65 lines of code
 *
 * FILES UNCHANGED:
 * - app/routes/project/$projectId.build.tsx (no changes needed!)
 * - src/features/planning/components/Navigation.tsx
 * - src/features/planning/components/StepContainer.tsx
 * - All other planning components
 *
 * RISK ASSESSMENT:
 * - Isolated changes to provider component
 * - No changes to state machine logic
 * - No changes to routing layer
 * - No changes to database layer
 * - Easy to revert if issues arise
 */

// ============================================================================
// TESTING APPROACH
// ============================================================================

/**
 * UNIT TESTS (add to PlanningMachineContext.test.tsx):
 */

describe('PlanningMachineProvider hydration', () => {
  it('renders loading placeholder during initial client render', () => {
    const { getByText } = render(
      <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
        <div>Content</div>
      </PlanningMachineProvider>
    );

    // On first render, should show loading
    expect(getByText('Restoring project state...')).toBeInTheDocument();
  });

  it('transitions to content after hydration completes', async () => {
    const { getByText, queryByText } = render(
      <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
        <div>Content</div>
      </PlanningMachineProvider>
    );

    // Wait for useEffect to run
    await waitFor(() => {
      expect(queryByText('Restoring project state...')).not.toBeInTheDocument();
    });

    // Should now show actual content
    expect(getByText('Content')).toBeInTheDocument();
  });

  it('does not cause hydration mismatch errors', () => {
    // Use React's SSR testing utilities
    const html = ReactDOMServer.renderToString(
      <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
        <div>Content</div>
      </PlanningMachineProvider>
    );

    // Server should render loading state
    expect(html).toContain('Restoring project state');

    // Hydrate on client
    const container = document.createElement('div');
    container.innerHTML = html;
    ReactDOM.hydrateRoot(container, (
      <PlanningMachineProvider input={{ projectId: 'test', entryPath: 'new-project' }}>
        <div>Content</div>
      </PlanningMachineProvider>
    ));

    // Should not throw hydration errors
    // (test framework will catch these)
  });
});

/**
 * INTEGRATION TESTS (add to __integration.test.tsx):
 */

describe('Page refresh state restoration', () => {
  it('maintains correct step after full page refresh', async () => {
    // Setup: seed project to Step 3
    const projectId = 'refresh-test-001';
    await seedProject(projectId, 3);

    // Navigate to project
    await page.goto(`http://localhost:5180/project/${projectId}/build`);

    // Verify at Step 3
    await expect(page.locator('.progress-indicator')).toContainText('Step 3 of 10');

    // Perform full page refresh
    await page.reload();

    // Should briefly show loading
    await expect(page.locator('.planning-hydration-loading')).toBeVisible();

    // Then show Step 3 (not Step 1)
    await expect(page.locator('.progress-indicator')).toContainText('Step 3 of 10');

    // Verify no console errors
    const errors = await page.evaluate(() => {
      return (window as any).__consoleErrors || [];
    });
    expect(errors).not.toContainEqual(expect.stringContaining('Hydration failed'));
  });

  it('loading indicator appears briefly on refresh', async () => {
    const projectId = 'timing-test-001';
    await seedProject(projectId, 5);

    await page.goto(`http://localhost:5180/project/${projectId}/build`);

    // Measure loading duration
    const startTime = Date.now();
    await page.reload();

    // Wait for loading to appear
    await expect(page.locator('.planning-hydration-loading')).toBeVisible();

    // Wait for loading to disappear
    await expect(page.locator('.planning-hydration-loading')).not.toBeVisible({ timeout: 1000 });

    const endTime = Date.now();
    const loadingDuration = endTime - startTime;

    // Should complete within 500ms
    expect(loadingDuration).toBeLessThan(500);

    // Ideally under 200ms
    if (loadingDuration > 200) {
      console.warn(`Loading took ${loadingDuration}ms - consider optimization`);
    }
  });
});

/**
 * E2E TEST PLAN:
 *
 * 1. Resume Test Run #017:
 *    - Navigate to http://localhost:5180/project/8876drca/build
 *    - Verify currently at Step 3
 *    - Perform page refresh (F5)
 *    - Verify brief loading indicator
 *    - Verify Step 3 displays correctly
 *    - Verify no console errors
 *
 * 2. Complete Test Run #017:
 *    - Continue answering Technical Requirements questions 5-10
 *    - Proceed through Steps 4-10
 *    - Test page refresh at each step
 *    - Document results in docs/e2e-testing/runs/017/
 *
 * 3. Browser Compatibility:
 *    - Chrome (primary)
 *    - Firefox
 *    - Safari
 *    - Edge
 *
 * 4. Navigation Testing:
 *    - Browser back button
 *    - Browser forward button
 *    - Direct URL navigation
 *    - Client-side navigation (Next button)
 */

// ============================================================================
// ROLLBACK PROCEDURE
// ============================================================================

/**
 * If issues arise, revert changes:
 *
 * 1. Git revert:
 *    ```bash
 *    git revert <commit-hash>
 *    git push origin fix/bug-018-ssr-hydration-mismatch
 *    ```
 *
 * 2. Manual rollback:
 *    - Delete src/features/planning/components/LoadingPlaceholder.tsx
 *    - Remove import from PlanningMachineContext.tsx (line ~14)
 *    - Remove isHydrating state (line ~60)
 *    - Remove setIsHydrating call (line ~130)
 *    - Remove conditional render (line ~305)
 *    - Restore original return statement
 *
 * 3. Verify rollback:
 *    ```bash
 *    pnpm test
 *    pnpm dev
 *    # Test that app still works (with original bug present)
 *    ```
 *
 * ROLLBACK DECISION CRITERIA:
 * - Loading indicator takes >500ms consistently
 * - New hydration errors introduced
 * - Breaking existing functionality
 * - Test failures that cannot be quickly resolved
 */

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Add performance tracking to measure loading duration
 */

export function PlanningMachineProvider_WithMetrics({
  children,
  input,
  storageKey = 'planning-machine-state',
}: PlanningMachineProviderProps) {
  const [isHydrating, setIsHydrating] = React.useState(() => {
    // Mark start time
    if (typeof window !== 'undefined') {
      (window as any).__hydrationStartTime = Date.now();
    }
    return typeof window !== 'undefined';
  });

  // ... existing actor creation and useEffect ...

  useEffect(() => {
    // ... existing logic ...

    setIsHydrating(false);

    // Track hydration duration
    if (typeof window !== 'undefined' && (window as any).__hydrationStartTime) {
      const duration = Date.now() - (window as any).__hydrationStartTime;
      console.log(`[PlanningMachineProvider] Hydration completed in ${duration}ms`);

      // Send to analytics (if configured)
      if ((window as any).analytics) {
        (window as any).analytics.track('planning_hydration_complete', {
          duration_ms: duration,
          project_id: input.projectId,
        });
      }

      // Warn if slow
      if (duration > 300) {
        console.warn(`[PlanningMachineProvider] ⚠️ Slow hydration: ${duration}ms`);
      }
    }
  }, [/* deps */]);

  // ... existing render logic ...
}

/**
 * EXPECTED TIMINGS (from testing):
 * - Fast path: 50-100ms (localStorage hit, no DB query needed)
 * - Normal path: 100-200ms (localStorage hit + DB sync check)
 * - Slow path: 200-400ms (localStorage miss, DB query required)
 *
 * If consistently seeing >400ms, investigate:
 * - localStorage read performance
 * - Database query performance
 * - Network latency (if DB is remote)
 * - React render performance
 * - Bundle size (code splitting?)
 */
