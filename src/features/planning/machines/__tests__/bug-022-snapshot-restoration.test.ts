/**
 * BUG-022 Phase 3: Snapshot Restoration Tests
 *
 * Regression tests for the bug where page refresh caused state to revert
 * from Step 7 to Step 1 due to incorrect createActor() usage.
 *
 * Root Cause: Providing both `input` and `snapshot` to createActor() caused
 * XState v5 to call the context factory function, which recreated initial
 * context and overrode the snapshot's context (including currentStepNumber).
 *
 * Fix: Only provide `snapshot` when restoring (no `input` needed).
 */

import { describe, expect, it } from "vitest";
import { createActor, type SnapshotFrom } from "xstate";
import { planningMachine } from "../planningMachine";
import type { PlanningInput } from "../types";

describe("BUG-022: Snapshot Restoration", () => {
  const mockInput: PlanningInput = {
    projectId: "test-project-123",
    entryPath: "/workspace/test",
  };

  describe("createActor with snapshot", () => {
    it("should restore to Step 7 state when snapshot says Step 7 (without input)", () => {
      // 1. Create a fresh actor and get its initial snapshot
      const freshActor = createActor(planningMachine, { input: mockInput });
      freshActor.start();
      const freshSnapshot = freshActor.getSnapshot();

      // 2. Create a modified snapshot at Step 7 (simulating restored state)
      const step7Snapshot: SnapshotFrom<typeof planningMachine> = {
        ...freshSnapshot,
        value: { step7_archDecisions: "reviewing" }, // State at Step 7
        context: {
          ...freshSnapshot.context,
          currentStepNumber: 7, // Context says Step 7
          updatedAt: new Date().toISOString(),
        },
      };

      // 3. Create actor from Step 7 snapshot WITHOUT providing input
      // ✅ CORRECT: Only provide snapshot (no input)
      const restoredActor = createActor(planningMachine, {
        snapshot: step7Snapshot,
      });

      restoredActor.start();
      const restoredSnapshot = restoredActor.getSnapshot();

      // 4. Verify restored actor stays at Step 7
      expect(restoredSnapshot.context.currentStepNumber).toBe(7);
      expect(restoredSnapshot.context.projectId).toBe(mockInput.projectId);
      expect(restoredSnapshot.value).toHaveProperty("step7_archDecisions");

      restoredActor.stop();
      freshActor.stop();
    });

    it("should work even when both input and snapshot are provided (XState 5.31.1+)", () => {
      // 1. Create a fresh actor and get its initial snapshot
      const freshActor = createActor(planningMachine, { input: mockInput });
      freshActor.start();
      const freshSnapshot = freshActor.getSnapshot();

      // 2. Create a modified snapshot at Step 7
      const step7Snapshot: SnapshotFrom<typeof planningMachine> = {
        ...freshSnapshot,
        value: { step7_archDecisions: "reviewing" },
        context: {
          ...freshSnapshot.context,
          currentStepNumber: 7,
          updatedAt: new Date().toISOString(),
        },
      };

      // 3. Provide BOTH input and snapshot
      // NOTE: In XState 5.31.1+, this appears to work correctly now!
      // The snapshot's context is preserved even when input is provided.
      const actorWithBoth = createActor(planningMachine, {
        input: mockInput,
        snapshot: step7Snapshot,
      });

      actorWithBoth.start();
      const snapshotWithBoth = actorWithBoth.getSnapshot();

      // 4. Verify it correctly preserves Step 7 (XState fix)
      // This test documents that XState 5.31.1+ handles this correctly
      expect(snapshotWithBoth.context.currentStepNumber).toBe(7);
      expect(snapshotWithBoth.value).toHaveProperty("step7_archDecisions");

      // However, the fix in PlanningMachineContext.tsx is still correct:
      // Not providing input when restoring from snapshot is the cleaner approach
      // and matches XState's recommended pattern.

      actorWithBoth.stop();
      freshActor.stop();
    });
  });

  describe("PlanningMachineContext integration", () => {
    it("should preserve all context fields when restoring from snapshot", () => {
      // 1. Create a complete snapshot structure (as persisted to localStorage/DB)
      const freshActor = createActor(planningMachine, { input: mockInput });
      freshActor.start();
      const base = freshActor.getSnapshot();

      const step5Snapshot: SnapshotFrom<typeof planningMachine> = {
        ...base,
        value: { step5_implPlanner: "collecting" },
        context: {
          ...base.context,
          projectId: "test-project-456",
          entryPath: "/workspace/custom-project",
          currentStepNumber: 5,
          step1Responses: { field1: "value1" },
          step2Answers: [
            {
              question: "Q1",
              value: "A1",
              timestamp: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        },
      };

      // 2. ✅ CORRECT: Only provide snapshot
      const restoredActor = createActor(planningMachine, {
        snapshot: step5Snapshot,
      });

      restoredActor.start();
      const restored = restoredActor.getSnapshot();

      // 3. Verify all context fields preserved
      expect(restored.context.currentStepNumber).toBe(5);
      expect(restored.context.projectId).toBe("test-project-456");
      expect(restored.context.entryPath).toBe("/workspace/custom-project");
      expect(restored.context.step1Responses).toEqual({ field1: "value1" });
      expect(restored.context.step2Answers).toHaveLength(1);

      restoredActor.stop();
      freshActor.stop();
    });

    it("should handle fresh actor creation with input (no snapshot)", () => {
      // When no snapshot available, input is required
      const freshActor = createActor(planningMachine, { input: mockInput });
      freshActor.start();

      const snapshot = freshActor.getSnapshot();

      // Fresh actor should start at Step 1
      expect(snapshot.context.currentStepNumber).toBe(1);
      expect(snapshot.context.projectId).toBe(mockInput.projectId);
      expect(snapshot.value).toHaveProperty("step1_gapAnalysis");

      freshActor.stop();
    });
  });
});
