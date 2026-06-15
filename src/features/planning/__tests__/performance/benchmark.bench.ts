/**
 * Performance benchmarks for planning state refactor
 *
 * Measures:
 * - Domain layer operations (<1ms target - pure functions)
 * - Infrastructure operations (<100ms target - includes DB I/O)
 * - Full stack operations via workflow services
 *
 * CRITICAL: Uses real database (no mocks) for infrastructure benchmarks
 *
 * Acceptance Criteria:
 * - Domain functions: <1ms (pure functions should be instant)
 * - Infrastructure: <100ms (includes DB I/O)
 * - Workflow services: <100ms (full stack)
 *
 * Run with: npx vitest bench src/features/planning/__tests__/performance/
 */

import { afterEach, beforeEach, bench, describe, expect } from "vitest";
import { db } from "../../../../lib/db";
import { _clearPlanningState } from "../../../../lib/db/planning";
import {
  completeStep,
  setStepArtifact,
  skipStep,
  submitStepAnswer,
} from "../../domain/step-commands";
import {
  loadStepState,
  saveInterviewAnswer,
  saveStepState,
} from "../../infrastructure/repository";
import { createDefaultStepState } from "../../infrastructure/snapshot-to-state";

/**
 * Performance thresholds (in milliseconds)
 */
const THRESHOLDS = {
  DOMAIN: 1, // Pure functions should be <1ms
  INFRASTRUCTURE: 100, // DB operations should be <100ms
  WORKFLOW: 100, // Full stack should be <100ms
} as const;

describe("Performance Benchmarks", () => {
  let testProjectId: string;

  beforeEach(async () => {
    // Clear database before benchmarks
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM interview_answers").run();

    // Create test project (required for infrastructure benchmarks)
    testProjectId = `bench-proj-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testProjectId,
      "BENCH",
      "Benchmark Project",
      "active",
      "scratch",
      1,
      now,
      now,
    );

    // Initialize project state
    const initialState = createDefaultStepState(testProjectId);
    await saveStepState(initialState);
  });

  afterEach(() => {
    // Clean up after benchmarks
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM interview_answers").run();
  });

  describe("Domain Layer (Pure Functions)", () => {
    bench("submitStepAnswer", () => {
      // Target: <1ms
      const mockState = createDefaultStepState("test-id");
      submitStepAnswer(mockState, {
        stepNumber: 2,
        question: "What problem does this solve?",
        value: "Customer pain point X",
      });
    });

    bench("completeStep", () => {
      // Target: <1ms
      const mockState = createDefaultStepState("test-id");
      completeStep(mockState, 2);
    });

    bench("skipStep", () => {
      // Target: <1ms
      const mockState = createDefaultStepState("test-id");
      skipStep(mockState, 2);
    });

    bench("setStepArtifact", () => {
      // Target: <1ms
      const mockState = createDefaultStepState("test-id");
      setStepArtifact(mockState, {
        stepNumber: 4,
        artifactKey: "qa-test-plan",
        artifact: "# QA Test Plan\n\nSample content",
      });
    });
  });

  describe("Infrastructure Layer (with DB I/O)", () => {
    bench(
      "loadStepState",
      async () => {
        // Target: <100ms
        const result = await loadStepState(testProjectId);
        expect(result).toBeDefined();
      },
      { time: THRESHOLDS.INFRASTRUCTURE },
    );

    bench(
      "saveStepState",
      async () => {
        // Target: <100ms
        const state = createDefaultStepState(testProjectId);
        await saveStepState(state);
      },
      { time: THRESHOLDS.INFRASTRUCTURE },
    );

    bench(
      "saveInterviewAnswer",
      async () => {
        // Target: <100ms
        await saveInterviewAnswer(
          testProjectId,
          2,
          "What problem does this solve?",
          "Customer pain point X",
        );
      },
      { time: THRESHOLDS.INFRASTRUCTURE },
    );

    bench(
      "loadStepState + domain transform",
      async () => {
        // Target: <100ms
        // Common pattern: load → transform → use
        const state = await loadStepState(testProjectId);
        expect(state).toBeDefined();
        if (state) {
          const newState = submitStepAnswer(state, {
            stepNumber: 2,
            question: "Test question?",
            value: "Test answer",
          });
          expect(newState.steps[1].answers).toHaveLength(1);
        }
      },
      { time: THRESHOLDS.INFRASTRUCTURE },
    );
  });

  describe("Workflow Services (Full Stack)", () => {
    bench(
      "Load → Transform → Persist (answer)",
      async () => {
        // Target: <100ms
        // Full stack workflow: Load → Domain transform → Persist
        // This simulates what persistAnswerService does

        // 1. Load current state
        const currentState = await loadStepState(testProjectId);
        expect(currentState).toBeDefined();

        // 2. Apply domain logic (pure function)
        const newState = submitStepAnswer(currentState!, {
          stepNumber: 2,
          question: "What problem does this solve?",
          value: "Customer pain point X",
        });

        // 3. Persist (parallel: state + interview answer)
        await Promise.all([
          saveStepState(newState),
          saveInterviewAnswer(
            testProjectId,
            2,
            "What problem does this solve?",
            "Customer pain point X",
          ),
        ]);

        expect(newState.steps[1].answers).toBeDefined();
      },
      { time: THRESHOLDS.WORKFLOW },
    );

    bench(
      "Load → Transform → Persist (complete step)",
      async () => {
        // Target: <100ms
        const currentState = await loadStepState(testProjectId);
        expect(currentState).toBeDefined();

        const newState = completeStep(currentState!, 2);
        await saveStepState(newState);

        expect(newState.steps[1].status).toBe("complete");
      },
      { time: THRESHOLDS.WORKFLOW },
    );

    bench(
      "Load → Transform → Persist (skip step)",
      async () => {
        // Target: <100ms
        const currentState = await loadStepState(testProjectId);
        expect(currentState).toBeDefined();

        const newState = skipStep(currentState!, 2);
        await saveStepState(newState);

        expect(newState.steps[1].status).toBe("skipped");
      },
      { time: THRESHOLDS.WORKFLOW },
    );

    bench(
      "Load → Transform → Persist (set artifact)",
      async () => {
        // Target: <100ms
        const currentState = await loadStepState(testProjectId);
        expect(currentState).toBeDefined();

        const newState = setStepArtifact(currentState!, {
          stepNumber: 4,
          artifactKey: "qa-test-plan",
          artifact: "# QA Test Plan\n\nSample content",
        });
        await saveStepState(newState);

        expect(newState.steps[3].artifact).toBeDefined();
      },
      { time: THRESHOLDS.WORKFLOW },
    );
  });

  describe("Complex Operations", () => {
    bench(
      "submit multiple answers sequentially",
      async () => {
        // Target: <500ms for 5 answers
        // Tests realistic workflow: multiple Q&A in same step
        for (let i = 0; i < 5; i++) {
          const currentState = await loadStepState(testProjectId);
          expect(currentState).toBeDefined();

          const newState = submitStepAnswer(currentState!, {
            stepNumber: 2,
            question: `Question ${i}?`,
            value: `Answer ${i}`,
          });

          await Promise.all([
            saveStepState(newState),
            saveInterviewAnswer(
              testProjectId,
              2,
              `Question ${i}?`,
              `Answer ${i}`,
            ),
          ]);
        }
      },
      { time: 500 },
    );

    bench(
      "complete step workflow",
      async () => {
        // Target: <200ms
        // Tests complete step flow: answer → complete
        let currentState = await loadStepState(testProjectId);
        expect(currentState).toBeDefined();

        // Submit answer
        let newState = submitStepAnswer(currentState!, {
          stepNumber: 2,
          question: "Final question?",
          value: "Final answer",
        });

        await Promise.all([
          saveStepState(newState),
          saveInterviewAnswer(
            testProjectId,
            2,
            "Final question?",
            "Final answer",
          ),
        ]);

        // Complete step
        currentState = await loadStepState(testProjectId);
        newState = completeStep(currentState!, 2);
        await saveStepState(newState);

        expect(newState.steps[1].status).toBe("complete");
      },
      { time: 200 },
    );
  });
});
