/**
 * Test suite for automated snapshot generation
 *
 * Verifies that generated snapshots:
 * - Can be loaded successfully
 * - Have correct structure and metadata
 * - Contain valid workflow states
 */

import { describe, expect, it } from "vitest";
import { SnapshotCollector } from "./SnapshotCollector";

describe("Automated Snapshot Generation", () => {
  const collector = new SnapshotCollector();

  describe("Generated snapshots", () => {
    it("should have standard snapshots for all 10 steps", async () => {
      const snapshots = await collector.listSnapshots();
      const standardSnapshots = snapshots.filter((name) =>
        name.includes("-standard-"),
      );

      expect(standardSnapshots.length).toBeGreaterThanOrEqual(10);

      // Verify we have at least one snapshot for each step
      for (let step = 1; step <= 10; step++) {
        const stepSnapshots = standardSnapshots.filter((name) =>
          name.startsWith(`step-${step}-standard-`),
        );
        expect(stepSnapshots.length).toBeGreaterThan(0);
      }
    });

    it("should be loadable and contain valid context", async () => {
      const snapshots = await collector.listSnapshots();
      const standardSnapshots = snapshots.filter((name) =>
        name.includes("-standard-"),
      );

      // Test loading first standard snapshot for each step
      for (let step = 1; step <= 10; step++) {
        const stepSnapshots = standardSnapshots.filter((name) =>
          name.startsWith(`step-${step}-standard-`),
        );

        if (stepSnapshots.length > 0) {
          const context = await collector.loadSnapshot(stepSnapshots[0]);

          // Verify context structure
          expect(context).toBeDefined();
          expect(context.projectId).toBe("test-project");
          expect(context.currentStepNumber).toBe(step);

          // Verify completedSteps array is correct
          const expectedCompleted = Array.from(
            { length: step - 1 },
            (_, i) => i + 1,
          );
          expect(context.completedSteps).toEqual(expectedCompleted);

          // Verify artifacts exist for completed steps
          if (step > 1) {
            expect(context.artifacts).toBeDefined();
            for (let i = 1; i < step; i++) {
              expect(context.artifacts?.[i]).toBeDefined();
            }
          }
        }
      }
    });

    it("should have proper metadata", async () => {
      const snapshots = await collector.listSnapshots();
      const standardSnapshots = snapshots.filter((name) =>
        name.includes("-standard-"),
      );

      // Test metadata of first standard snapshot
      if (standardSnapshots.length > 0) {
        const fullSnapshot = await collector.loadFullSnapshot(
          standardSnapshots[0],
        );

        expect(fullSnapshot.version).toBe("1.0");
        expect(fullSnapshot.capturedAt).toBeDefined();
        expect(fullSnapshot.stepNumber).toBeGreaterThanOrEqual(1);
        expect(fullSnapshot.stepNumber).toBeLessThanOrEqual(10);
        expect(fullSnapshot.label).toBe("standard");
        expect(fullSnapshot.xstateSnapshot).toBeDefined();
        expect(fullSnapshot.xstateSnapshot.status).toBe("active");
        expect(fullSnapshot.xstateSnapshot.context).toBeDefined();
      }
    });
  });

  describe("Snapshot consistency", () => {
    it("should have consistent artifact generation", async () => {
      const snapshots = await collector.listSnapshots();
      const step5Snapshots = snapshots.filter((name) =>
        name.startsWith("step-5-standard-"),
      );

      if (step5Snapshots.length >= 2) {
        const context1 = await collector.loadSnapshot(step5Snapshots[0]);
        const context2 = await collector.loadSnapshot(step5Snapshots[1]);

        // Both should have artifacts for steps 1-4
        expect(context1.artifacts?.[1]).toBeDefined();
        expect(context2.artifacts?.[1]).toBeDefined();

        // Artifact content should be consistent (same default data)
        expect(context1.artifacts?.[1].type).toBe(context2.artifacts?.[1].type);
        expect(context1.artifacts?.[2].type).toBe(context2.artifacts?.[2].type);
      }
    });

    it("should have step-appropriate responses", async () => {
      const snapshots = await collector.listSnapshots();

      // Test step 2 (Business Requirements)
      const step2Snapshots = snapshots.filter((name) =>
        name.startsWith("step-2-standard-"),
      );
      if (step2Snapshots.length > 0) {
        const context = await collector.loadSnapshot(step2Snapshots[0]);
        expect(context.step1Responses).toBeDefined();
        expect(context.step1Responses?.projectDescription).toBeDefined();
      }

      // Test step 3 (Technical Requirements)
      const step3Snapshots = snapshots.filter((name) =>
        name.startsWith("step-3-standard-"),
      );
      if (step3Snapshots.length > 0) {
        const context = await collector.loadSnapshot(step3Snapshots[0]);
        expect(context.step1Responses).toBeDefined();
        expect(context.step2Answers).toBeDefined();
        expect(context.step2Answers?.length).toBeGreaterThan(0);
      }

      // Test step 5 (Implementation Plan)
      const step5Snapshots = snapshots.filter((name) =>
        name.startsWith("step-5-standard-"),
      );
      if (step5Snapshots.length > 0) {
        const context = await collector.loadSnapshot(step5Snapshots[0]);
        expect(context.step3Answers).toBeDefined();
        expect(context.step3Answers?.length).toBeGreaterThan(0);
      }
    });
  });
});
