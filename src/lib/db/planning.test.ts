/**
 * Tests for planning state database operations
 */

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./index";
import {
  deletePlanningState,
  hasPlanningState,
  loadPlanningState,
  savePlanningState,
} from "./planning";

beforeEach(() => {
  // Clean up any existing test data
  db.prepare("DELETE FROM planning_state").run();
  db.prepare("DELETE FROM projects").run();
});

describe("savePlanningState", () => {
  it("should insert new planning state snapshot", () => {
    const projectId = "test-proj-1";
    createTestProject(projectId);
    const mockSnapshot = createMockSnapshot(projectId, 1);

    savePlanningState(projectId, mockSnapshot as any);

    const row = db
      .prepare("SELECT * FROM planning_state WHERE project_id = ?")
      .get(projectId) as any;

    expect(row).toBeDefined();
    expect(row.project_id).toBe(projectId);
    expect(row.xstate_snapshot).toBeDefined();

    const parsed = JSON.parse(row.xstate_snapshot);
    expect(parsed.status).toBe("active");
    expect(parsed.context.projectId).toBe(projectId);
  });

  it("should update existing planning state on conflict", () => {
    const projectId = "test-proj-2";
    createTestProject(projectId);
    const snapshot1 = createMockSnapshot(projectId, 1);
    const snapshot2 = createMockSnapshot(projectId, 2);

    savePlanningState(projectId, snapshot1 as any);
    savePlanningState(projectId, snapshot2 as any);

    const rows = db
      .prepare("SELECT * FROM planning_state WHERE project_id = ?")
      .all(projectId);

    expect(rows).toHaveLength(1); // Should be updated, not duplicated

    const parsed = JSON.parse((rows[0] as any).xstate_snapshot);
    expect(parsed.context.currentStepNumber).toBe(2); // Updated value
  });

  it("should store complete XState snapshot structure", () => {
    const projectId = "test-proj-3";
    createTestProject(projectId);
    const mockSnapshot = createMockSnapshot(projectId, 3);

    savePlanningState(projectId, mockSnapshot as any);

    const row = db
      .prepare(
        "SELECT xstate_snapshot FROM planning_state WHERE project_id = ?",
      )
      .get(projectId) as any;

    const parsed = JSON.parse(row.xstate_snapshot);

    // Validate complete snapshot structure
    expect(parsed.status).toBeDefined();
    expect(parsed.value).toBeDefined();
    expect(parsed.context).toBeDefined();
    expect(parsed.children).toBeDefined();
    expect(parsed.historyValue).toBeDefined();
  });
});

describe("loadPlanningState", () => {
  it("should return null when no state exists", () => {
    const result = loadPlanningState("non-existent");
    expect(result).toBeNull();
  });

  it("should load and parse saved snapshot", () => {
    const projectId = "test-proj-4";
    createTestProject(projectId);
    const mockSnapshot = createMockSnapshot(projectId, 5);

    savePlanningState(projectId, mockSnapshot as any);
    const loaded = loadPlanningState(projectId);

    expect(loaded).toBeDefined();
    expect(loaded).toHaveProperty("status", "active");
    expect(loaded).toHaveProperty("context");
    expect((loaded as any).context.projectId).toBe(projectId);
    expect((loaded as any).context.currentStepNumber).toBe(5);
  });

  it("should force status to active if not active", () => {
    const projectId = "test-proj-5";
    createTestProject(projectId);

    // Manually insert a snapshot with status: 'stopped'
    const corruptedSnapshot = {
      status: "stopped",
      value: "step1",
      context: { projectId, currentStepNumber: 1 },
      children: {},
      historyValue: {},
    };

    db.prepare(
      "INSERT INTO planning_state (project_id, xstate_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run(
      projectId,
      JSON.stringify(corruptedSnapshot),
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const loaded = loadPlanningState(projectId);

    expect(loaded).toBeDefined();
    expect((loaded as any).status).toBe("active"); // Should be forced to active
  });

  it("should return null for invalid snapshot structure", () => {
    const projectId = "test-proj-6";
    createTestProject(projectId);

    // Insert invalid snapshot (missing required fields)
    db.prepare(
      "INSERT INTO planning_state (project_id, xstate_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?)",
    ).run(
      projectId,
      JSON.stringify({ incomplete: true }),
      new Date().toISOString(),
      new Date().toISOString(),
    );

    const loaded = loadPlanningState(projectId);
    expect(loaded).toBeNull();
  });
});

describe("deletePlanningState", () => {
  it("should delete planning state for a project", () => {
    const projectId = "test-proj-7";
    createTestProject(projectId);
    const mockSnapshot = createMockSnapshot(projectId, 1);

    savePlanningState(projectId, mockSnapshot as any);
    expect(hasPlanningState(projectId)).toBe(true);

    deletePlanningState(projectId);
    expect(hasPlanningState(projectId)).toBe(false);
  });

  it("should not error when deleting non-existent state", () => {
    expect(() => deletePlanningState("non-existent")).not.toThrow();
  });
});

describe("hasPlanningState", () => {
  it("should return false when no state exists", () => {
    expect(hasPlanningState("non-existent")).toBe(false);
  });

  it("should return true when state exists", () => {
    const projectId = "test-proj-8";
    createTestProject(projectId);
    const mockSnapshot = createMockSnapshot(projectId, 1);

    savePlanningState(projectId, mockSnapshot as any);
    expect(hasPlanningState(projectId)).toBe(true);
  });
});

describe("foreign key cascade", () => {
  it("should delete planning state when project is deleted", () => {
    // First create a project
    const projectId = "test-proj-9";
    db.prepare(`
        INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
      projectId,
      "TEST-001",
      "Test Project",
      "active",
      "scratch",
      1,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    // Save planning state
    const mockSnapshot = createMockSnapshot(projectId, 1);
    savePlanningState(projectId, mockSnapshot as any);
    expect(hasPlanningState(projectId)).toBe(true);

    // Delete the project - should cascade to planning_state
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    expect(hasPlanningState(projectId)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Create a test project in the database
 */
function createTestProject(projectId: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    `TEST-${projectId.slice(-3)}`,
    `Test Project ${projectId}`,
    "active",
    "scratch",
    1,
    now,
    now,
  );
}

/**
 * Create a mock XState snapshot for testing
 */
function createMockSnapshot(projectId: string, currentStepNumber: number) {
  return {
    status: "active",
    value: `step${currentStepNumber}`,
    context: {
      projectId,
      entryPath: "new-project",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      step1Responses: {},
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber,
      error: null,
    },
    children: {},
    historyValue: {},
    toJSON() {
      // Mock toJSON method
      return {
        status: this.status,
        value: this.value,
        context: this.context,
        children: this.children,
        historyValue: this.historyValue,
      };
    },
  };
}
