/**
 * Idle State Bug Reproduction Test (BUG-001)
 *
 * Bug Description:
 * - Machine starts in 'idle' state (planningMachine.ts:218)
 * - StepContainer doesn't have 'idle' in STEP_CONFIG (StepContainer.tsx:20-31)
 * - Results in console warning and null render (empty screen)
 *
 * Expected Behavior:
 * - After project creation, user should see first step (Gap Analysis form)
 * - Machine should either start in step1_gapAnalysis OR idle should be handled
 *
 * This test SHOULD FAIL until the bug is fixed.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepContainer } from '../components/StepContainer';
import { PlanningMachineProvider, useSelector } from '../machines/PlanningMachineContext';

describe('BUG-001: Idle State Handler Missing', () => {
  const defaultInput = {
    projectId: 'test-project',
    entryPath: 'new-project' as const,
  };

  it('should render StepContainer when machine is in idle state', () => {
    // This test reproduces the bug:
    // 1. Fresh provider starts machine in 'idle' state
    // 2. StepContainer attempts to render
    // 3. STEP_CONFIG has no 'idle' key
    // 4. Returns null (empty screen for user)

    const { container } = render(
      <PlanningMachineProvider input={defaultInput}>
        <StepContainer />
      </PlanningMachineProvider>
    );

    // Bug expectation: container is empty (renders null)
    // Fix expectation: should show either:
    // - Step 1 form (if initial changed to 'step1_gapAnalysis')
    // - Idle state handler (if idle added to STEP_CONFIG)
    // - Auto-transition indicator (if START_PLANNING auto-sent)

    // This assertion will FAIL when bug is present (container.firstChild === null)
    expect(container.firstChild).not.toBeNull();
  });

  it('should show correct initial state for new project workflow', () => {
    // Create a test component to inspect machine state
    const StateInspector = () => {
      const stateValue = useSelector((state) => state.value);
      return <div data-testid="state-value">{JSON.stringify(stateValue)}</div>;
    };

    render(
      <PlanningMachineProvider input={defaultInput}>
        <StateInspector />
        <StepContainer />
      </PlanningMachineProvider>
    );

    const stateDisplay = screen.getByTestId('state-value');
    const currentState = JSON.parse(stateDisplay.textContent || '""');

    // Document actual vs expected behavior
    console.log('Current state:', currentState);

    // Expected: Machine should be ready for user to start planning
    // Actual (bug): Machine is in 'idle', but UI doesn't handle it

    if (currentState === 'idle') {
      // Bug present: idle state exists but UI can't render it
      console.warn('BUG CONFIRMED: Machine in idle state, StepContainer returns null');

      // This expectation documents the bug
      expect(currentState).not.toBe('idle'); // Will FAIL until fixed
    } else {
      // Bug fixed: Machine starts in a renderable state
      // State can be string ('step1_gapAnalysis') or object ({ step1_gapAnalysis: 'collecting' })
      const stateKey = typeof currentState === 'string' ? currentState : Object.keys(currentState)[0];
      expect(stateKey).toMatch(/step\d+_/);
    }
  });

  it('should handle idle state gracefully with helpful message', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <StepContainer />
      </PlanningMachineProvider>
    );

    // After fix, one of these should be true:
    // Option A: No idle state (machine starts at step1)
    // Option B: Idle state shows helpful message
    // Option C: Auto-transitions to step1

    // For now, expect SOME content to be rendered
    const content = screen.queryByRole('heading');

    // This will FAIL while bug exists (no heading found, StepContainer returns null)
    expect(content).not.toBeNull();
  });

  it('should allow user to start planning from initial state', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <StepContainer />
      </PlanningMachineProvider>
    );

    // Expected: User can see and interact with the planning workflow
    // Actual (bug): Empty screen, no way to proceed

    // Look for any interactive element (form, button, etc.)
    const form = screen.queryByRole('form');
    const heading = screen.queryByRole('heading');
    const inputs = screen.queryAllByRole('textbox');

    const hasInteractiveContent = form !== null || heading !== null || inputs.length > 0;

    // This will FAIL while bug exists (no interactive content)
    expect(hasInteractiveContent).toBe(true);
  });
});
