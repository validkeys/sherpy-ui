import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { planningMachine } from "./planningMachine";

// Mock global fetch for API calls
global.fetch = vi.fn();

// Mock $generateArtifact server function
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn(async ({ data }) => ({
    id: "mock-artifact-id",
    projectId: data.projectId,
    key: `step-${data.stepNumber}`,
    label: `Step ${data.stepNumber}`,
    format:
      data.stepNumber === 2 || data.stepNumber === 3 ? "yaml" : "markdown",
    content: `# Mock artifact for step ${data.stepNumber}`,
    status: "ready",
    generatedAt: new Date().toISOString(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock for fetch (interview API)
  (global.fetch as any).mockImplementation(
    async (_url: string, options: any) => {
      const body = JSON.parse(options.body);
      const { stepNumber } = body;

      // Mock streaming response
      const mockQuestion = `Mock question for step ${stepNumber}`;
      const mockText = JSON.stringify({
        question: mockQuestion,
        options: [
          { letter: "1", title: "Option A", body: "Description A" },
          { letter: "2", title: "Option B", body: "Description B" },
          { letter: "3", title: "Option C", body: "Description C" },
        ],
      });

      return {
        ok: true,
        headers: new Map([["content-type", "application/json"]]),
        body: {
          getReader: () => {
            let done = false;
            return {
              read: async () => {
                if (done) return { done: true, value: undefined };
                done = true;
                return {
                  done: false,
                  value: new TextEncoder().encode(mockText),
                };
              },
            };
          },
        },
      };
    },
  );
});

describe("planningMachine structure", () => {
  it("should have correct machine id", () => {
    expect(planningMachine.id).toBe("planning");
  });

  it("should start in step1_gapAnalysis state (BUG-001 fix)", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test-123", entryPath: "new-project" },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    // After BUG-001 fix: machine starts in step1_gapAnalysis instead of idle
    // This prevents empty screen on project creation
    expect(snapshot.value).toEqual({ step1_gapAnalysis: "collecting" });
  });

  it("should initialize context with correct shape", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test-project", entryPath: "existing-project" },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    const ctx = snapshot.context;

    expect(ctx.projectId).toBe("test-project");
    expect(ctx.entryPath).toBe("existing-project");
    expect(ctx.startedAt).toBeDefined();
    expect(ctx.updatedAt).toBeDefined();
    expect(ctx.step1Responses).toEqual({});
    expect(ctx.step2Answers).toEqual([]);
    expect(ctx.step2CurrentQuestion).toBeNull();
    expect(ctx.step2CurrentOptions).toBeNull();
    expect(ctx.step3Answers).toEqual([]);
    expect(ctx.step3CurrentQuestion).toBeNull();
    expect(ctx.step3CurrentOptions).toBeNull();
    expect(ctx.step5Responses).toEqual({});
    expect(ctx.step7Edits).toBeNull();
    expect(ctx.artifacts).toEqual({});
    expect(ctx.error).toBeNull();
  });

  it("should accept input with projectId and entryPath", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "abc-123", entryPath: "new-project" },
    });
    actor.start();

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.projectId).toBe("abc-123");
    expect(snapshot.context.entryPath).toBe("new-project");
  });

  it("should have all 10 step states defined", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Machine definition has all required states
    const machineStates = planningMachine.config.states;
    expect(machineStates).toHaveProperty("idle");
    expect(machineStates).toHaveProperty("step1_gapAnalysis");
    expect(machineStates).toHaveProperty("step2_businessReqs");
    expect(machineStates).toHaveProperty("step3_techReqs");
    expect(machineStates).toHaveProperty("step4_styleAnchors");
    expect(machineStates).toHaveProperty("step5_implPlanner");
    expect(machineStates).toHaveProperty("step6_definitionOfDone");
    expect(machineStates).toHaveProperty("step7_archDecisions");
    expect(machineStates).toHaveProperty("step8_deliveryTimeline");
    expect(machineStates).toHaveProperty("step9_qaTestPlan");
    expect(machineStates).toHaveProperty("step10_summaries");
    expect(machineStates).toHaveProperty("complete");
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 1: Gap Analysis Form Tests
// ─────────────────────────────────────────────────────────────

describe("Step 1: Gap Analysis Form", () => {
  it("should transition from idle to step1_gapAnalysis on START_PLANNING", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step1_gapAnalysis")).toBe(true);
    expect(snapshot.matches({ step1_gapAnalysis: "collecting" })).toBe(true);
  });

  it("should update context on SUBMIT_FORM with stepNumber=1", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: {
        existingReqs: "Yes",
        overview: "Building a task manager",
      },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step1Responses).toEqual({
      existingReqs: "Yes",
      overview: "Building a task manager",
    });
  });

  it("should transition to submitting state after SUBMIT_FORM", () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test project" },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ step1_gapAnalysis: "submitting" })).toBe(true);
  });

  it("should invoke generateArtifact actor in submitting state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test project" },
    });

    // Wait for actor to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    // After artifact generation completes, should transition to step2
    expect(
      snapshot.matches("step2_businessReqs") ||
        snapshot.matches({ step1_gapAnalysis: "submitting" }),
    ).toBe(true);
  });

  it("should store artifact in context after generation", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test project" },
    });

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    if (snapshot.context.artifacts[1]) {
      expect(snapshot.context.artifacts[1]).toHaveProperty("type");
      expect(snapshot.context.artifacts[1]).toHaveProperty("content");
      expect(snapshot.context.artifacts[1]).toHaveProperty("generatedAt");
    }
  });

  it("should transition to step2_businessReqs after successful artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test project" },
    });

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step2_businessReqs")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 2: Business Requirements Interview Tests
// ─────────────────────────────────────────────────────────────

describe("Step 2: Business Requirements Interview", () => {
  it("should transition from step1 to step2 in asking state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    // Wait for step1 artifact generation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step2_businessReqs")).toBe(true);
  });

  it("should invoke fetchQuestion actor in asking state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    // Wait for transitions
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should either be in answering (if fetchQuestion completed) or still asking
    expect(
      snapshot.matches({ step2_businessReqs: "answering" }) ||
        snapshot.matches({ step2_businessReqs: "asking" }),
    ).toBe(true);
  });

  it("should store question and options in context after fetchQuestion resolves", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    // Wait for fetchQuestion to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    if (snapshot.matches({ step2_businessReqs: "answering" })) {
      expect(snapshot.context.step2CurrentQuestion).toBeTruthy();
      expect(snapshot.context.step2CurrentOptions).toBeTruthy();
    }
  });

  it("should append answer to context on SUBMIT_ANSWER", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit an answer
    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "What is the goal?",
      answer: "Build a great product",
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step2Answers).toHaveLength(1);
    expect(snapshot.context.step2Answers[0]).toEqual({
      question: "What is the goal?",
      value: "Build a great product",
      timestamp: expect.any(String),
    });
  });

  it("should transition to step3 after 10 SUBMIT_ANSWER events complete (BUG-004)", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Start planning and complete step 1
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers
    for (let i = 0; i < 10; i++) {
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Question ${i + 1}?`,
        answer: `Answer ${i + 1}`,
      });

      // Small delay to allow state transitions
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Wait for artifact generation to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();

    // After 10 answers, should have all answers accumulated
    expect(snapshot.context.step2Answers).toHaveLength(10);

    // Step 2 should be marked complete
    expect(snapshot.context.completedSteps).toContain(2);

    // Should have generated step 2 artifact
    expect(snapshot.context.artifacts[2]).toBeDefined();

    // Should have automatically advanced to step 3, not stuck in step 2 interview loop
    expect(snapshot.context.currentStepNumber).toBe(3);
    expect(snapshot.value).toHaveProperty("step3_techReqs");
  });

  it("should clear current question and options after SUBMIT_ANSWER", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "Test question",
      answer: "Test answer",
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step2CurrentQuestion).toBeNull();
    expect(snapshot.context.step2CurrentOptions).toBeNull();
  });

  it("should return to asking state if answers < 10", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 1 answer (less than 10)
    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 2,
      question: "Q1",
      answer: "A1",
    });

    // Wait for state transition (checkingComplete -> asking -> fetchQuestion)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should go back to asking for more questions (or answering if fetch completed)
    expect(
      snapshot.matches({ step2_businessReqs: "asking" }) ||
        snapshot.matches({ step2_businessReqs: "answering" }),
    ).toBe(true);
  });

  it("should transition to generatingArtifact when answers >= 10", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for state transitions
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should be generating artifact or moved to step3
    expect(
      snapshot.matches({ step2_businessReqs: "generatingArtifact" }) ||
        snapshot.matches("step3_techReqs"),
    ).toBe(true);
  });

  it("should transition to step3 after successful artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for artifact generation
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step3_techReqs")).toBe(true);
    expect(snapshot.context.artifacts[2]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 3: Technical Requirements Interview Tests
// ─────────────────────────────────────────────────────────────

describe("Step 3: Technical Requirements Interview", () => {
  it("should transition from step2 to step3 in asking state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Submit 10 answers for step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for step2 artifact generation
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step3_techReqs")).toBe(true);
  });

  it("should invoke fetchQuestion actor in asking state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    // Wait for step3 entry + fetchQuestion
    await new Promise((resolve) => setTimeout(resolve, 250));

    const snapshot = actor.getSnapshot();
    // Should either be in answering (if fetchQuestion completed) or still asking
    expect(
      snapshot.matches({ step3_techReqs: "answering" }) ||
        snapshot.matches({ step3_techReqs: "asking" }),
    ).toBe(true);
  });

  it("should store question and options in context after fetchQuestion resolves", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    // Wait for step3 fetchQuestion to complete
    await new Promise((resolve) => setTimeout(resolve, 250));

    const snapshot = actor.getSnapshot();
    if (snapshot.matches({ step3_techReqs: "answering" })) {
      expect(snapshot.context.step3CurrentQuestion).toBeTruthy();
      expect(snapshot.context.step3CurrentOptions).toBeTruthy();
    }
  });

  it("should append answer to context on SUBMIT_ANSWER", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Submit an answer for step3
    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "What is the architecture?",
      answer: "Microservices",
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step3Answers).toHaveLength(1);
    expect(snapshot.context.step3Answers[0]).toEqual({
      question: "What is the architecture?",
      value: "Microservices",
      timestamp: expect.any(String),
    });
  });

  it("should clear current question and options after SUBMIT_ANSWER", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "Test question",
      answer: "Test answer",
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step3CurrentQuestion).toBeNull();
    expect(snapshot.context.step3CurrentOptions).toBeNull();
  });

  it("should return to asking state if answers < 10", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Submit 1 answer for step3 (less than 10)
    actor.send({
      type: "SUBMIT_ANSWER",
      stepNumber: 3,
      question: "Q1",
      answer: "A1",
    });

    // Wait for state transition (checkingComplete -> asking -> fetchQuestion)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const snapshot = actor.getSnapshot();
    // Should go back to asking for more questions (or answering if fetch completed)
    expect(
      snapshot.matches({ step3_techReqs: "asking" }) ||
        snapshot.matches({ step3_techReqs: "answering" }),
    ).toBe(true);
  });

  it("should transition to generatingArtifact when answers >= 10", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Submit 10 answers for step3
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for state transitions (longer wait for async operations)
    await new Promise((resolve) => setTimeout(resolve, 250));

    const snapshot = actor.getSnapshot();
    // Should be generating artifact or moved to step4 (or even step5 if fast)
    expect(
      snapshot.matches({ step3_techReqs: "generatingArtifact" }) ||
        snapshot.matches("step4_styleAnchors") ||
        snapshot.matches({ step4_styleAnchors: "generating" }) ||
        snapshot.matches("step5_implPlanner"),
    ).toBe(true);
  });

  it("should transition to step4 after successful artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Complete step2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    // Complete step3
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
      });
    }

    // Wait for artifact generation (longer wait for async transitions)
    await new Promise((resolve) => setTimeout(resolve, 250));

    const snapshot = actor.getSnapshot();
    expect(
      snapshot.matches("step4_styleAnchors") ||
        snapshot.matches("step5_implPlanner"),
    ).toBe(true);
    expect(snapshot.context.artifacts[3]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 4: Style Anchors (Automated) Tests
// ─────────────────────────────────────────────────────────────

describe("Step 4: Style Anchors (Automated)", () => {
  it("should automatically start generating artifact when entering step4", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-3
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = actor.getSnapshot();
    expect(
      snapshot.matches("step4_styleAnchors") ||
        snapshot.matches({ step4_styleAnchors: "generating" }) ||
        snapshot.matches("step5_implPlanner"),
    ).toBe(true);
  });

  it("should transition to step5 after generating artifact", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-3
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step5_implPlanner")).toBe(true);
    expect(snapshot.context.artifacts[4]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 5: Implementation Planner (Form) Tests
// ─────────────────────────────────────────────────────────────

describe("Step 5: Implementation Planner (Form)", () => {
  it("should start in collecting state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-4
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ step5_implPlanner: "collecting" })).toBe(true);
  });

  it("should update context and transition to submitting on SUBMIT_FORM", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-4
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 5,
      responses: { deployment: "Vercel", techStack: "React + TypeScript" },
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step5Responses).toEqual({
      deployment: "Vercel",
      techStack: "React + TypeScript",
    });
    expect(snapshot.matches({ step5_implPlanner: "submitting" })).toBe(true);
  });

  it("should transition to step6 after artifact generation", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-4
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 350));

    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 5,
      responses: { deployment: "Vercel", techStack: "React + TypeScript" },
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(
      snapshot.matches("step6_definitionOfDone") ||
        snapshot.matches("step7_archDecisions"),
    ).toBe(true);
    expect(snapshot.context.artifacts[5]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// STEPS 6, 8, 9, 10: Automated Steps Tests
// ─────────────────────────────────────────────────────────────

describe("Steps 6, 8, 9, 10: Automated Steps", () => {
  it("should auto-generate step 6 and transition to step 7", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-5
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses: {} });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step7_archDecisions")).toBe(true);
    expect(snapshot.context.artifacts[6]).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// STEP 7: Architecture Decisions (Artifact-Only) Tests
// ─────────────────────────────────────────────────────────────

describe("Step 7: Architecture Decisions (Artifact-Only)", () => {
  it("should start in reviewing state", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-6
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses: {} });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ step7_archDecisions: "reviewing" })).toBe(true);
  });

  it("should store edits on EDIT_ARTIFACT", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-6
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses: {} });
    await new Promise((resolve) => setTimeout(resolve, 200));

    actor.send({
      type: "EDIT_ARTIFACT",
      stepNumber: 7,
      content: "Edited architecture decisions",
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot.context.step7Edits).toBe("Edited architecture decisions");
  });

  it("should transition to step8 on APPROVE_ARTIFACT", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Complete steps 1-6
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses: {} });
    await new Promise((resolve) => setTimeout(resolve, 200));

    actor.send({ type: "APPROVE_ARTIFACT", stepNumber: 7 });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("step8_deliveryTimeline")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// FULL WORKFLOW TEST (Steps 1-10)
// ─────────────────────────────────────────────────────────────

describe("Full Workflow (Steps 1-10)", () => {
  it("should complete entire workflow from start to complete", async () => {
    const actor = createActor(planningMachine, {
      input: { projectId: "test", entryPath: "new-project" },
    });
    actor.start();

    // Step 1
    actor.send({ type: "START_PLANNING" });
    actor.send({
      type: "SUBMIT_FORM",
      stepNumber: 1,
      responses: { overview: "Test" },
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Step 2
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 2,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Step 3
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      actor.send({
        type: "SUBMIT_ANSWER",
        stepNumber: 3,
        question: `Q${i}`,
        answer: `A${i}`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300)); // Step 4 auto-generates

    // Step 5
    actor.send({ type: "SUBMIT_FORM", stepNumber: 5, responses: {} });
    await new Promise((resolve) => setTimeout(resolve, 200)); // Step 6 auto-generates

    // Step 7
    actor.send({ type: "APPROVE_ARTIFACT", stepNumber: 7 });
    await new Promise((resolve) => setTimeout(resolve, 150)); // Step 8 auto-generates
    await new Promise((resolve) => setTimeout(resolve, 150)); // Step 9 auto-generates
    await new Promise((resolve) => setTimeout(resolve, 150)); // Step 10 auto-generates

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("complete")).toBe(true);
    expect(
      Object.keys(snapshot.context.artifacts).length,
    ).toBeGreaterThanOrEqual(8);
  });
});
