/**
 * BUG-012 Test Suite: React StrictMode + Stale Actor Reference
 *
 * These tests verify the fix for BUG-012 where FormStep captures a stale
 * actor reference during React StrictMode's double-mounting behavior.
 *
 * Test Strategy:
 * 1. Render FormStep in StrictMode (causes double mount)
 * 2. Fill form fields with valid data
 * 3. Submit form
 * 4. Verify actor received SUBMIT_FORM event
 * 5. Verify step1Responses populated in context
 *
 * Expected to FAIL before fix is applied.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { FormStep } from "./FormStep";

describe("BUG-012: FormStep StrictMode Compatibility", () => {
  // Clean up localStorage before each test to ensure clean state
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Clear global actor reference if it exists
    if (typeof window !== "undefined") {
      (window as any).__planningActor = undefined;
    }
    if (typeof global !== "undefined") {
      (global as any).__planningActor = undefined;
    }
  });

  afterEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
  });

  /**
   * TEST 1: Verify actor reference remains valid after StrictMode remount
   *
   * This is the core test for BUG-012. It verifies that when React StrictMode
   * unmounts and remounts the component, the FormStep's submit handler still
   * references the ACTIVE actor instance, not a stopped one.
   *
   * EXPECTED TO FAIL BEFORE FIX:
   * - Actor reference in submit handler points to stopped actor from first mount
   * - Event sent to stopped actor is silently ignored
   * - step1Responses remains empty
   * - Test times out waiting for responses
   */
  it("should send events to active actor after StrictMode remount", async () => {
    const projectId = "test-strictmode-actor-ref";
    const storageKey = `planning-machine-${projectId}`;

    // Render in StrictMode (triggers double-mount behavior)
    render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId, entryPath: "new-project" }}
          storageKey={storageKey}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // StrictMode has already caused mount → unmount → remount
    // At this point, without fix:
    // - Old actor (x:0) is stopped
    // - New actor (x:1) is active
    // - FormStep's handleSubmit still references x:0 ❌

    // Fill form with valid data
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    const textarea2 = screen.getByLabelText(/what are you building/i);

    fireEvent.change(textarea1, {
      target: { value: "No existing requirements" },
    });
    fireEvent.change(textarea2, {
      target: { value: "Healthcare patient portal for BUG-012 test" },
    });

    // Wait for Submit button to become enabled (form validation)
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).not.toBeDisabled();
    });

    // Click Submit button
    const submitButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    // CRITICAL ASSERTION: Verify actor received the event and updated context
    // This will FAIL before fix because event goes to stopped actor
    await waitFor(
      () => {
        const actor = (window as any).__planningActor;

        // Verify actor exists and is active (not stopped)
        expect(actor).toBeDefined();
        expect(actor.getSnapshot().status).toBe("active");

        // Verify step1Responses was populated with form data
        const snapshot = actor.getSnapshot();
        expect(snapshot.context.step1Responses).toEqual({
          existingRequirements: "No existing requirements",
          projectDescription: "Healthcare patient portal for BUG-012 test",
        });

        // Verify state transitioned from 'collecting' to 'assessingNeed' (Observation #4)
        // Note: We don't wait for 'step2_businessReqs' because that requires
        // API call completion which isn't mocked in this test. The key is that
        // the event was processed and step1Responses was populated.
        const stateValue = snapshot.value as any;
        expect(stateValue.step1_gapAnalysis).toBeDefined();
        expect(stateValue.step1_gapAnalysis).toBe("assessingNeed");
      },
      {
        timeout: 2000,
        // Provide helpful error message when this fails
        onTimeout: (_error) => {
          const actor = (window as any).__planningActor;
          if (actor) {
            console.error("Actor status:", actor.getSnapshot().status);
            console.error("Actor context:", actor.getSnapshot().context);
            console.error("Actor state:", actor.getSnapshot().value);
          }
          return new Error(
            "FormStep did not send SUBMIT_FORM event to actor. " +
              "This indicates the stale actor reference bug (BUG-012) is present.",
          );
        },
      },
    );
  });

  /**
   * TEST 2: Verify form submission works without StrictMode (baseline)
   *
   * This test verifies that form submission works correctly when StrictMode
   * is NOT enabled. This serves as a baseline to prove the issue is specific
   * to StrictMode's double-mounting behavior.
   *
   * EXPECTED TO PASS (even before fix):
   * - No double-mounting occurs
   * - Actor reference remains valid
   * - Form submission works normally
   */
  it("should work correctly without StrictMode (baseline)", async () => {
    const projectId = "test-no-strictmode";
    const storageKey = `planning-machine-${projectId}`;

    // Render WITHOUT StrictMode
    render(
      <PlanningMachineProvider
        input={{ projectId, entryPath: "new-project" }}
        storageKey={storageKey}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill form
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    const textarea2 = screen.getByLabelText(/what are you building/i);

    fireEvent.change(textarea1, { target: { value: "Baseline test" } });
    fireEvent.change(textarea2, { target: { value: "No StrictMode test" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    // Verify submission worked
    await waitFor(
      () => {
        const actor = (window as any).__planningActor;
        expect(actor.getSnapshot().context.step1Responses).toEqual({
          existingRequirements: "Baseline test",
          projectDescription: "No StrictMode test",
        });
      },
      { timeout: 3000 },
    );
  });

  /**
   * TEST 3: Verify multiple remounts don't break functionality
   *
   * This test simulates multiple component remounts (as might happen during
   * navigation or hot module reload) and verifies the actor reference stays
   * valid throughout.
   *
   * EXPECTED TO FAIL BEFORE FIX:
   * - Each remount creates a new actor and stops the old one
   * - FormStep may end up with reference to any stopped actor
   * - Submission fails randomly depending on which stopped actor is referenced
   */
  it("should handle multiple remounts correctly", async () => {
    const projectId = "test-multiple-remounts";
    const storageKey = `planning-machine-${projectId}`;

    const { rerender } = render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId, entryPath: "new-project" }}
          storageKey={storageKey}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // Force additional remounts
    for (let i = 0; i < 3; i++) {
      rerender(
        <StrictMode>
          <PlanningMachineProvider
            input={{ projectId, entryPath: "new-project" }}
            storageKey={storageKey}
          >
            <FormStep
              stepKey="step1_gapAnalysis"
              stepName="Gap Analysis"
              status="collecting"
            />
          </PlanningMachineProvider>
        </StrictMode>,
      );
    }

    // After 3 remounts, fill and submit form
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    const textarea2 = screen.getByLabelText(/what are you building/i);

    fireEvent.change(textarea1, {
      target: { value: "Multiple remounts test" },
    });
    fireEvent.change(textarea2, { target: { value: "Should still work" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    // Verify submission still works after multiple remounts
    await waitFor(
      () => {
        const actor = (window as any).__planningActor;
        expect(actor.getSnapshot().status).toBe("active");
        expect(actor.getSnapshot().context.step1Responses).toEqual({
          existingRequirements: "Multiple remounts test",
          projectDescription: "Should still work",
        });
      },
      { timeout: 5000 },
    );
  });

  /**
   * TEST 4: Verify actor reference updates when provider remounts
   *
   * This test directly verifies the fix mechanism: that the actor reference
   * in FormStep updates when the PlanningMachineProvider remounts with a
   * new actor instance.
   *
   * EXPECTED TO FAIL BEFORE FIX:
   * - Actor reference in FormStep doesn't update after provider remount
   * - useRef not implemented, so ref stays stale
   */
  it("should update actor reference when provider remounts", async () => {
    const projectId = "test-actor-ref-update";
    const storageKey = `planning-machine-${projectId}`;

    const { rerender } = render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId, entryPath: "new-project" }}
          storageKey={storageKey}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // Capture first actor ID
    const firstActor = (window as any).__planningActor;
    const firstActorId = firstActor?.id;

    // Force provider to remount by changing key
    rerender(
      <StrictMode>
        <PlanningMachineProvider
          key="remounted" // Force new instance
          input={{ projectId, entryPath: "new-project" }}
          storageKey={storageKey}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="collecting"
          />
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // Wait for new actor to be created
    await waitFor(() => {
      const currentActor = (window as any).__planningActor;
      expect(currentActor).toBeDefined();
      // Actor ID should have changed (new actor created)
      expect(currentActor.id).not.toBe(firstActorId);
    });

    // Now submit and verify it uses the NEW actor
    const textarea1 = screen.getByLabelText(/existing requirements/i);
    const textarea2 = screen.getByLabelText(/what are you building/i);

    fireEvent.change(textarea1, { target: { value: "After remount" } });
    fireEvent.change(textarea2, { target: { value: "New actor test" } });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    fireEvent.click(submitButton);

    // Verify event went to the NEW actor, not the old one
    await waitFor(
      () => {
        const currentActor = (window as any).__planningActor;
        expect(currentActor.getSnapshot().status).toBe("active");
        expect(currentActor.getSnapshot().context.step1Responses).toEqual({
          existingRequirements: "After remount",
          projectDescription: "New actor test",
        });
      },
      { timeout: 5000 },
    );
  });
});

/**
 * Additional Test Suite: PlanningMachineContext Cleanup
 *
 * These tests verify that the PlanningMachineContext properly handles
 * actor lifecycle during development vs production.
 */
describe("BUG-012: PlanningMachineContext Cleanup Behavior", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    if (typeof window !== "undefined") {
      (window as any).__planningActor = undefined;
    }
    if (typeof global !== "undefined") {
      (global as any).__planningActor = undefined;
    }
  });

  /**
   * TEST 5: Verify actor is NOT stopped on unmount in development
   *
   * In development mode (with StrictMode), we should NOT stop the actor
   * on unmount because the unmount might be from StrictMode's intentional
   * double-mount, not a real unmount.
   *
   * EXPECTED TO FAIL BEFORE FIX:
   * - Actor is stopped on every unmount
   * - Creates many stopped actors during development
   */
  it("should not stop actor on unmount in development mode", async () => {
    // Verify we're in development mode for this test
    expect(process.env.NODE_ENV).toBe("test"); // Jest runs in test mode, similar to dev

    const projectId = "test-dev-cleanup";
    const storageKey = `planning-machine-${projectId}`;

    const { unmount } = render(
      <StrictMode>
        <PlanningMachineProvider
          input={{ projectId, entryPath: "new-project" }}
          storageKey={storageKey}
        >
          <div>Test content</div>
        </PlanningMachineProvider>
      </StrictMode>,
    );

    // Capture actor reference before unmount
    const actor = (window as any).__planningActor;
    expect(actor).toBeDefined();
    expect(actor.getSnapshot().status).toBe("active");

    const _actorId = actor.id;

    // Unmount component (triggers cleanup)
    unmount();

    // AFTER FIX: In development, actor should still be active
    // BEFORE FIX: Actor would be stopped
    expect(actor.getSnapshot().status).toBe("active");

    // Actor should still be able to receive events (not stopped)
    // We check that the actor CAN process a valid event for its current state
    // In this case, the actor is in step1_gapAnalysis.collecting state
    // which accepts SUBMIT_FORM events
    const currentState = actor.getSnapshot().value as any;
    expect(currentState.step1_gapAnalysis).toBe("collecting");
    const canReceiveEvents = actor.getSnapshot().can({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: {},
    });
    expect(canReceiveEvents).toBe(true); // Active actors can receive events
  });
});
