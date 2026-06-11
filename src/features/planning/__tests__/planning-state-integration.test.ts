/**
 * Planning State Integration Tests (Task 3.5)
 *
 * Tests the complete planning state persistence system end-to-end:
 * - Database layer (src/lib/db/planning.ts)
 * - XState machine integration
 * - State restoration and round-trip persistence
 * - Error handling and recovery
 */

import { nanoid } from "nanoid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor, type SnapshotFrom } from "xstate";
import { db } from "../../../lib/db";
import {
  deletePlanningState,
  loadPlanningState,
  savePlanningState,
} from "../../../lib/db/planning";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import { planningMachine } from "../machines/planningMachine";
import type { PlanningInput } from "../machines/types";

type PlanningSnapshot = SnapshotFrom<typeof planningMachine>;

describe("Planning State Integration Tests (Task 3.5)", () => {
  // Test fixtures
  const testProjectId = `test-project-${nanoid(8)}`;
  const testInput: PlanningInput = {
    projectId: testProjectId,
    entryPath: "new-project",
  };

  beforeEach(() => {
    // Create the project in the projects table first (foreign key requirement)
    const projectStmt = db.prepare(`
      INSERT OR REPLACE INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    projectStmt.run(
      testProjectId,
      `TST-${nanoid(4)}`,
      "Test Project",
      "active",
      "scratch",
      1,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    // Ensure clean planning state before each test
    try {
      deletePlanningState(testProjectId);
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(() => {
    // Clean up after each test
    try {
      deletePlanningState(testProjectId);
    } catch {
      // Ignore if doesn't exist
    }

    // Clean up project
    try {
      const deleteStmt = db.prepare("DELETE FROM projects WHERE id = ?");
      deleteStmt.run(testProjectId);
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("End-to-end persistence flow", () => {
    it("saves and loads planning state correctly", () => {
      // Create an actor and get its snapshot
      const actor = createActor(planningMachine, { input: testInput });
      actor.start();

      const originalSnapshot = actor.getSnapshot();
      const snapshotJSON = originalSnapshot.toJSON();

      // Save to database
      savePlanningState(testProjectId, snapshotJSON);

      // Load from database
      const loadedSnapshot = loadPlanningState(testProjectId);
      expect(loadedSnapshot).toBeDefined();
      expect(loadedSnapshot?.context.projectId).toBe(testProjectId);

      // Verify snapshot completeness (all XState v5 required fields)
      expect(loadedSnapshot).toHaveProperty("status");
      expect(loadedSnapshot).toHaveProperty("value");
      expect(loadedSnapshot).toHaveProperty("context");
      expect(loadedSnapshot).toHaveProperty("children");
      expect(loadedSnapshot).toHaveProperty("historyValue");
      expect(loadedSnapshot?.status).toBe("active");

      actor.stop();
    });

    it("handles round-trip save and load with state modifications", async () => {
      // Create and start actor
      const actor1 = createActor(planningMachine, { input: testInput });
      actor1.start();

      // Modify state by sending an event
      actor1.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Test project",
        },
      });

      // Wait for state to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshot1 = actor1.getSnapshot();

      // Save to database
      savePlanningState(testProjectId, snapshot1.toJSON());

      // Stop first actor
      actor1.stop();

      // Load from database
      const loadedSnapshot = loadPlanningState(testProjectId);
      expect(loadedSnapshot).toBeDefined();

      // Create new actor with loaded snapshot
      const actor2 = createActor(planningMachine, {
        input: testInput,
        snapshot: loadedSnapshot as PlanningSnapshot,
      });
      actor2.start();

      const snapshot2 = actor2.getSnapshot();

      // Verify state was preserved
      expect(snapshot2.context.step1Responses).toEqual(
        snapshot1.context.step1Responses,
      );
      expect(snapshot2.context.currentStepNumber).toBe(
        snapshot1.context.currentStepNumber,
      );
      expect(snapshot2.context.projectId).toBe(testProjectId);

      actor2.stop();
    });

    it("restores state from database (cold start scenario)", async () => {
      // Simulate: User completes work on device A, then opens on device B
      // Device A: Create and save state
      const actorA = createActor(planningMachine, { input: testInput });
      actorA.start();

      actorA.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "Yes",
          projectDescription: "Healthcare app",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshotA = actorA.getSnapshot();
      savePlanningState(testProjectId, snapshotA.toJSON());

      actorA.stop();

      // Device B: Load from database (no localStorage)
      const loadedSnapshot = loadPlanningState(testProjectId);

      expect(loadedSnapshot).toBeDefined();

      const actorB = createActor(planningMachine, {
        input: testInput,
        snapshot: loadedSnapshot as PlanningSnapshot,
      });
      actorB.start();

      const snapshotB = actorB.getSnapshot();

      // Verify state was fully restored
      expect(snapshotB.context.step1Responses).toEqual({
        existingRequirements: "Yes",
        projectDescription: "Healthcare app",
      });
      expect(snapshotB.context.projectId).toBe(testProjectId);

      actorB.stop();
    });
  });

  describe("Error handling and recovery", () => {
    it("handles missing planning state gracefully", () => {
      // Attempt to load non-existent state
      const nonExistentId = `non-existent-${nanoid(8)}`;
      const result = loadPlanningState(nonExistentId);

      expect(result).toBeNull();
    });

    it("recovers from corrupted database state", () => {
      // Insert invalid data directly into DB
      const stmt = db.prepare(
        "INSERT INTO planning_state (project_id, xstate_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?)",
      );

      stmt.run(
        testProjectId,
        "invalid json",
        new Date().toISOString(),
        new Date().toISOString(),
      );

      // Attempt to load corrupted state
      const result = loadPlanningState(testProjectId);

      // Should return null for corrupted data
      expect(result).toBeNull();
    });

    it("handles database write failures due to foreign key constraints", () => {
      // Attempt to save with invalid project_id (foreign key constraint)
      const invalidProjectId = "non-existent-project";
      const actor = createActor(planningMachine, {
        input: { projectId: invalidProjectId, entryPath: "new-project" },
      });
      actor.start();

      const snapshot = actor.getSnapshot();

      // This should throw due to foreign key constraint
      expect(() => {
        savePlanningState(invalidProjectId, snapshot.toJSON());
      }).toThrow();

      actor.stop();
    });

    it("handles concurrent updates correctly (last write wins)", async () => {
      // Simulate two actors updating the same project
      const actor1 = createActor(planningMachine, { input: testInput });
      const actor2 = createActor(planningMachine, { input: testInput });

      actor1.start();
      actor2.start();

      // Both send updates
      actor1.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "No",
          projectDescription: "Update from actor 1",
        },
      });

      actor2.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "Yes",
          projectDescription: "Update from actor 2",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Save both (last write wins)
      savePlanningState(testProjectId, actor1.getSnapshot().toJSON());
      savePlanningState(testProjectId, actor2.getSnapshot().toJSON());

      // Load and verify the last save won
      const finalSnapshot = loadPlanningState(testProjectId);

      expect(finalSnapshot).toBeDefined();
      expect(finalSnapshot?.context.step1Responses).toBeDefined();
      expect(finalSnapshot?.context.step1Responses.projectDescription).toBe(
        "Update from actor 2",
      );

      actor1.stop();
      actor2.stop();
    });
  });

  describe("Timestamp tracking", () => {
    it("preserves updatedAt timestamp in snapshots", async () => {
      const actor = createActor(planningMachine, { input: testInput });
      actor.start();

      // Make a change
      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: {
          existingRequirements: "Yes",
          projectDescription: "Test",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedSnapshot = actor.getSnapshot();
      const updatedTimestamp = updatedSnapshot.context.updatedAt;

      // Verify timestamp exists and is valid
      expect(updatedTimestamp).toBeDefined();
      expect(new Date(updatedTimestamp).getTime()).toBeGreaterThan(0);

      // Save and load - timestamp should be preserved
      savePlanningState(testProjectId, updatedSnapshot.toJSON());
      const loadedSnapshot = loadPlanningState(testProjectId);

      expect(loadedSnapshot?.context.updatedAt).toBe(updatedTimestamp);

      actor.stop();
    });
  });

  describe("Performance and data integrity", () => {
    it("handles multiple rapid saves without corruption", async () => {
      // Create 10 separate actors and save each state
      // This tests that the database can handle rapid writes
      for (let i = 0; i < 10; i++) {
        const actor = createActor(planningMachine, { input: testInput });
        actor.start();

        actor.send({
          type: EVENT_TYPES.SUBMIT_FORM,
          stepNumber: 1,
          responses: {
            existingRequirements: "Yes",
            projectDescription: `Update ${i}`,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 5));
        savePlanningState(testProjectId, actor.getSnapshot().toJSON());
        actor.stop();
      }

      // Load final state - should be the last saved state
      const finalSnapshot = loadPlanningState(testProjectId);

      expect(finalSnapshot).toBeDefined();
      expect(finalSnapshot?.context.step1Responses.projectDescription).toBe(
        "Update 9",
      );
    });

    it("maintains snapshot completeness across save/load cycles", () => {
      const actor = createActor(planningMachine, { input: testInput });
      actor.start();

      const originalSnapshot = actor.getSnapshot().toJSON();

      // Save
      savePlanningState(testProjectId, originalSnapshot);

      // Load
      const loadedSnapshot = loadPlanningState(testProjectId);

      // Verify all XState v5 required fields are present
      expect(loadedSnapshot).toHaveProperty("status");
      expect(loadedSnapshot).toHaveProperty("value");
      expect(loadedSnapshot).toHaveProperty("context");
      expect(loadedSnapshot).toHaveProperty("children");
      expect(loadedSnapshot).toHaveProperty("historyValue");
      expect(loadedSnapshot).toHaveProperty("tags");

      // Verify status is active (not stopped)
      expect(loadedSnapshot?.status).toBe("active");

      actor.stop();
    });

    it("handles large snapshot data efficiently", async () => {
      const actor = createActor(planningMachine, { input: testInput });
      actor.start();

      // Create a large response object
      const largeResponse = {
        existingRequirements: "Yes",
        projectDescription: "A".repeat(10000), // 10KB of data
      };

      actor.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: largeResponse,
      });

      // Wait for state to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      const startTime = Date.now();

      // Save large snapshot
      savePlanningState(testProjectId, actor.getSnapshot().toJSON());

      // Load large snapshot
      const loadedSnapshot = loadPlanningState(testProjectId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);

      // Verify data integrity
      expect(loadedSnapshot?.context.step1Responses).toEqual(largeResponse);

      actor.stop();
    });
  });
});
