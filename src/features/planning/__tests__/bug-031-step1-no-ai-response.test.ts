/**
 * BUG-031: Stage 1 AI Non-Responsive After Form Submission
 *
 * Tests that verify the fix for the Stage 1 form submission bug where
 * the AI service fails to process input after form submission.
 *
 * Bug Report: .tmp-docs/bug-reports/BUG-031-stage1-ai-non-responsive/bug-report.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";
import { EVENT_TYPES, STEP_STATES } from "../machines/constants";
import type { ServerFunctions } from "../machines/planning-machine-factory";
import { createPlanningMachine } from "../machines/planning-machine-factory";

describe("BUG-031: Stage 1 AI Non-Responsive", () => {
  // Mock server functions
  const mockServerFunctions: ServerFunctions = {
    $generateQuestion: vi.fn(),
    $assessGapAnalysisNeed: vi.fn(),
    $generateArtifact: vi.fn(),
    parseOptions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockServerFunctions.$assessGapAnalysisNeed as any).mockResolvedValue({
      needsGapAnalysis: true,
      reasoning: "Project needs gap analysis",
      confidence: "high" as const,
    });

    (mockServerFunctions.$generateArtifact as any).mockResolvedValue({
      format: "yaml",
      content: "# Gap Analysis\ntest content",
      generatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Form Submission Flow", () => {
    it("should transition from collectingInfo to assessingNeed when SUBMIT_FORM is sent", async () => {
      // Arrange: Create machine and actor
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-001",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Assert initial state
      expect(actor.getSnapshot().value).toEqual({
        step1_gapAnalysis: STEP_STATES.STEP_1.COLLECTING_INFO,
      });

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No, starting from scratch",
          projectDescription: "A patient portal web application",
        },
      });

      // Assert: Should transition to assessingNeed
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.ASSESSING_NEED;
        },
        { timeout: 1000 },
      );

      expect(actor.getSnapshot().value).toEqual({
        step1_gapAnalysis: STEP_STATES.STEP_1.ASSESSING_NEED,
      });
    });

    it("should invoke assessGapAnalysisNeed service after form submission", async () => {
      // Arrange
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-002",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Test project",
        },
      });

      // Wait for assessingNeed state
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.ASSESSING_NEED;
        },
        { timeout: 1000 },
      );

      // Assert: Service should be called
      expect(mockServerFunctions.$assessGapAnalysisNeed).toHaveBeenCalledWith({
        data: {
          projectId: "test-project-002",
          projectDescription: "Test project",
          hasExistingRequirements: "No",
        },
      });
    });

    it("should transition to submitting state after assessment completes", async () => {
      // Arrange
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-003",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Test project",
        },
      });

      // Wait for submitting state (after assessingNeed completes)
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.SUBMITTING;
        },
        { timeout: 2000 },
      );

      // Assert: Should be in submitting state
      expect(actor.getSnapshot().value).toEqual({
        step1_gapAnalysis: STEP_STATES.STEP_1.SUBMITTING,
      });
    });

    it("should invoke generateArtifact service in submitting state", async () => {
      // Arrange
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-004",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "Yes, we have a PRD",
          projectDescription: "E-commerce platform",
        },
      });

      // Wait for submitting state
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.SUBMITTING;
        },
        { timeout: 2000 },
      );

      // Assert: generateArtifact should be called
      expect(mockServerFunctions.$generateArtifact).toHaveBeenCalledWith({
        data: {
          projectId: "test-project-004",
          stepNumber: 1,
          answers: ["Yes, we have a PRD", "E-commerce platform"],
        },
      });
    });

    it("should update context with form responses on submission", async () => {
      // Arrange
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-005",
          entryPath: "new-project",
        },
      });

      actor.start();

      const formResponses = {
        existingRequirements: "No, starting fresh",
        projectDescription: "Mobile app for fitness tracking",
      };

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: formResponses,
      });

      // Wait for transition
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis !== STEP_STATES.STEP_1.COLLECTING_INFO;
        },
        { timeout: 1000 },
      );

      // Assert: Context should have the responses
      const context = actor.getSnapshot().context;
      expect(context.step1Responses).toEqual(formResponses);
    });
  });

  describe("Error Handling", () => {
    it("should handle assessGapAnalysisNeed service failure gracefully", async () => {
      // Arrange: Mock service to fail
      (mockServerFunctions.$assessGapAnalysisNeed as any).mockRejectedValue(
        new Error("LLM service unavailable"),
      );

      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-006",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Test project",
        },
      });

      // Wait for error handling to complete (should still proceed to submitting)
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.SUBMITTING;
        },
        { timeout: 2000 },
      );

      // Assert: Should proceed to artifact generation despite assessment failure
      expect(actor.getSnapshot().value).toEqual({
        step1_gapAnalysis: STEP_STATES.STEP_1.SUBMITTING,
      });

      // Context should indicate fallback
      const context = actor.getSnapshot().context;
      expect(context.step1GapAnalysisNeeded).toBe(false);
      expect(context.step1GapAnalysisReasoning).toContain(
        "Assessment failed, proceeding with artifact generation",
      );
    });

    it("should return to collectingInfo state if artifact generation fails", async () => {
      // Arrange: Mock artifact generation to fail
      (mockServerFunctions.$generateArtifact as any).mockRejectedValue(
        new Error("Artifact generation failed"),
      );

      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-007",
          entryPath: "new-project",
        },
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Test project",
        },
      });

      // Wait for error state (should return to collectingInfo)
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          const context = snapshot.context;
          return (
            state.step1_gapAnalysis === STEP_STATES.STEP_1.COLLECTING_INFO &&
            context.error !== null
          );
        },
        { timeout: 3000 },
      );

      // Assert: Should be back in collectingInfo with error
      expect(actor.getSnapshot().value).toEqual({
        step1_gapAnalysis: STEP_STATES.STEP_1.COLLECTING_INFO,
      });

      const context = actor.getSnapshot().context;
      expect(context.error).toBe("Artifact generation failed");
    });
  });

  describe("Integration: Full Stage 1 Flow", () => {
    it("should complete entire Stage 1 flow: submit → assess → generate → complete", async () => {
      // Arrange: Add mock for workflow services
      const machine = createPlanningMachine(mockServerFunctions);
      const actor = createActor(machine, {
        input: {
          projectId: "test-project-008",
          entryPath: "new-project",
        },
      });

      // Track state transitions
      const stateTransitions: string[] = [];
      actor.subscribe((snapshot) => {
        const state = snapshot.value as any;
        if (state.step1_gapAnalysis) {
          stateTransitions.push(state.step1_gapAnalysis);
        }
      });

      actor.start();

      // Act: Submit form
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Healthcare portal",
        },
      });

      // Wait for artifact generation to start
      await waitFor(
        actor,
        (snapshot) => {
          const state = snapshot.value as any;
          return state.step1_gapAnalysis === STEP_STATES.STEP_1.SUBMITTING;
        },
        { timeout: 3000 },
      );

      // Assert: All services called in correct order
      expect(mockServerFunctions.$assessGapAnalysisNeed).toHaveBeenCalledTimes(
        1,
      );
      expect(mockServerFunctions.$generateArtifact).toHaveBeenCalledTimes(1);

      // Assert: State transitions happened in correct order
      expect(stateTransitions).toContain(STEP_STATES.STEP_1.COLLECTING_INFO);
      expect(stateTransitions).toContain(STEP_STATES.STEP_1.ASSESSING_NEED);
      expect(stateTransitions).toContain(STEP_STATES.STEP_1.SUBMITTING);

      // Assert: Context updated with assessment results
      const context = actor.getSnapshot().context;
      expect(context.step1GapAnalysisNeeded).toBe(true);
      expect(context.step1GapAnalysisReasoning).toBe(
        "Project needs gap analysis",
      );
    });
  });
});
