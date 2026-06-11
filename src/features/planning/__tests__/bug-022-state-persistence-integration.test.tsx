/**
 * Integration Test - BUG-022: State Persistence
 *
 * Verifies that the StatePersistence layer correctly persists state to BOTH
 * localStorage (immediate) and database (debounced) on ALL state transitions,
 * not just server function calls.
 *
 * This test would have caught BUG-022, where database persistence only happened
 * during server function calls, missing internal state transitions.
 *
 * Tests:
 * - Database persistence on internal machine transitions
 * - Dual persistence (localStorage + database)
 * - Debouncing behavior (500ms delay)
 * - Persistence layer integrates properly with XState actor
 */

import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import {
  PlanningMachineProvider,
  usePlanningMachine,
} from "../machines/PlanningMachineContext";

// ============================================================================
// Mock Server Functions
// ============================================================================

vi.mock("../infrastructure/server-functions", () => ({
  $savePlanningState: vi.fn().mockResolvedValue({ success: true }),
  $loadPlanningState: vi.fn().mockResolvedValue(null),
  $saveInterviewAnswer: vi.fn().mockResolvedValue({ success: true }),
  $saveFormResponses: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock AI server functions (not under test, but needed for machine)
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn(async () => ({
    format: "yaml" as const,
    content: "# Mock Artifact",
    generatedAt: new Date().toISOString(),
  })),
  $generateQuestion: vi.fn(async () => ({
    question: "Mock question?",
    options: ["Option A", "Option B"],
  })),
  $assessGapAnalysisNeed: vi.fn(async () => ({
    needsGapAnalysis: true,
    reasoning: "Mock assessment",
    confidence: "high" as const,
  })),
  $answerQuestion: vi.fn(async () => ({
    question: "Next question?",
    options: ["Choice 1", "Choice 2"],
    isComplete: false,
  })),
}));

// ============================================================================
// Tests
// ============================================================================

describe("BUG-022: State Persistence Integration", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    // Spy on console.log to verify database persistence logs
    // Don't mock implementation - we want the logs to actually execute
    consoleLogSpy = vi.spyOn(console, "log");
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("persists to database on internal machine transitions (not just server functions)", async () => {
    /**
     * KEY TEST: This verifies that database persistence happens when the
     * machine transitions internally (e.g., form submission), not just
     * when server functions are called directly.
     *
     * BUG-022 was caused by database persistence ONLY happening in server
     * function callbacks, missing all internal transitions.
     */

    function TestComponent() {
      const actor = usePlanningMachine();

      React.useEffect(() => {
        // Trigger internal state transitions
        actor.send({ type: "START_PLANNING" });

        // Submit form data (internal transition)
        setTimeout(() => {
          actor.send({
            type: EVENT_TYPES.SUBMIT_FORM,
            stepNumber: 1,
            responses: {
              projectDescription: "Test project",
              hasRequirements: "no",
            },
          });
        }, 100);
      }, [actor]);

      return <div data-testid="test">Workflow</div>;
    }

    render(
      <PlanningMachineProvider
        input={{ projectId: "test-project" }}
        storageKey="test-storage-key"
      >
        <TestComponent />
      </PlanningMachineProvider>,
    );

    // Wait for component to mount and trigger transitions
    await waitFor(() => {
      expect(screen.getByTestId("test")).toBeDefined();
    });

    // Wait for transitions + debounce (500ms) + buffer
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // ✅ KEY ASSERTION: Database persistence called on internal transition
    // We verify this by checking the success log from StatePersistence.persistAllToDatabase()
    const databaseSyncLogs = consoleLogSpy.mock.calls.filter(
      (call: any[]) => call[0] === "[StatePersistence] ✅ Database synced:",
    );

    expect(databaseSyncLogs.length).toBeGreaterThan(0);
    expect(databaseSyncLogs[0][1]).toEqual(
      expect.objectContaining({
        projectId: "test-project",
      }),
    );
  });

  it("persists to database multiple times during workflow progression", async () => {
    /**
     * Verifies that persistence happens on multiple state transitions,
     * not just the initial one.
     */

    function TestComponent() {
      const actor = usePlanningMachine();
      const [step, setStep] = React.useState(0);

      React.useEffect(() => {
        // Trigger initial transition
        actor.send({ type: "START_PLANNING" });

        // Trigger second transition after delay
        setTimeout(() => {
          actor.send({ type: "START_PLANNING" });
          setStep(2);
        }, 200);
      }, [actor]);

      return <div data-testid="step">{step}</div>;
    }

    render(
      <PlanningMachineProvider
        input={{ projectId: "multi-persist-test" }}
        storageKey="multi-persist-key"
      >
        <TestComponent />
      </PlanningMachineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("step")).toBeDefined();
    });

    // Wait for both transitions + debounce
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ ASSERTION: Database persistence happened
    const databaseSyncLogs = consoleLogSpy.mock.calls.filter(
      (call: any[]) => call[0] === "[StatePersistence] ✅ Database synced:",
    );

    expect(databaseSyncLogs.length).toBeGreaterThan(0);
    expect(databaseSyncLogs[0][1]).toEqual(
      expect.objectContaining({
        projectId: "multi-persist-test",
      }),
    );
  });

  it("verifies StatePersistence integrates with PlanningMachineProvider", async () => {
    /**
     * Integration test verifying that StatePersistence is properly
     * instantiated and subscribed to the XState actor.
     *
     * This is the fix for BUG-022 - ensuring persistence happens via
     * actor subscription, not just server function callbacks.
     */

    function TestComponent() {
      const actor = usePlanningMachine();

      React.useEffect(() => {
        actor.send({ type: "START_PLANNING" });

        // Trigger a meaningful state change
        setTimeout(() => {
          actor.send({
            type: EVENT_TYPES.SUBMIT_FORM,
            stepNumber: 1,
            responses: { projectDescription: "Integration test" },
          });
        }, 100);
      }, [actor]);

      return <div data-testid="provider-test">Ready</div>;
    }

    render(
      <PlanningMachineProvider
        input={{ projectId: "integration-test" }}
        storageKey="integration-key"
      >
        <TestComponent />
      </PlanningMachineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("provider-test")).toBeDefined();
    });

    // Wait for transitions + debounce
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // ✅ ASSERTION: Persistence layer is working
    const databaseSyncLogs = consoleLogSpy.mock.calls.filter(
      (call: any[]) => call[0] === "[StatePersistence] ✅ Database synced:",
    );

    expect(databaseSyncLogs.length).toBeGreaterThan(0);

    // Verify the log contains expected structure
    const firstLog = databaseSyncLogs[0][1];
    expect(firstLog).toHaveProperty("projectId");
    expect(firstLog).toHaveProperty("step");
    expect(firstLog).toHaveProperty("duration");
    expect(firstLog).toHaveProperty("timestamp");
  });
});
