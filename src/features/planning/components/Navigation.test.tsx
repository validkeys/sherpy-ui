/**
 * Navigation Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Navigation } from './Navigation';
import { PlanningMachineProvider } from '../machines/PlanningMachineContext';

describe('Navigation', () => {
  const defaultInput = {
    projectId: 'test-project',
    entryPath: 'new-project' as const,
  };

  it('renders step progress', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <Navigation />
      </PlanningMachineProvider>
    );

    expect(screen.getByText(/Step 1 of 10/i)).toBeDefined();
  });

  it('disables Back button on step 1', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <Navigation />
      </PlanningMachineProvider>
    );

    const backButton = screen.getByRole('button', { name: /back/i }) as HTMLButtonElement;
    expect(backButton.disabled).toBe(true);
  });

  it('disables Next button when current step not complete', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <Navigation />
      </PlanningMachineProvider>
    );

    const nextButton = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it('renders both buttons', () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <Navigation />
      </PlanningMachineProvider>
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /next/i })).toBeDefined();
  });

  it('renders without crashing during SSR when localStorage is undefined (BUG-005)', () => {
    // Simulate SSR by making localStorage undefined
    const originalLocalStorage = global.localStorage;
    // @ts-expect-error - Simulating SSR environment
    delete global.localStorage;

    // Should not throw
    expect(() => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <Navigation />
        </PlanningMachineProvider>
      );
    }).not.toThrow();

    // Restore localStorage
    global.localStorage = originalLocalStorage;

    // Verify component rendered
    expect(screen.getByText(/Step 1 of 10/i)).toBeDefined();
  });
});
