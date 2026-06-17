/**
 * BUG-034 Solution: FormStep Interview Integration Tests
 *
 * Tests that FormStep correctly switches to interview mode after form submission
 * when Step 1 transitions to awaitingAnswer/fetchingQuestion states.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { STEP_KEYS } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { createPlanningMachine } from "../machines/planning-machine-factory";
import { FormStep } from "./FormStep";

describe("BUG-034: FormStep Interview Integration", () => {
  let mockGenerateQuestion: ReturnType<typeof vi.fn>;
  let mockSubmitAnswer: ReturnType<typeof vi.fn>;
  let mockAssessGapAnalysis: ReturnType<typeof vi.fn>;
  let mockCompleteStep: ReturnType<typeof vi.fn>;
  let mockSetArtifact: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGenerateQuestion = vi.fn().mockResolvedValue({
      question: "What are your main challenges?",
      options: undefined,
      isComplete: false,
    });

    mockSubmitAnswer = vi.fn().mockResolvedValue({});
    mockAssessGapAnalysis = vi
      .fn()
      .mockResolvedValue({ needsGapAnalysis: true });
    mockCompleteStep = vi.fn().mockResolvedValue({ success: true });
    mockSetArtifact = vi.fn().mockResolvedValue({ success: true });
  });

  it("should render initial form when status is 'collecting'", () => {
    const machine = createPlanningMachine("test-project-interview", {
      $generateQuestion: mockGenerateQuestion,
      $assessGapAnalysisNeed: mockAssessGapAnalysis,
      $submitAnswer: mockSubmitAnswer,
      $completeStep: mockCompleteStep,
      $setStepArtifact: mockSetArtifact,
    });

    const actor = createActor(machine, {
      input: {
        projectId: "test-project-interview",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    render(
      <PlanningMachineProvider
        actor={actor}
        input={{
          projectId: "test-project-interview",
          entryPath: "new-project",
        }}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Should show initial form fields
    expect(screen.getByLabelText(/existing requirements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what are you building/i)).toBeInTheDocument();
  });

  it("should render InterviewStep when status is 'awaitingAnswer'", async () => {
    const machine = createPlanningMachine("test-project-interview-2", {
      $generateQuestion: mockGenerateQuestion,
      $assessGapAnalysisNeed: mockAssessGapAnalysis,
      $submitAnswer: mockSubmitAnswer,
      $completeStep: mockCompleteStep,
      $setStepArtifact: mockSetArtifact,
    });

    const actor = createActor(machine, {
      input: {
        projectId: "test-project-interview-2",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    render(
      <PlanningMachineProvider
        actor={actor}
        input={{
          projectId: "test-project-interview-2",
          entryPath: "new-project",
        }}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="awaitingAnswer"
        />
      </PlanningMachineProvider>,
    );

    // Should render InterviewStep (shows heading)
    expect(
      await screen.findByRole("heading", { name: /gap analysis/i }),
    ).toBeInTheDocument();

    // Should NOT show initial form fields
    expect(
      screen.queryByLabelText(/existing requirements/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/what are you building/i),
    ).not.toBeInTheDocument();
  });

  it("should render InterviewStep when status is 'fetchingQuestion'", async () => {
    const machine = createPlanningMachine("test-project-interview-3", {
      $generateQuestion: mockGenerateQuestion,
      $assessGapAnalysisNeed: mockAssessGapAnalysis,
      $submitAnswer: mockSubmitAnswer,
      $completeStep: mockCompleteStep,
      $setStepArtifact: mockSetArtifact,
    });

    const actor = createActor(machine, {
      input: {
        projectId: "test-project-interview-3",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    render(
      <PlanningMachineProvider
        actor={actor}
        input={{
          projectId: "test-project-interview-3",
          entryPath: "new-project",
        }}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="fetchingQuestion"
        />
      </PlanningMachineProvider>,
    );

    // Should render InterviewStep
    expect(
      await screen.findByRole("heading", { name: /gap analysis/i }),
    ).toBeInTheDocument();

    // Should NOT show initial form fields
    expect(
      screen.queryByLabelText(/existing requirements/i),
    ).not.toBeInTheDocument();
  });

  it("should render form for Step 5 regardless of status (Step 5 has no interview)", () => {
    const machine = createPlanningMachine("test-project-interview-4", {
      $generateQuestion: mockGenerateQuestion,
      $assessGapAnalysisNeed: mockAssessGapAnalysis,
      $submitAnswer: mockSubmitAnswer,
      $completeStep: mockCompleteStep,
      $setStepArtifact: mockSetArtifact,
    });

    const actor = createActor(machine, {
      input: {
        projectId: "test-project-interview-4",
        entryPath: "new-project" as const,
      },
    });

    actor.start();

    render(
      <PlanningMachineProvider
        actor={actor}
        input={{
          projectId: "test-project-interview-4",
          entryPath: "new-project",
        }}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_5_IMPL_PLANNER}
          stepName="Implementation Planner"
          status="awaitingAnswer"
        />
      </PlanningMachineProvider>,
    );

    // Step 5 should always show form (no interview phase)
    expect(screen.getByLabelText(/deployment strategy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tech stack/i)).toBeInTheDocument();
  });
});
