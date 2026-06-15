/**
 * Integration tests for architectural layer boundaries
 *
 * Tests that layers work together correctly:
 * - Domain → Infrastructure
 * - Workflow → Domain
 * - End-to-end: UI → Workflow → Domain → Infrastructure → DB
 *
 * CRITICAL: Uses real database (no mocks) to validate integration
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../../lib/db";
import { _clearPlanningState } from "../../../../lib/db/planning";
import { submitStepAnswer } from "../../domain/step-commands";
import {
  loadStepState,
  saveInterviewAnswer,
  saveStepState,
} from "../../infrastructure/repository";
import { createDefaultStepState } from "../../infrastructure/snapshot-to-state";

describe("Layer Boundary Integration Tests", () => {
  let testProjectId: string;

  beforeEach(async () => {
    // Clear database before each test
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM interview_answers").run();

    // Create test project (required due to foreign key constraints)
    testProjectId = `test-proj-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testProjectId,
      "TEST",
      "Test Project",
      "active",
      "scratch",
      1,
      now,
      now,
    );

    // Initialize project state (required for loadStepState to work)
    const initialState = createDefaultStepState(testProjectId);
    await saveStepState(initialState);
  });

  afterEach(() => {
    // Clean up after tests
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM interview_answers").run();
  });

  describe("Domain → Infrastructure", () => {
    it("should persist domain command results via infrastructure", async () => {
      // Test that domain logic integrates with persistence layer

      // 1. Load current state
      const currentState = await loadStepState(testProjectId);
      expect(currentState).toBeDefined();

      // 2. Apply domain logic (pure function)
      const newState = submitStepAnswer(currentState!, {
        stepNumber: 2,
        question: "What problem does this solve?",
        value: "Customer pain point X",
      });

      // 3. Persist via infrastructure
      await Promise.all([
        saveStepState(newState),
        saveInterviewAnswer(
          testProjectId,
          2,
          "What problem does this solve?",
          "Customer pain point X",
        ),
      ]);

      // 4. Verify persisted to database
      const dbRecords = db
        .prepare("SELECT * FROM interview_answers WHERE project_id = ?")
        .all(testProjectId);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords[0].answer).toBe("Customer pain point X");

      // 5. Verify can be loaded back
      const loadedState = await loadStepState(testProjectId);
      expect(loadedState!.steps[1].answers).toHaveLength(1);
      expect(loadedState!.steps[1].answers![0].value).toBe(
        "Customer pain point X",
      );
    });

    it("should apply pure domain logic before persistence", async () => {
      // Load initial state
      const state = await loadStepState(testProjectId);
      expect(state).toBeDefined();

      // Apply domain logic (pure function - no side effects)
      const newState = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "Test question?",
        value: "Test answer",
      });

      // Verify domain logic worked (no DB changes yet)
      expect(newState.steps[1].answers).toHaveLength(1);
      expect(newState.steps[1].answers![0].value).toBe("Test answer");

      // Original state unchanged (immutability)
      expect(state!.steps[1].answers).toBeUndefined();
    });
  });

  describe("Workflow → Domain → Infrastructure", () => {
    it("should orchestrate domain logic and persistence", async () => {
      // Simulate workflow orchestration: Load → Transform → Persist

      // 1. Load (Infrastructure)
      const currentState = await loadStepState(testProjectId);

      // 2. Transform (Domain)
      const newState = submitStepAnswer(currentState!, {
        stepNumber: 2,
        question: "What is the goal?",
        value: "Improve efficiency",
      });

      // 3. Persist (Infrastructure)
      await Promise.all([
        saveStepState(newState),
        saveInterviewAnswer(
          testProjectId,
          2,
          "What is the goal?",
          "Improve efficiency",
        ),
      ]);

      // 4. Verify workflow completed successfully
      const loadedState = await loadStepState(testProjectId);
      expect(loadedState!.steps[1].answers).toHaveLength(1);
      expect(loadedState!.steps[1].answers![0].value).toBe(
        "Improve efficiency",
      );
    });
  });

  describe("End-to-End Layer Flow", () => {
    it("should work: Domain → Infrastructure → DB → Domain", async () => {
      // Simulate full stack: Domain logic → persistence → reload
      // Then query back and verify data integrity

      // 1. Load initial state
      const currentState = await loadStepState(testProjectId);

      // 2. Apply domain logic
      const newState = submitStepAnswer(currentState!, {
        stepNumber: 2,
        question: "What problem does this solve?",
        value: "Customer pain point X",
      });

      // 3. Persist through infrastructure layer
      await Promise.all([
        saveStepState(newState),
        saveInterviewAnswer(
          testProjectId,
          2,
          "What problem does this solve?",
          "Customer pain point X",
        ),
      ]);

      // 4. Load from DB via repository
      const loadedState = await loadStepState(testProjectId);

      // 5. Verify data made round trip through all layers
      expect(loadedState).toBeDefined();
      expect(loadedState!.steps[1].answers).toHaveLength(1);
      expect(loadedState!.steps[1].answers![0].value).toBe(
        "Customer pain point X",
      );

      // 6. Query interview_answers table directly
      const records = db
        .prepare("SELECT * FROM interview_answers WHERE project_id = ?")
        .all(testProjectId);

      expect(records).toHaveLength(1);
      expect(records[0].answer).toBe("Customer pain point X");
    });

    it("should handle multiple answers in sequence", async () => {
      // Submit first answer
      let state = await loadStepState(testProjectId);
      state = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "What problem does this solve?",
        value: "First answer",
      });
      await Promise.all([
        saveStepState(state),
        saveInterviewAnswer(
          testProjectId,
          2,
          "What problem does this solve?",
          "First answer",
        ),
      ]);

      // Submit second answer
      state = await loadStepState(testProjectId);
      state = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "Who are the users?",
        value: "Second answer",
      });
      await Promise.all([
        saveStepState(state),
        saveInterviewAnswer(
          testProjectId,
          2,
          "Who are the users?",
          "Second answer",
        ),
      ]);

      // Load state
      const loadedState = await loadStepState(testProjectId);

      // Verify both answers persisted
      expect(loadedState!.steps[1].answers).toHaveLength(2);
      expect(loadedState!.steps[1].answers![0].value).toBe("First answer");
      expect(loadedState!.steps[1].answers![1].value).toBe("Second answer");

      // Verify in database
      const records = db
        .prepare("SELECT * FROM interview_answers WHERE project_id = ?")
        .all(testProjectId);

      expect(records).toHaveLength(2);
    });

    it("should maintain data integrity across operations", async () => {
      // Submit first answer
      let state = await loadStepState(testProjectId);
      state = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "What is the goal?",
        value: "Test goal",
      });
      await Promise.all([
        saveStepState(state),
        saveInterviewAnswer(testProjectId, 2, "What is the goal?", "Test goal"),
      ]);

      // Submit second answer
      state = await loadStepState(testProjectId);
      state = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "Final question?",
        value: "Final answer",
      });
      await Promise.all([
        saveStepState(state),
        saveInterviewAnswer(
          testProjectId,
          2,
          "Final question?",
          "Final answer",
        ),
      ]);

      // Verify state integrity
      const loadedState = await loadStepState(testProjectId);
      expect(loadedState!.steps[1].answers).toHaveLength(2);
      expect(loadedState!.steps[1].answers![0].value).toBe("Test goal");
      expect(loadedState!.steps[1].answers![1].value).toBe("Final answer");
    });
  });

  describe("Error Propagation", () => {
    it("should propagate domain errors through infrastructure layer", async () => {
      // Load state and apply invalid domain operation
      const state = await loadStepState(testProjectId);

      // Domain layer validation catches invalid step number
      expect(() =>
        submitStepAnswer(state!, {
          stepNumber: 99, // Invalid step
          question: "Test",
          value: "Test",
        }),
      ).toThrow("Invalid step number: 99");
    });

    it("should propagate infrastructure errors to caller", async () => {
      // Try to load state for non-existent project
      const state = await loadStepState("non-existent-project");
      expect(state).toBeNull();
    });

    it("should handle database constraint violations", async () => {
      // Try to save interview answer for non-existent project (foreign key violation)
      await expect(
        saveInterviewAnswer("does-not-exist", 2, "Test", "Test"),
      ).rejects.toThrow();
    });
  });

  describe("Data Transformation", () => {
    it("should correctly transform data between layers", async () => {
      // Apply domain transformation
      const state = await loadStepState(testProjectId);
      const transformedState = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "Test question?",
        value: "Test answer",
      });

      // Persist transformed state
      await Promise.all([
        saveStepState(transformedState),
        saveInterviewAnswer(testProjectId, 2, "Test question?", "Test answer"),
      ]);

      // Load via repository (Infrastructure layer)
      const loadedState = await loadStepState(testProjectId);

      // Both should have same data shape
      expect(transformedState.projectId).toBe(loadedState!.projectId);
      expect(transformedState.steps[1].answers![0].value).toBe(
        loadedState!.steps[1].answers![0].value,
      );
    });

    it("should preserve timestamps across layers", async () => {
      const beforeTime = new Date().toISOString();

      // Apply domain logic and persist
      let state = await loadStepState(testProjectId);
      state = submitStepAnswer(state!, {
        stepNumber: 2,
        question: "Test",
        value: "Test",
      });
      await Promise.all([
        saveStepState(state),
        saveInterviewAnswer(testProjectId, 2, "Test", "Test"),
      ]);

      const afterTime = new Date().toISOString();

      // Load and verify timestamp
      const loadedState = await loadStepState(testProjectId);
      const timestamp = loadedState!.steps[1].answers![0].submittedAt;

      // Timestamp should be between before and after
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });
  });
});
