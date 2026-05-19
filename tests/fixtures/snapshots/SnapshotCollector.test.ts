/**
 * Tests for SnapshotCollector
 */

import { promises as fs } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PlanningStateBuilder } from "../builders/PlanningStateBuilder";
import { SnapshotCollector } from "./SnapshotCollector";

const SNAPSHOTS_DIR = join(process.cwd(), "tests/fixtures/snapshots");

describe("SnapshotCollector", () => {
  const collector = new SnapshotCollector();

  beforeEach(async () => {
    // Clean up test snapshots
    try {
      const files = await fs.readdir(SNAPSHOTS_DIR);
      const testFiles = files.filter((f) => f.includes("test-"));
      await Promise.all(
        testFiles.map((f) => fs.unlink(join(SNAPSHOTS_DIR, f)).catch(() => {})),
      );
    } catch (error) {
      // Directory might not exist yet, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test snapshots
    try {
      const files = await fs.readdir(SNAPSHOTS_DIR);
      const testFiles = files.filter((f) => f.includes("test-"));
      await Promise.all(
        testFiles.map((f) => fs.unlink(join(SNAPSHOTS_DIR, f)).catch(() => {})),
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("captureSnapshot", () => {
    it("captures snapshot with metadata", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .withCompletedSteps([1, 2])
        .withCurrentStepNumber(3)
        .build();

      const filename = await collector.captureSnapshot(
        state,
        3,
        "test-scenario",
      );

      expect(filename).toMatch(/^step-3-test-scenario-\d+\.json$/);

      // Verify file was created
      const files = await fs.readdir(SNAPSHOTS_DIR);
      expect(files).toContain(filename);

      // Verify content
      const content = await fs.readFile(join(SNAPSHOTS_DIR, filename), "utf-8");
      const snapshot = JSON.parse(content);

      expect(snapshot.version).toBe("1.0");
      expect(snapshot.stepNumber).toBe(3);
      expect(snapshot.label).toBe("test-scenario");
      expect(snapshot.capturedAt).toBeTruthy();
      expect(snapshot.xstateSnapshot.context.currentStepNumber).toBe(3);
      expect(snapshot.xstateSnapshot.context.completedSteps).toEqual([1, 2]);
    });

    it("sanitizes label for filename", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .withCompletedSteps([1, 2, 3, 4])
        .withCurrentStepNumber(5)
        .build();

      const filename = await collector.captureSnapshot(
        state,
        5,
        "Test Scenario! with Special@Chars#123",
      );

      expect(filename).toMatch(
        /^step-5-test-scenario.*-with-special.*chars.*-123-\d+\.json$/,
      );
    });

    it("includes complete XState snapshot structure", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .withCompletedSteps([1])
        .withCurrentStepNumber(2)
        .build();

      const filename = await collector.captureSnapshot(
        state,
        2,
        "test-complete",
      );

      const content = await fs.readFile(join(SNAPSHOTS_DIR, filename), "utf-8");
      const snapshot = JSON.parse(content);

      expect(snapshot.xstateSnapshot).toMatchObject({
        status: "active",
        value: "step2",
        context: expect.any(Object),
        children: {},
        historyValue: {},
        tags: [],
      });
    });

    it("warns if stepNumber does not match context", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .withCompletedSteps([1, 2, 3, 4])
        .withCurrentStepNumber(5)
        .build();
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await collector.captureSnapshot(state, 3, "test-mismatch");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("stepNumber parameter (3)"),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("loadSnapshot", () => {
    it("loads snapshot by filename", async () => {
      const originalState = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .withCompletedSteps([1, 2, 3])
        .withCurrentStepNumber(4)
        .build();
      const filename = await collector.captureSnapshot(
        originalState,
        4,
        "test-load",
      );

      const loadedState = await collector.loadSnapshot(filename);

      expect(loadedState.currentStepNumber).toBe(4);
      expect(loadedState.completedSteps).toEqual([1, 2, 3]);
      expect(loadedState.projectId).toBe(originalState.projectId);
    });

    it("throws error for non-existent file", async () => {
      await expect(
        collector.loadSnapshot("non-existent-file.json"),
      ).rejects.toThrow();
    });

    it("validates snapshot version compatibility", async () => {
      const invalidSnapshot = {
        version: "999.0",
        capturedAt: new Date().toISOString(),
        stepNumber: 5,
        label: "test-invalid",
        xstateSnapshot: {
          status: "active",
          value: "step5",
          context: {},
          children: {},
          historyValue: {},
          tags: [],
        },
      };

      const filename = "test-invalid-version.json";
      await fs.writeFile(
        join(SNAPSHOTS_DIR, filename),
        JSON.stringify(invalidSnapshot),
        "utf-8",
      );

      await expect(collector.loadSnapshot(filename)).rejects.toThrow(
        "Incompatible snapshot version",
      );
    });
  });

  describe("loadFullSnapshot", () => {
    it("loads complete snapshot with metadata", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .completeStep(5)
        .completeStep(6)
        .withCompletedSteps([1, 2, 3, 4, 5, 6])
        .withCurrentStepNumber(7)
        .build();
      const filename = await collector.captureSnapshot(state, 7, "test-full");

      const snapshot = await collector.loadFullSnapshot(filename);

      expect(snapshot.version).toBe("1.0");
      expect(snapshot.stepNumber).toBe(7);
      expect(snapshot.label).toBe("test-full");
      expect(snapshot.capturedAt).toBeTruthy();
      expect(snapshot.xstateSnapshot.context.currentStepNumber).toBe(7);
    });
  });

  describe("listSnapshots", () => {
    it("returns empty array when no snapshots exist", async () => {
      const snapshots = await collector.listSnapshots();
      expect(snapshots.filter((s) => s.includes("test-"))).toEqual([]);
    });

    it("lists all snapshot files", async () => {
      const state1 = PlanningStateBuilder.new()
        .withCurrentStepNumber(1)
        .build();
      const state2 = PlanningStateBuilder.new()
        .completeStep(1)
        .withCompletedSteps([1])
        .withCurrentStepNumber(2)
        .build();

      const file1 = await collector.captureSnapshot(state1, 1, "test-list-1");
      const file2 = await collector.captureSnapshot(state2, 2, "test-list-2");

      const snapshots = await collector.listSnapshots();

      expect(snapshots).toContain(file1);
      expect(snapshots).toContain(file2);
    });

    it('only returns JSON files starting with "step-"', async () => {
      // Create a non-snapshot file
      await fs.writeFile(join(SNAPSHOTS_DIR, "README.md"), "test", "utf-8");

      const snapshots = await collector.listSnapshots();

      expect(snapshots).not.toContain("README.md");
    });
  });

  describe("deleteSnapshot", () => {
    it("deletes snapshot file", async () => {
      const state = PlanningStateBuilder.new()
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .completeStep(5)
        .withCompletedSteps([1, 2, 3, 4, 5])
        .withCurrentStepNumber(6)
        .build();
      const filename = await collector.captureSnapshot(state, 6, "test-delete");

      await collector.deleteSnapshot(filename);

      const files = await fs.readdir(SNAPSHOTS_DIR);
      expect(files).not.toContain(filename);
    });

    it("throws error for non-existent file", async () => {
      await expect(
        collector.deleteSnapshot("non-existent.json"),
      ).rejects.toThrow();
    });
  });
});
