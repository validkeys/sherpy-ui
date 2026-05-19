/**
 * BUG-007: Simplified diagnostic test
 * Checks if FormStep component re-renders when machine state changes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanningMachineProvider } from '../machines/PlanningMachineContext';
import { StepContainer } from './StepContainer';

// Mock the server module at the top level
vi.mock('../../ai/server', () => ({
  $generateArtifact: vi.fn().mockResolvedValue({
    format: 'markdown',
    content: '# Gap Analysis\n\nTest content',
    generatedAt: new Date().toISOString(),
  }),
}));

describe('BUG-007: Simplified Diagnostic', () => {
  const defaultInput = {
    projectId: 'test-bug-007',
    entryPath: 'new-project' as const,
  };

  beforeEach(() => {
    // Reset localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock fetch for interview API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('{"question": "Test?", "options": []}'),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
      headers: new Map([['content-type', 'application/json']]),
    });
  });

  it('exposes bug: button does not show Submitting state', async () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <StepContainer />
      </PlanningMachineProvider>
    );

    // Fill form
    const requirementsField = screen.getByLabelText(/Do you have existing requirements/i);
    const descriptionField = screen.getByLabelText(/What are you building/i);

    fireEvent.change(requirementsField, {
      target: { value: 'No, starting from scratch' },
    });

    fireEvent.change(descriptionField, {
      target: { value: 'Healthcare Portal' },
    });

    // Wait for button to be enabled
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    console.log('BEFORE CLICK - Button text:', submitButton.textContent);
    console.log('BEFORE CLICK - Button disabled:', submitButton.disabled);

    // Click submit
    fireEvent.click(submitButton);

    // BUG: Button should show "Submitting..." but it doesn't
    await waitFor(() => {
      console.log('AFTER CLICK - Button text:', submitButton.textContent);
      console.log('AFTER CLICK - Button disabled:', submitButton.disabled);

      // This is what SHOULD happen:
      expect(submitButton.textContent).toBe('Submitting...');
      expect(submitButton.disabled).toBe(true);
    }, { timeout: 500 });
  }, 10000);
});
