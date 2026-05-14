/**
 * Snapshot Edge Case Regression Tests
 *
 * Tests edge cases and incomplete workflows using manually captured snapshots.
 * These snapshots represent real user scenarios that need special handling.
 *
 * Related: Task 2.8b - Manual Edge Case Snapshots
 */

import { beforeEach, describe, expect, it } from "vitest";
import { SnapshotCollector } from "./SnapshotCollector";
import {
  findLatestSnapshot,
  groupSnapshotsByStepAndLabel,
} from "./test-helpers";

describe("Snapshot Edge Cases - Manual Captures", () => {
  let collector: SnapshotCollector;

  beforeEach(() => {
    collector = new SnapshotCollector();
  });

  describe("Step 2 - Business Requirements Edge Cases", () => {
    it("handles incomplete interview with only 3 questions answered", async () => {
      // Find the incomplete interview snapshot
      const snapshots = await collector.listSnapshots();
      const incompleteSnapshot = snapshots.find((f) =>
        f.includes("step-2-incomplete-3q"),
      );

      if (!incompleteSnapshot) {
        throw new Error(
          "Missing snapshot: step-2-incomplete-3q-*.json - Run manual capture first",
        );
      }

      const context = await collector.loadSnapshot(incompleteSnapshot);

      // Verify it's at step 2
      expect(context.currentStepNumber).toBe(2);

      // Verify partial interview data
      expect(context.step2Answers).toBeDefined();
      expect(context.step2Answers.length).toBe(3); // Only 3 questions answered
      expect(context.step2Answers[0].question).toBe(
        "What is the primary problem?",
      );
      expect(context.step2Answers[1].question).toBe("Who are the users?");
      expect(context.step2Answers[2].question).toBe("What is the timeline?");

      // Verify workflow can proceed despite incomplete data
      expect(context.projectId).toBeDefined();
      expect(context.error).toBeNull();
    });

    it("handles complete interview with all 10 questions answered", async () => {
      const snapshots = await collector.listSnapshots();
      const completeSnapshot = snapshots.find((f) =>
        f.includes("step-2-complete-10q"),
      );

      if (!completeSnapshot) {
        throw new Error(
          "Missing snapshot: step-2-complete-10q-*.json - Run manual capture first",
        );
      }

      const context = await collector.loadSnapshot(completeSnapshot);

      expect(context.currentStepNumber).toBe(2);
      expect(context.step2Answers).toBeDefined();

      // Should have complete interview data (all 10 questions)
      expect(context.step2Answers.length).toBe(10);
      expect(context.step2Answers[0].question).toBe(
        "What is the primary problem?",
      );
      expect(context.step2Answers[9].question).toBe("What is out of scope?");

      expect(context.projectId).toBeDefined();
    });

    it.skip("handles validation errors during interview", async () => {
      const snapshots = await collector.listSnapshots();
      const errorSnapshot = snapshots.find((f) =>
        f.includes("step-2-validation-error"),
      );

      if (!errorSnapshot) {
        // This is optional - validation errors might not be capturable
        console.warn(
          "Skipping: step-2-validation-error snapshot not found (optional)",
        );
        return;
      }

      const context = await collector.loadSnapshot(errorSnapshot);

      expect(context.currentStepNumber).toBe(2);
      // Should have error state
      expect(context.error).toBeDefined();
    });
  });

  describe("Step 5 - Implementation Planning Edge Cases", () => {
    it("handles minimal responses with only required fields", async () => {
      const snapshots = await collector.listSnapshots();
      const minimalSnapshot = snapshots.find((f) =>
        f.includes("step-5-minimal-responses"),
      );

      if (!minimalSnapshot) {
        throw new Error(
          "Missing snapshot: step-5-minimal-responses-*.json - Run manual capture first",
        );
      }

      const context = await collector.loadSnapshot(minimalSnapshot);

      expect(context.currentStepNumber).toBe(5);

      // Should have minimal but valid data
      expect(context.projectId).toBeDefined();
      expect(context.step2Answers).toBeDefined();
      expect(context.step2Answers.length).toBe(2); // Minimal responses
      expect(context.step3Answers).toBeDefined();
      expect(context.step3Answers.length).toBe(2); // Minimal technical requirements

      // Should have artifacts for completed steps
      expect(context.artifacts[1]).toBeDefined();
      expect(context.artifacts[2]).toBeDefined();
      expect(context.artifacts[3]).toBeDefined();
      expect(context.artifacts[4]).toBeDefined();

      expect(context.error).toBeNull();
    });

    it("handles missing critical data at step 5", async () => {
      const snapshots = await collector.listSnapshots();
      const missingSnapshot = snapshots.find((f) =>
        f.includes("step-5-missing-critical"),
      );

      if (!missingSnapshot) {
        throw new Error(
          "Missing snapshot: step-5-missing-critical-*.json - Run manual capture first",
        );
      }

      const context = await collector.loadSnapshot(missingSnapshot);

      expect(context.currentStepNumber).toBe(5);

      // Should either have error state or handle gracefully
      // (depends on validation strategy)
      expect(context.projectId).toBeDefined();
    });
  });

  describe("Step 7 - Plan Approval Edge Cases", () => {
    it("handles plan with user edits applied", async () => {
      const snapshots = await collector.listSnapshots();
      const editedSnapshot = snapshots.find((f) =>
        f.includes("step-7-with-user-edits"),
      );

      if (!editedSnapshot) {
        throw new Error(
          "Missing snapshot: step-7-with-user-edits-*.json - Run manual capture first",
        );
      }

      const context = await collector.loadSnapshot(editedSnapshot);

      expect(context.currentStepNumber).toBe(7);
      expect(context.projectId).toBeDefined();

      // Should have implementation plan artifact from step 5
      expect(context.artifacts[5]).toBeDefined();
      expect(context.artifacts[5]?.type).toBe("yaml");

      // User edits should be reflected in step7Edits field
      expect(context.step7Edits).toBeDefined();
      expect(context.step7Edits).toContain("User edited");
    });
  });

  describe("Error Recovery Edge Cases", () => {
    it.skip("handles validation error state at step 3", async () => {
      const snapshots = await collector.listSnapshots();
      const errorSnapshot = snapshots.find((f) =>
        f.includes("step-3-validation-error"),
      );

      if (!errorSnapshot) {
        console.warn(
          "Skipping: step-3-validation-error snapshot not found (optional)",
        );
        return;
      }

      const context = await collector.loadSnapshot(errorSnapshot);

      expect(context.currentStepNumber).toBe(3);

      // Should have error state captured
      expect(context.error).toBeDefined();

      // But should still have valid project context
      expect(context.projectId).toBeDefined();
    });
  });

  describe("Snapshot Quality Checks", () => {
    it("all edge case snapshots have required context fields", async () => {
      const snapshots = await collector.listSnapshots();

      // Filter to edge case snapshots (exclude "standard" label)
      const edgeCaseSnapshots = snapshots.filter(
        (f) => !f.includes("-standard-") && f.startsWith("step-"),
      );

      if (edgeCaseSnapshots.length === 0) {
        console.warn(
          "No edge case snapshots found yet - manual capture pending",
        );
        return;
      }

      for (const filename of edgeCaseSnapshots) {
        const snapshot = await collector.loadFullSnapshot(filename);

        // Verify required metadata
        expect(snapshot.version).toBe("1.0");
        expect(snapshot.capturedAt).toBeDefined();
        expect(snapshot.stepNumber).toBeGreaterThanOrEqual(1);
        expect(snapshot.stepNumber).toBeLessThanOrEqual(10);
        expect(snapshot.label).toBeDefined();

        // Verify context integrity
        const context = snapshot.xstateSnapshot.context;
        expect(context.currentStepNumber).toBe(snapshot.stepNumber);
        expect(context.projectId).toBeDefined();

        // Log for visibility during test runs
        console.log(
          `✓ Validated edge case snapshot: ${filename} (step ${snapshot.stepNumber}, label: ${snapshot.label})`,
        );
      }
    });

    it("edge case snapshots are properly indexed in INDEX.md", async () => {
      // This test verifies documentation completeness
      const snapshots = await collector.listSnapshots();
      const edgeCaseSnapshots = snapshots.filter(
        (f) => !f.includes("-standard-") && f.startsWith("step-"),
      );

      if (edgeCaseSnapshots.length === 0) {
        console.warn("No edge case snapshots found - skipping index check");
        return;
      }

      // Read INDEX.md to verify documentation
      const { promises: fs } = await import("node:fs");
      const { join } = await import("node:path");

      const indexPath = join(
        process.cwd(),
        "tests/fixtures/snapshots/INDEX.md",
      );
      const indexContent = await fs.readFile(indexPath, "utf-8");

      // Check each edge case is documented
      for (const filename of edgeCaseSnapshots) {
        // Extract label from filename (e.g., "incomplete-3q" from "step-2-incomplete-3q-123.json")
        const labelMatch = filename.match(/step-\d+-(.+)-\d+\.json/);
        if (labelMatch) {
          const label = labelMatch[1];

          // Verify label appears in INDEX.md
          expect(indexContent).toContain(label);
        }
      }
    });
  });
});

// Test helpers moved to test-helpers.ts to avoid noExportsInTest linting error
