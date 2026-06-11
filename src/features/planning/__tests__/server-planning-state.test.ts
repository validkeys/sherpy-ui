/**
 * Tests for planning state server functions
 * Tests the database layer that server functions wrap
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { db } from "../../../lib/db";
import {
  _clearPlanningState,
  deletePlanningState,
  hasPlanningState,
  loadPlanningState,
  savePlanningState,
} from "../../../lib/db/planning";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import { planningMachine } from "../machines/planningMachine";

describe("Planning State Server Functions", () => {
  const projectId = "test-proj";

  beforeEach(() => {
    // Clear database before each test
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();

    // Create a project record directly in database (required due to foreign key)
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      "SHR-TEST",
      "Test Project",
      "active",
      "scratch",
      1,
      now,
      now,
    );
  });

  afterEach(() => {
    // Clean up after tests
    _clearPlanningState();
    db.prepare("DELETE FROM projects").run();
  });

  describe("savePlanningState", () => {
    it("should save a valid XState snapshot", () => {
      // Create an actor and get its snapshot
      const actor = createActor(planningMachine, {
        input: {
          projectId,
          entryPath: "new-project",
        },
      });
      actor.start();
      const snapshot = actor.getSnapshot(); // Don't call toJSON() - DB layer does that
      actor.stop();

      // Save via database function
      savePlanningState(projectId, snapshot);

      // Verify it was saved
      const hasState = hasPlanningState(projectId);
      expect(hasState).toBe(true);
    });

    it("should overwrite existing state for same projectId", () => {
      const actor1 = createActor(planningMachine, {
        input: { projectId, entryPath: "new-project" },
      });
      actor1.start();
      const snapshot1 = actor1.getSnapshot(); // Raw snapshot

      // Save first snapshot
      savePlanningState(projectId, snapshot1);

      // Send an event to change state
      actor1.send({
        type: EVENT_TYPES.SUBMIT_FORM,
        stepNumber: 1,
        responses: { test: "value" },
      });
      const snapshot2 = actor1.getSnapshot(); // Raw snapshot
      actor1.stop();

      // Save second snapshot (should overwrite)
      savePlanningState(projectId, snapshot2);

      // Load and verify it's the second snapshot
      const loaded = loadPlanningState(projectId);
      expect(loaded).toBeTruthy();
      expect(loaded?.value).toEqual(snapshot2.value);
    });
  });

  describe("loadPlanningState", () => {
    it("should return null for non-existent projectId", () => {
      const result = loadPlanningState("does-not-exist");
      expect(result).toBeNull();
    });

    it("should load previously saved state", () => {
      // Create and save a snapshot
      const actor = createActor(planningMachine, {
        input: { projectId, entryPath: "new-project" },
      });
      actor.start();
      const snapshot = actor.getSnapshot(); // Raw snapshot
      actor.stop();

      savePlanningState(projectId, snapshot);

      // Load it back
      const loaded = loadPlanningState(projectId);

      expect(loaded).toBeTruthy();
      expect(loaded?.status).toBe("active");
      expect(loaded?.value).toEqual(snapshot.value);
      expect(loaded?.context).toMatchObject({
        projectId,
        currentStepNumber: 1,
        entryPath: "new-project",
      });
    });
  });

  describe("deletePlanningState", () => {
    it("should delete existing state", () => {
      // Create and save a snapshot
      const actor = createActor(planningMachine, {
        input: { projectId, entryPath: "new-project" },
      });
      actor.start();
      const snapshot = actor.getSnapshot(); // Raw snapshot
      actor.stop();

      savePlanningState(projectId, snapshot);

      // Verify it exists
      let hasState = hasPlanningState(projectId);
      expect(hasState).toBe(true);

      // Delete it
      deletePlanningState(projectId);

      // Verify it's gone
      hasState = hasPlanningState(projectId);
      expect(hasState).toBe(false);
    });

    it("should succeed even if state doesn't exist", () => {
      // Should not throw
      deletePlanningState("does-not-exist");
    });
  });

  describe("hasPlanningState", () => {
    it("should return false for non-existent state", () => {
      const result = hasPlanningState("does-not-exist");
      expect(result).toBe(false);
    });

    it("should return true for existing state", () => {
      // Create and save a snapshot
      const actor = createActor(planningMachine, {
        input: { projectId, entryPath: "new-project" },
      });
      actor.start();
      const snapshot = actor.getSnapshot(); // Raw snapshot
      actor.stop();

      savePlanningState(projectId, snapshot);

      // Check existence
      const result = hasPlanningState(projectId);
      expect(result).toBe(true);
    });
  });

  describe("Integration: Save, Load, Delete cycle", () => {
    it("should handle full lifecycle", () => {
      // 1. Initially no state
      let hasState = hasPlanningState(projectId);
      expect(hasState).toBe(false);

      // 2. Create and save state
      const actor = createActor(planningMachine, {
        input: { projectId, entryPath: "new-project" },
      });
      actor.start();
      const snapshot = actor.getSnapshot(); // Raw snapshot
      actor.stop();

      savePlanningState(projectId, snapshot);

      // 3. Verify exists
      hasState = hasPlanningState(projectId);
      expect(hasState).toBe(true);

      // 4. Load and verify
      const loaded = loadPlanningState(projectId);
      expect(loaded).toBeTruthy();
      expect(loaded?.context.projectId).toBe(projectId);
      expect(loaded?.context.currentStepNumber).toBe(1);

      // 5. Delete
      deletePlanningState(projectId);

      // 6. Verify gone
      hasState = hasPlanningState(projectId);
      expect(hasState).toBe(false);

      // 7. Load returns null
      const afterDelete = loadPlanningState(projectId);
      expect(afterDelete).toBeNull();
    });
  });
});
