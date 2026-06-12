import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ProjectStepState } from "../types";
import { loadStepState, saveStepState } from "./repository";

describe("Infrastructure Repository", () => {
  const TEST_PROJECT_ID = "test-repo-project";

  beforeEach(async () => {
    // Create test project (required for foreign key constraint)
    const { db } = await import("@/lib/db");
    db.prepare(
      "INSERT OR IGNORE INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      TEST_PROJECT_ID,
      "TST-001",
      "Test Project",
      "active",
      "scratch",
      1,
      new Date().toISOString(),
      new Date().toISOString(),
    );
  });

  const createMockState = (): ProjectStepState => ({
    projectId: TEST_PROJECT_ID,
    currentStep: 2,
    steps: [
      {
        stepNumber: 1,
        name: "Project Setup",
        status: "complete",
        question: "Project details?",
        answers: [
          {
            question: "Project name?",
            value: "Test Project",
            submittedAt: new Date().toISOString(),
          },
        ],
      },
      {
        stepNumber: 2,
        name: "Business Requirements",
        status: "now",
        question: "Business needs?",
        answers: [],
      },
      {
        stepNumber: 3,
        name: "Technical Requirements",
        status: "pending",
        question: "Tech stack?",
      },
      {
        stepNumber: 4,
        name: "Architecture",
        status: "pending",
        question: "Architecture?",
      },
      {
        stepNumber: 5,
        name: "Implementation Plan",
        status: "pending",
        question: "Plan?",
      },
      {
        stepNumber: 6,
        name: "Security",
        status: "pending",
        question: "Security?",
      },
      {
        stepNumber: 7,
        name: "Testing",
        status: "pending",
        question: "Testing?",
      },
      {
        stepNumber: 8,
        name: "Deployment",
        status: "pending",
        question: "Deployment?",
      },
      {
        stepNumber: 9,
        name: "Monitoring",
        status: "pending",
        question: "Monitoring?",
      },
      {
        stepNumber: 10,
        name: "Documentation",
        status: "pending",
        question: "Docs?",
      },
    ],
  });

  afterEach(async () => {
    // Cleanup test data
    const { _clearPlanningState } = await import("@/lib/db/planning");
    const { db } = await import("@/lib/db");
    _clearPlanningState();
    db.prepare("DELETE FROM projects WHERE id = ?").run(TEST_PROJECT_ID);
  });

  describe("saveStepState", () => {
    it("should save state to database", async () => {
      const mockState = createMockState();

      await saveStepState(mockState);

      // Verify by loading
      const loaded = await loadStepState(TEST_PROJECT_ID);
      expect(loaded).toBeDefined();
      expect(loaded?.projectId).toBe(TEST_PROJECT_ID);
      expect(loaded?.currentStep).toBe(2);
      expect(loaded?.steps).toHaveLength(10);
    });

    it("should update existing state on second save", async () => {
      const mockState = createMockState();

      // First save
      await saveStepState(mockState);

      // Update and save again
      const updatedState: ProjectStepState = {
        ...mockState,
        currentStep: 3,
        steps: mockState.steps.map((s) =>
          s.stepNumber === 2 ? { ...s, status: "complete" } : s,
        ),
      };

      await saveStepState(updatedState);

      // Verify update
      const loaded = await loadStepState(TEST_PROJECT_ID);
      expect(loaded?.currentStep).toBe(3);
      expect(loaded?.steps[1].status).toBe("complete");
    });
  });

  describe("loadStepState", () => {
    it("should return null for non-existent project", async () => {
      const loaded = await loadStepState("non-existent-project");
      expect(loaded).toBeNull();
    });

    it("should load previously saved state", async () => {
      const mockState = createMockState();
      await saveStepState(mockState);

      const loaded = await loadStepState(TEST_PROJECT_ID);

      expect(loaded).toBeDefined();
      expect(loaded?.projectId).toBe(TEST_PROJECT_ID);
      expect(loaded?.currentStep).toBe(2);
      expect(loaded?.steps).toHaveLength(10);
      expect(loaded?.steps[0].status).toBe("complete");
      expect(loaded?.steps[1].status).toBe("now");
    });

    it("should preserve answers array", async () => {
      const mockState = createMockState();
      // Add an answer to step 2 (interview step) since only steps 2 and 3 preserve answers
      mockState.steps[1].answers = [
        {
          question: "What problem does this solve?",
          value: "Customer pain point",
          submittedAt: new Date().toISOString(),
        },
      ];
      await saveStepState(mockState);

      const loaded = await loadStepState(TEST_PROJECT_ID);

      expect(loaded?.steps[1].answers).toBeDefined();
      expect(loaded?.steps[1].answers).toHaveLength(1);
      expect(loaded?.steps[1].answers?.[0].value).toBe("Customer pain point");
    });
  });

  describe("Round-trip persistence", () => {
    it("should maintain data integrity through save/load cycle", async () => {
      const mockState = createMockState();
      mockState.steps[1].answers = [
        {
          question: "What problem does this solve?",
          value: "Customer pain point",
          submittedAt: "2026-06-12T10:00:00Z",
        },
        {
          question: "Who are the users?",
          value: "Sales team",
          submittedAt: "2026-06-12T10:01:00Z",
        },
      ];

      await saveStepState(mockState);
      const loaded = await loadStepState(TEST_PROJECT_ID);

      // Verify structure
      expect(loaded).toBeDefined();
      expect(loaded?.projectId).toBe(mockState.projectId);
      expect(loaded?.currentStep).toBe(mockState.currentStep);
      expect(loaded?.steps).toHaveLength(mockState.steps.length);

      // Verify answers preserved
      expect(loaded?.steps[1].answers).toHaveLength(2);
      expect(loaded?.steps[1].answers?.[0].value).toBe("Customer pain point");
      expect(loaded?.steps[1].answers?.[1].value).toBe("Sales team");
    });
  });
});
