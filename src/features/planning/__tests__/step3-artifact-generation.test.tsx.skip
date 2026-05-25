/**
 * Step 3 Artifact Generation Test
 *
 * Verifies that Step 3 (Technical Requirements Interview) progresses correctly
 * and generates its artifact (Technical Requirements Document).
 *
 * Test Flow:
 * 1. Start at Step 1 (Gap Analysis)
 * 2. Complete Step 1 form
 * 3. Complete Step 2 interview (Business Requirements)
 * 4. Verify Step 2 artifact generates
 * 5. Complete Step 3 interview (Technical Requirements)
 * 6. Verify Step 3 artifact generates
 * 7. Verify transition to Step 4
 */

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActorRefFrom } from "xstate";
import { StepContainer } from "../components/StepContainer";
import {
  PlanningMachineProvider,
  usePlanningMachine,
} from "../machines/PlanningMachineContext";
import type { planningMachine } from "../machines/planningMachine";

// Track artifact generation calls
const artifactGenerationCalls: Array<{ stepNumber: number; answers: unknown }> =
  [];

// Mock the server-side AI functions
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn(async ({ data }) => {
    artifactGenerationCalls.push({
      stepNumber: data.stepNumber,
      answers: data.answers,
    });

    return {
      format: "yaml" as const,
      content: `# Mock Artifact for Step ${data.stepNumber}\n\nGenerated from: ${JSON.stringify(data.answers)}`,
      generatedAt: new Date().toISOString(),
    };
  }),
  $askQuestion: vi.fn(async ({ data }) => {
    // Return different questions based on step
    const stepNumber = data.stepNumber;
    const answerCount = data.answers?.length || 0;

    if (stepNumber === 2) {
      // Business Requirements - 2 questions
      if (answerCount === 0) {
        return {
          question: "What is the primary problem this project solves?",
          options: ["Automate workflow", "Improve existing", "New capability"],
          isComplete: false,
        };
      }
      return {
        question: "Who are the primary users?",
        options: ["Internal staff", "External customers", "Both"],
        isComplete: true, // Mark complete after 2 questions
      };
    }

    if (stepNumber === 3) {
      // Technical Requirements - 2 questions
      if (answerCount === 0) {
        return {
          question: "What is the deployment environment?",
          options: ["Cloud", "On-premise", "Hybrid"],
          isComplete: false,
        };
      }
      return {
        question: "What is the expected scale?",
        options: ["Small (<100 users)", "Medium (100-1000)", "Large (>1000)"],
        isComplete: true, // Mark complete after 2 questions
      };
    }

    return {
      question: "Default question?",
      options: ["Option A", "Option B"],
      isComplete: true,
    };
  }),
  $answerQuestion: vi.fn(async ({ data }) => {
    // After answering, call $askQuestion to get next question
    const stepNumber = data.stepNumber;
    const answerCount = (data.answers?.length || 0) + 1;

    if (stepNumber === 2) {
      if (answerCount === 1) {
        return {
          question: "Who are the primary users?",
          options: ["Internal staff", "External customers", "Both"],
          isComplete: false,
        };
      }
      return {
        question: "",
        options: [],
        isComplete: true,
      };
    }

    if (stepNumber === 3) {
      if (answerCount === 1) {
        return {
          question: "What is the expected scale?",
          options: ["Small (<100 users)", "Medium (100-1000)", "Large (>1000)"],
          isComplete: false,
        };
      }
      return {
        question: "",
        options: [],
        isComplete: true,
      };
    }

    return {
      question: "",
      options: [],
      isComplete: true,
    };
  }),
}));

describe("Step 3: Technical Requirements Artifact Generation", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    vi.clearAllMocks();
    artifactGenerationCalls.length = 0; // Clear tracking array
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("progresses through Steps 1-3 and generates artifacts correctly", {
    timeout: 30000,
  }, async () => {
    let capturedActor: ActorRefFrom<typeof planningMachine> | null = null;

    function TestComponent() {
      const actor = usePlanningMachine();

      React.useEffect(() => {
        capturedActor = actor;
        actor.send({ type: "START_PLANNING" });
      }, [actor]);

      return (
        <div data-testid="test-container">
          <StepContainer />
        </div>
      );
    }

    render(
      <PlanningMachineProvider
        input={{ projectId: "step3-test", entryPath: "new-project" }}
      >
        <TestComponent />
      </PlanningMachineProvider>,
    );

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Gap Analysis (Form)
    // ═══════════════════════════════════════════════════════════

    await waitFor(
      () => {
        expect(screen.getByText(/Step 1 of 10/i)).toBeDefined();
      },
      { timeout: 3000 },
    );

    // Fill Step 1 form
    const projectDescInput = screen.getByLabelText(
      /what are you building/i,
    ) as HTMLTextAreaElement;
    await user.type(projectDescInput, "Healthcare patient portal");

    const requirementsInput = screen.getByLabelText(
      /do you have existing requirements/i,
    ) as HTMLInputElement;
    await user.type(requirementsInput, "Yes, PRD available");

    // Submit Step 1
    const submitStep1Button = screen.getByRole("button", { name: /submit/i });
    await user.click(submitStep1Button);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Business Requirements Interview
    // ═══════════════════════════════════════════════════════════

    // Wait for Step 2 to load (includes Step 1 artifact generation)
    await waitFor(
      () => {
        expect(screen.getByText(/Step 2 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    // Verify Step 1 artifact was generated
    expect(artifactGenerationCalls).toHaveLength(1);
    expect(artifactGenerationCalls[0].stepNumber).toBe(1);

    // Wait for first question to load
    await waitFor(
      () => {
        expect(screen.getByText(/What is the primary problem/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Answer first question
    const option1Button = screen.getByRole("button", {
      name: /Automate workflow/i,
    });
    await user.click(option1Button);

    // Wait for second question
    await waitFor(
      () => {
        expect(screen.getByText(/Who are the primary users/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Answer second question (completes Step 2 interview)
    const option2Button = screen.getByRole("button", {
      name: /Internal staff/i,
    });
    await user.click(option2Button);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Technical Requirements Interview
    // ═══════════════════════════════════════════════════════════

    // Wait for Step 3 to load (includes Step 2 artifact generation)
    await waitFor(
      () => {
        expect(screen.getByText(/Step 3 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    // Verify Step 2 artifact was generated
    expect(artifactGenerationCalls.length).toBeGreaterThanOrEqual(2);
    const step2Artifact = artifactGenerationCalls.find(
      (call) => call.stepNumber === 2,
    );
    expect(step2Artifact).toBeDefined();

    // Wait for first technical question to load
    await waitFor(
      () => {
        expect(
          screen.getByText(/What is the deployment environment/i),
        ).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Answer first technical question
    const techOption1Button = screen.getByRole("button", { name: /Cloud/i });
    await user.click(techOption1Button);

    // Wait for second technical question
    await waitFor(
      () => {
        expect(screen.getByText(/What is the expected scale/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    // Answer second technical question (completes Step 3 interview)
    const techOption2Button = screen.getByRole("button", { name: /Medium/i });
    await user.click(techOption2Button);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Verify Step 3 artifact generated and transition
    // ═══════════════════════════════════════════════════════════

    // Wait for Step 4 to load (includes Step 3 artifact generation)
    await waitFor(
      () => {
        expect(screen.getByText(/Step 4 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    // Verify Step 3 artifact was generated
    const step3Artifact = artifactGenerationCalls.find(
      (call) => call.stepNumber === 3,
    );
    expect(step3Artifact).toBeDefined();
    expect(step3Artifact?.stepNumber).toBe(3);

    // Verify the actor state shows Step 3 is completed
    expect(capturedActor).not.toBeNull();
    if (capturedActor) {
      const snapshot = capturedActor.getSnapshot();
      const context = snapshot.context;

      // Step 3 should be in completed steps
      expect(context.completedSteps).toContain(3);

      // Step 3 answers should be stored
      expect(context.step3Answers).toBeDefined();
      expect(context.step3Answers.length).toBe(2);

      // Step 3 artifact should be generated
      const step3ArtifactInContext = context.artifacts.find(
        (a) => a.stepNumber === 3,
      );
      expect(step3ArtifactInContext).toBeDefined();
      expect(step3ArtifactInContext?.format).toBe("yaml");
      expect(step3ArtifactInContext?.content).toContain(
        "Mock Artifact for Step 3",
      );
    }

    // Verify we're now at Step 4
    expect(screen.getByText(/Step 4 of 10/i)).toBeDefined();
  });

  it("verifies Step 3 artifact contains technical requirements data", {
    timeout: 30000,
  }, async () => {
    let capturedActor: ActorRefFrom<typeof planningMachine> | null = null;

    function TestComponent() {
      const actor = usePlanningMachine();

      React.useEffect(() => {
        capturedActor = actor;
        actor.send({ type: "START_PLANNING" });
      }, [actor]);

      return <StepContainer />;
    }

    render(
      <PlanningMachineProvider
        input={{ projectId: "step3-artifact-test", entryPath: "new-project" }}
      >
        <TestComponent />
      </PlanningMachineProvider>,
    );

    // Complete Step 1
    await waitFor(
      () => {
        expect(screen.getByLabelText(/what are you building/i)).toBeDefined();
      },
      { timeout: 3000 },
    );

    await user.type(
      screen.getByLabelText(/what are you building/i),
      "Test project",
    );
    await user.type(
      screen.getByLabelText(/do you have existing requirements/i),
      "No",
    );
    await user.click(screen.getByRole("button", { name: /submit/i }));

    // Complete Step 2
    await waitFor(
      () => {
        expect(screen.getByText(/Step 2 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText(/What is the primary problem/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    await user.click(
      screen.getByRole("button", { name: /Automate workflow/i }),
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Who are the primary users/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    await user.click(screen.getByRole("button", { name: /Internal staff/i }));

    // Complete Step 3
    await waitFor(
      () => {
        expect(screen.getByText(/Step 3 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText(/What is the deployment environment/i),
        ).toBeDefined();
      },
      { timeout: 5000 },
    );

    await user.click(screen.getByRole("button", { name: /Cloud/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/What is the expected scale/i)).toBeDefined();
      },
      { timeout: 5000 },
    );

    await user.click(screen.getByRole("button", { name: /Large/i }));

    // Wait for Step 4 (confirms Step 3 artifact generated)
    await waitFor(
      () => {
        expect(screen.getByText(/Step 4 of 10/i)).toBeDefined();
      },
      { timeout: 10000 },
    );

    // Verify Step 3 artifact generation was called with correct data
    const step3ArtifactCall = artifactGenerationCalls.find(
      (call) => call.stepNumber === 3,
    );
    expect(step3ArtifactCall).toBeDefined();

    // Verify the answers were passed to artifact generation
    const answers = step3ArtifactCall?.answers as Array<{
      question: string;
      answer: string;
    }>;
    expect(answers).toBeDefined();
    expect(answers.length).toBeGreaterThan(0);

    // Verify artifact is in machine context
    if (capturedActor) {
      const snapshot = capturedActor.getSnapshot();
      const step3Artifact = snapshot.context.artifacts.find(
        (a) => a.stepNumber === 3,
      );

      expect(step3Artifact).toBeDefined();
      expect(step3Artifact?.content).toContain("Mock Artifact for Step 3");
      expect(step3Artifact?.format).toBe("yaml");
      expect(step3Artifact?.generatedAt).toBeDefined();
    }
  });
});
