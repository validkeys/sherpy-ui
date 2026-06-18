/**
 * BUG-009: XState Machine Not Initializing - localStorage key never created
 *
 * ROOT CAUSE TEST
 * ---------------
 * This test reproduces the exact scenario from Test Run #003:
 * 1. Clean localStorage (no existing state)
 * 2. Mount BuildRoute with PlanningMachineProvider
 * 3. Fill Gap Analysis form
 * 4. Submit form
 * 5. Assert: localStorage key should exist
 * 6. Assert: Actor state should be persisted
 *
 * EXPECTED: Test will FAIL, revealing why localStorage is never created
 *
 * HYPOTHESES TO TEST:
 * 1. Actor.start() not called during form submission
 * 2. React StrictMode double-mounting breaks actor lifecycle
 * 3. Race condition: submission before actor fully initialized
 * 4. Subscription to saveState not active when state changes
 * 5. saveState() called but localStorage.setItem fails silently
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STEP_KEYS } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { FormStep } from "./FormStep";

// Mock server functions
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn().mockResolvedValue({
    format: "markdown",
    content: "# Gap Analysis\n\nTest content",
    generatedAt: new Date().toISOString(),
  }),
  $generateQuestion: vi.fn().mockResolvedValue({
    question: "Mock question?",
    options: ["Option A", "Option B"],
  }),
  $assessGapAnalysisNeed: vi.fn().mockResolvedValue({
    needsGapAnalysis: true,
    reasoning: "Mock assessment",
    confidence: "high" as const,
  }),
}));

describe("BUG-009: XState Machine Not Initializing", () => {
  const TEST_PROJECT_ID = "L5WIIxKU";
  const STORAGE_KEY = `planning-machine-${TEST_PROJECT_ID}`;

  // Storage for mock localStorage
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Reset mock storage
    mockStorage = {};

    // Mock localStorage with proper clear() method
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

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    console.log(
      "[BUG-009 Test] localStorage mocked. Initial length:",
      Object.keys(mockStorage).length,
    );

    // Mock fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ question: "Test question?" }),
    });
  });

  afterEach(() => {
    // Clean up
    mockStorage = {};
  });

  it("should create localStorage key after mounting PlanningMachineProvider", async () => {
    console.log(
      "[BUG-009 Test] ===== TEST START: localStorage key creation =====",
    );

    // Render provider without StrictMode first to establish baseline
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: "new-project" }}
        storageKey={STORAGE_KEY}
      >
        <div>Provider mounted</div>
      </PlanningMachineProvider>,
    );

    // Wait for actor to start and persist initial state
    await waitFor(
      () => {
        const keys = Object.keys(mockStorage);
        console.log("[BUG-009 Test] mockStorage keys after mount:", keys);
        console.log("[BUG-009 Test] mockStorage length:", keys.length);

        if (keys.length === 0) {
          console.error("[BUG-009 Test] ❌ NO localStorage keys created");
        } else {
          const storedData = mockStorage[STORAGE_KEY];
          console.log("[BUG-009 Test] Stored data:", storedData);
        }

        // This should pass: actor should persist initial state on mount
        expect(mockStorage[STORAGE_KEY]).toBeTruthy();
      },
      { timeout: 2000 },
    );

    unmount();
  });

  it("should persist state changes when actor receives events", async () => {
    console.log(
      "[BUG-009 Test] ===== TEST START: state persistence on events =====",
    );

    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: "new-project" }}
        storageKey={STORAGE_KEY}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="active"
        />
      </PlanningMachineProvider>,
    );

    // Wait for initial persistence
    await waitFor(
      () => {
        expect(mockStorage[STORAGE_KEY]).toBeTruthy();
      },
      { timeout: 2000 },
    );

    const initialState = mockStorage[STORAGE_KEY];
    console.log("[BUG-009 Test] Initial state:", initialState);

    // Fill form fields
    const user = userEvent.setup();
    const requirementsInput = screen.getByLabelText(
      "Do you have existing requirements?",
    );
    const descriptionTextarea = screen.getByLabelText("What are you building?");

    await user.clear(requirementsInput);
    await user.type(requirementsInput, "No");
    await user.clear(descriptionTextarea);
    await user.type(descriptionTextarea, "Test project for BUG-009");

    console.log("[BUG-009 Test] Form filled");

    // Submit form
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    console.log("[BUG-009 Test] Form submitted");

    // Wait for state change to persist
    await waitFor(
      () => {
        const updatedState = mockStorage[STORAGE_KEY];
        console.log("[BUG-009 Test] State after submit:", updatedState);

        if (!updatedState) {
          console.error(
            "[BUG-009 Test] ❌ localStorage key deleted after submit",
          );
          throw new Error("localStorage key should still exist");
        }

        // State should have changed after submission
        expect(updatedState).not.toBe(initialState);

        // Parse and verify state contains form responses
        const parsed = JSON.parse(updatedState);
        console.log("[BUG-009 Test] Parsed state:", parsed);

        expect(parsed.context.step1Responses).toBeDefined();
        expect(parsed.context.step1Responses.existingRequirements).toBe("No");
        expect(parsed.context.step1Responses.projectDescription).toBe(
          "Test project for BUG-009",
        );
      },
      { timeout: 3000 },
    );

    unmount();
  });

  it("should handle StrictMode double-mounting without breaking persistence", async () => {
    console.log(
      "[BUG-009 Test] ===== TEST START: StrictMode double-mounting =====",
    );

    // This is the critical test: does StrictMode break actor lifecycle?
    const { unmount } = render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId: TEST_PROJECT_ID, entryPath: "new-project" }}
          storageKey={STORAGE_KEY}
        >
          <FormStep
            stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
            stepName="Gap Analysis"
            status="active"
          />
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // Wait for actor to stabilize after StrictMode double-mount
    await waitFor(
      () => {
        const keys = Object.keys(mockStorage);
        console.log(
          "[BUG-009 Test] mockStorage keys after StrictMode mount:",
          keys,
        );

        if (keys.length === 0) {
          console.error(
            "[BUG-009 Test] ❌ StrictMode double-mount broke persistence",
          );
        }

        expect(mockStorage[STORAGE_KEY]).toBeTruthy();
      },
      { timeout: 3000 },
    );

    const storedData = mockStorage[STORAGE_KEY];
    console.log("[BUG-009 Test] Stored data after StrictMode:", storedData);

    // Verify state structure
    const parsed = JSON.parse(storedData!);
    expect(parsed.context).toBeDefined();
    expect(parsed.context.projectId).toBe(TEST_PROJECT_ID);
    expect(parsed.value).toBeDefined();

    unmount();
  });

  it("should expose actor globally for debugging (window.__planningActor)", async () => {
    console.log("[BUG-009 Test] ===== TEST START: global actor exposure =====");

    render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: "new-project" }}
        storageKey={STORAGE_KEY}
      >
        <div>Provider mounted</div>
      </PlanningMachineProvider>,
    );

    // Wait for actor to mount
    await waitFor(
      () => {
        console.log(
          "[BUG-009 Test] window.__planningActor exists?",
          !!(window as any).__planningActor,
        );

        expect((window as any).__planningActor).toBeDefined();
      },
      { timeout: 2000 },
    );

    const actor = (window as any).__planningActor;
    const snapshot = actor.getSnapshot();

    console.log("[BUG-009 Test] Actor snapshot:", {
      status: snapshot.status,
      value: snapshot.value,
      projectId: snapshot.context.projectId,
    });

    expect(snapshot.status).toBe("active");
    expect(snapshot.context.projectId).toBe(TEST_PROJECT_ID);
  });

  it("REPRODUCTION: exact Test Run #003 scenario - form submit with clean localStorage", async () => {
    console.log(
      "[BUG-009 Test] ===== TEST START: Test Run #003 reproduction =====",
    );
    console.log(
      "[BUG-009 Test] Simulating: localStorage.clear() -> create project -> fill form -> submit",
    );

    // Verify clean state (Test Run #003 started with localStorage.clear())
    expect(Object.keys(mockStorage).length).toBe(0);

    // Mount the full component tree (simulates navigating to /project/:projectId/build)
    const { unmount } = render(
      <PlanningMachineProvider
        input={{ projectId: TEST_PROJECT_ID, entryPath: "new-project" }}
        storageKey={STORAGE_KEY}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="active"
        />
      </PlanningMachineProvider>,
    );

    console.log(
      "[BUG-009 Test] Component mounted. Checking initial localStorage...",
    );

    // Wait for initial state to persist
    await waitFor(
      () => {
        const hasKey = !!mockStorage[STORAGE_KEY];
        console.log("[BUG-009 Test] mockStorage has key after mount?", hasKey);

        if (!hasKey) {
          console.error(
            "[BUG-009 Test] ❌ REPRODUCTION SUCCESSFUL: No localStorage key created on mount",
          );
          console.error("[BUG-009 Test] This matches Test Run #003 behavior");
        }

        // If this assertion fails, we've successfully reproduced BUG-009
        expect(hasKey).toBe(true);
      },
      { timeout: 2000 },
    );

    // Fill form
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Do you have existing requirements?"),
      "No",
    );
    await user.type(
      screen.getByLabelText("What are you building?"),
      "Healthcare Portal - Test 2026-05-13",
    );

    console.log("[BUG-009 Test] Form filled with test data");

    // Submit form (this should trigger SUBMIT_FORM event)
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    console.log(
      "[BUG-009 Test] Submit clicked. Waiting for state persistence...",
    );

    // Wait for state to update after submission
    await waitFor(
      () => {
        const storedData = mockStorage[STORAGE_KEY];
        console.log("[BUG-009 Test] mockStorage after submit:", storedData);

        if (!storedData) {
          console.error(
            "[BUG-009 Test] ❌ CRITICAL: No localStorage after submit",
          );
          console.error(
            "[BUG-009 Test] This is the exact bug from Test Run #003",
          );
          throw new Error("BUG-009 reproduced: localStorage never created");
        }

        const parsed = JSON.parse(storedData);
        console.log("[BUG-009 Test] Parsed state:", {
          value: parsed.value,
          currentStepNumber: parsed.context.currentStepNumber,
          hasStep1Responses: !!parsed.context.step1Responses,
        });

        // Verify state changed after submission
        expect(parsed.context.step1Responses).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Wait additional time to check if transition to Step 2 occurs
    // (In Test Run #003, form stayed on Step 1 even after 60+ seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalState = mockStorage[STORAGE_KEY];
    if (finalState) {
      const parsed = JSON.parse(finalState);
      console.log("[BUG-009 Test] Final state after 2s:", {
        value: parsed.value,
        currentStepNumber: parsed.context.currentStepNumber,
      });

      if (parsed.context.currentStepNumber === 1) {
        console.warn(
          "[BUG-009 Test] ⚠️ Still on Step 1 after 2s - artifact generation may have failed",
        );
      }
    }

    unmount();
  });
});
