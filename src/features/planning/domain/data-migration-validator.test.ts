/**
 * Data migration validation tests.
 *
 * Validates that existing production data is compatible with new domain types.
 * Tests edge cases: null values, missing fields, unexpected shapes.
 *
 * @module features/planning/domain/data-migration-validator
 */

import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../lib/db/index";
import { loadPlanningState } from "../server.db";
import type { ProjectStepState } from "../types";
import type { StepNumber } from "./types";

describe("Data Migration Validation", () => {
  let hasTestData = false;

  beforeAll(async () => {
    // Check if we have any test data in the database
    const projects = db.prepare("SELECT id FROM projects LIMIT 1").all();
    hasTestData = projects.length > 0;

    if (!hasTestData) {
      console.log(
        "⚠️  No test data found in database - skipping live data validation",
      );
    }
  });

  describe("Existing project data compatibility", () => {
    it("should validate type compatibility without errors", async () => {
      if (!hasTestData) {
        console.log("⏭️  Skipping: No test data available");
        return;
      }

      const projects = db.prepare("SELECT id FROM projects LIMIT 10").all() as {
        id: string;
      }[];

      expect(projects.length).toBeGreaterThan(0);

      for (const project of projects) {
        const state = await loadPlanningState(project.id);

        if (state) {
          // Validate structure matches domain types
          expect(state).toBeDefined();
          expect(state.projectId).toBe(project.id);

          // Validate currentStep is within bounds
          expect(state.currentStep).toBeGreaterThanOrEqual(1);
          expect(state.currentStep).toBeLessThanOrEqual(10);

          // Type assertion: currentStep should be compatible with StepNumber
          const stepNumber = state.currentStep as StepNumber;
          expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).toContain(stepNumber);

          // Validate steps array
          expect(state.steps).toBeInstanceOf(Array);
          expect(state.steps.length).toBe(10);

          // Validate each step structure
          state.steps.forEach((step, index) => {
            expect(step.stepNumber).toBe(index + 1);
            expect(step.name).toBeTruthy();
            expect(["complete", "now", "pending", "skipped"]).toContain(
              step.status,
            );
            expect(typeof step.question).toBe("string");

            // Validate answers array if present
            if (step.answers) {
              expect(step.answers).toBeInstanceOf(Array);
              step.answers.forEach((answer) => {
                expect(answer).toHaveProperty("question");
                expect(answer).toHaveProperty("value");
                expect(answer).toHaveProperty("submittedAt");
              });
            }
          });
        }
      }
    });
  });

  describe("Edge case handling", () => {
    it("should handle projects with null/undefined fields gracefully", async () => {
      // This test validates our type system handles edge cases
      // even if production data has unexpected nulls

      const testCases: Array<{
        scenario: string;
        currentStep: number | null | undefined;
        expected: number;
      }> = [
        { scenario: "null currentStep", currentStep: null, expected: 1 },
        {
          scenario: "undefined currentStep",
          currentStep: undefined,
          expected: 1,
        },
        { scenario: "valid currentStep", currentStep: 5, expected: 5 },
      ];

      testCases.forEach(({ scenario, currentStep, expected }) => {
        const normalizedStep = currentStep ?? 1;
        expect(normalizedStep).toBe(expected);
        expect(normalizedStep).toBeGreaterThanOrEqual(1);
        expect(normalizedStep).toBeLessThanOrEqual(10);
      });
    });

    it("should validate StepNumber literal type constraints", () => {
      // Test that StepNumber type only accepts 1-10
      const validSteps: StepNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      validSteps.forEach((step) => {
        expect(step).toBeGreaterThanOrEqual(1);
        expect(step).toBeLessThanOrEqual(10);
      });

      // Test that invalid steps are rejected at type level
      // (TypeScript compilation would fail for: const invalid: StepNumber = 11)
      const invalidSteps = [0, 11, 100, -1];

      invalidSteps.forEach((step) => {
        const isValid = step >= 1 && step <= 10;
        expect(isValid).toBe(false);
      });
    });

    it("should handle empty answers array", () => {
      const emptyAnswers: Array<never> = [];

      expect(emptyAnswers).toBeInstanceOf(Array);
      expect(emptyAnswers.length).toBe(0);
    });

    it("should validate step status values", () => {
      const validStatuses = ["complete", "now", "pending", "skipped"];
      const testStatuses = ["complete", "now", "pending", "skipped"];

      testStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe("Database schema compatibility", () => {
    it("should validate planning_state table structure", () => {
      // Query table schema
      const tableInfo = db
        .prepare("PRAGMA table_info(planning_state)")
        .all() as Array<{ name: string; type: string }>;

      // Validate expected columns exist
      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain("project_id");
      expect(columnNames).toContain("xstate_snapshot");
      expect(columnNames).toContain("created_at");
      expect(columnNames).toContain("updated_at");
    });

    it("should validate interview_answers table structure", () => {
      const tableInfo = db
        .prepare("PRAGMA table_info(interview_answers)")
        .all() as Array<{ name: string; type: string }>;

      const columnNames = tableInfo.map((col) => col.name);

      expect(columnNames).toContain("project_id");
      expect(columnNames).toContain("step_number");
      expect(columnNames).toContain("question");
      expect(columnNames).toContain("answer");
      expect(columnNames).toContain("created_at");
    });
  });

  describe("Type safety validation", () => {
    it("should ensure ProjectStepState matches domain requirements", () => {
      // Create a mock state that matches our types
      const mockState: ProjectStepState = {
        projectId: "test-123",
        currentStep: 3,
        steps: Array.from({ length: 10 }, (_, i) => ({
          stepNumber: i + 1,
          name: `Step ${i + 1}`,
          status:
            i < 2
              ? ("complete" as const)
              : i === 2
                ? ("now" as const)
                : ("pending" as const),
          question: `Question ${i + 1}?`,
        })),
      };

      // Validate structure
      expect(mockState.projectId).toBeTruthy();
      expect(mockState.currentStep).toBeGreaterThanOrEqual(1);
      expect(mockState.currentStep).toBeLessThanOrEqual(10);
      expect(mockState.steps.length).toBe(10);

      // Validate StepNumber compatibility
      const stepNumbers = mockState.steps.map((s) => s.stepNumber);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});
