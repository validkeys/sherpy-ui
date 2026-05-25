/**
 * BUG-010: Gap Analysis form data not captured in XState context
 *
 * ROOT CAUSE TEST
 * ---------------
 * This test reproduces the exact scenario from Test Run #004:
 * 1. Mount PlanningMachineProvider with FormStep
 * 2. Fill Gap Analysis form with text values
 * 3. Submit form
 * 4. Assert: context.step1Responses should contain form data
 * 5. Assert: state should transition to "submitting" (generatingArtifact)
 *
 * EXPECTED FAILURE:
 * Test will FAIL because step1Responses remains empty {} after submission,
 * despite:
 * - Form fields being filled
 * - Submit button being enabled
 * - State transitioning to {step1_gapAnalysis: "collecting"}
 *
 * ROOT CAUSE HYPOTHESIS:
 * The SUBMIT_FORM event is sent to the machine without the form data payload,
 * OR the machine's assign action is not executing properly.
 *
 * This is DIFFERENT from BUG-009:
 * - BUG-009: localStorage never created (machine never initializes)
 * - BUG-010: localStorage exists, machine initializes, but form data not captured
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanningMachineProvider } from '../machines/PlanningMachineContext';
import { FormStep } from './FormStep';

describe('BUG-010: Gap Analysis form data not captured', () => {
  const TEST_PROJECT_ID = 'JILS-Akm';
  const STORAGE_KEY = `planning-machine-${TEST_PROJECT_ID}`;

  // Storage for mock localStorage
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Reset mock storage
    mockStorage = {};

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
      get length() {
        return Object.keys(mockStorage).length;
      },
      key: vi.fn((index: number) => {
        const keys = Object.keys(mockStorage);
        return keys[index] || null;
      }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    console.log('[BUG-010 Test] localStorage mocked. Initial length:', Object.keys(mockStorage).length);

    // Mock fetch for artifact generation API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        artifact: {
          type: 'yaml',
          content: '# Test artifact',
          generatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  afterEach(() => {
    // Clean up
    mockStorage = {};
  });

  it('REPRODUCTION: should capture form data in context.step1Responses after submit', async () => {
    console.log('[BUG-010 Test] ===== TEST START: Form data capture reproduction =====');

    // Mount the form (Test Run #004 scenario)
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: 'new-project' }}
        storageKey={STORAGE_KEY}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );

    console.log('[BUG-010 Test] FormStep mounted, waiting for initial state...');

    // Wait for machine to initialize
    await waitFor(() => {
      expect(mockStorage[STORAGE_KEY]).toBeTruthy();
    }, { timeout: 2000 });

    const initialState = mockStorage[STORAGE_KEY];
    const parsedInitial = JSON.parse(initialState!);
    console.log('[BUG-010 Test] Initial state:', {
      value: parsedInitial.value,
      step1Responses: parsedInitial.context.step1Responses,
    });

    // Verify initial state: step1Responses should be empty {}
    expect(parsedInitial.context.step1Responses).toEqual({});

    // Fill form with test data (exact data from Test Run #004)
    const user = userEvent.setup();

    const requirementsInput = screen.getByLabelText('Do you have existing requirements?');
    const descriptionTextarea = screen.getByLabelText('What are you building?');

    console.log('[BUG-010 Test] Filling form fields...');

    await user.clear(requirementsInput);
    await user.type(requirementsInput, 'No, starting from scratch');

    await user.clear(descriptionTextarea);
    await user.type(descriptionTextarea, 'Comprehensive healthcare portal with patient records');

    console.log('[BUG-010 Test] Form filled successfully');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit/i });

    // Verify button is enabled
    expect(submitButton).not.toBeDisabled();

    console.log('[BUG-010 Test] Clicking Submit button...');
    await user.click(submitButton);
    console.log('[BUG-010 Test] Submit button clicked');

    // Wait for state update after submission
    await waitFor(() => {
      const updatedState = mockStorage[STORAGE_KEY];

      if (!updatedState) {
        console.error('[BUG-010 Test] ❌ localStorage key missing after submit');
        throw new Error('localStorage key should exist');
      }

      const parsed = JSON.parse(updatedState);
      console.log('[BUG-010 Test] State after submit:', {
        value: parsed.value,
        step1Responses: parsed.context.step1Responses,
        hasResponses: Object.keys(parsed.context.step1Responses || {}).length > 0,
      });

      // BUG REPRODUCTION:
      // This assertion should FAIL because step1Responses is empty {}
      // despite the form being filled and submitted
      const responses = parsed.context.step1Responses;

      if (!responses || Object.keys(responses).length === 0) {
        console.error('[BUG-010 Test] ❌ BUG REPRODUCED: step1Responses is empty!');
        console.error('[BUG-010 Test] Expected existingRequirements and projectDescription');
        console.error('[BUG-010 Test] Got:', responses);
      }

      // These assertions will FAIL until the bug is fixed
      expect(responses).toBeDefined();
      expect(responses.existingRequirements).toBe('No, starting from scratch');
      expect(responses.projectDescription).toBe('Comprehensive healthcare portal with patient records');
    }, { timeout: 3000 });

    // Verify state transitioned to submitting/generatingArtifact
    const finalState = mockStorage[STORAGE_KEY];
    const parsedFinal = JSON.parse(finalState!);

    console.log('[BUG-010 Test] Final state:', {
      value: parsedFinal.value,
      currentStepNumber: parsedFinal.context.currentStepNumber,
    });

    // State should transition to submitting (nested state)
    expect(parsedFinal.value).toHaveProperty('step1_gapAnalysis');

    unmount();
  });

  it('should verify SUBMIT_FORM event payload includes form data', async () => {
    console.log('[BUG-010 Test] ===== TEST START: Event payload verification =====');

    // This test verifies that the event sent to the machine includes the form data
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: 'new-project' }}
        storageKey={STORAGE_KEY}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockStorage[STORAGE_KEY]).toBeTruthy();
    }, { timeout: 2000 });

    // Spy on the actor's send method
    const actor = (window as any).__planningActor;
    const originalSend = actor.send.bind(actor);
    let capturedEvent: any = null;

    actor.send = vi.fn((event: any) => {
      console.log('[BUG-010 Test] Intercepted event:', event);
      capturedEvent = event;
      return originalSend(event);
    });

    // Fill and submit form
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText('Do you have existing requirements?'),
      'Yes'
    );
    await user.type(
      screen.getByLabelText('What are you building?'),
      'Test project'
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    // Verify event was sent
    await waitFor(() => {
      expect(capturedEvent).toBeTruthy();
    }, { timeout: 1000 });

    console.log('[BUG-010 Test] Captured event:', capturedEvent);

    // Verify event structure
    expect(capturedEvent.type).toBe('SUBMIT_FORM');
    expect(capturedEvent.stepNumber).toBe(1);
    expect(capturedEvent.responses).toBeDefined();

    // This is the KEY assertion: does the event include the form data?
    expect(capturedEvent.responses.existingRequirements).toBe('Yes');
    expect(capturedEvent.responses.projectDescription).toBe('Test project');

    unmount();
  });

  it('should verify machine assigns step1Responses from event.responses', async () => {
    console.log('[BUG-010 Test] ===== TEST START: Machine assign verification =====');

    // This test verifies the machine's assign action is correct
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: 'new-project' }}
        storageKey={STORAGE_KEY}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>
    );

    await waitFor(() => {
      expect(mockStorage[STORAGE_KEY]).toBeTruthy();
    }, { timeout: 2000 });

    // Get initial snapshot
    const actor = (window as any).__planningActor;
    const initialSnapshot = actor.getSnapshot();

    console.log('[BUG-010 Test] Initial context.step1Responses:', initialSnapshot.context.step1Responses);
    expect(initialSnapshot.context.step1Responses).toEqual({});

    // Fill form
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText('Do you have existing requirements?'),
      'No'
    );
    await user.type(
      screen.getByLabelText('What are you building?'),
      'Test app'
    );

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Wait for context update
    await waitFor(() => {
      const snapshot = actor.getSnapshot();
      const responses = snapshot.context.step1Responses;

      console.log('[BUG-010 Test] Updated context.step1Responses:', responses);

      // This is the critical check: did the machine's assign action work?
      expect(responses).toBeDefined();
      expect(Object.keys(responses).length).toBeGreaterThan(0);
      expect(responses.existingRequirements).toBe('No');
      expect(responses.projectDescription).toBe('Test app');
    }, { timeout: 3000 });

    unmount();
  });
});
