/**
 * Tests for form_responses database operations
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearFormResponses,
  deleteFormResponses,
  getFormResponses,
  saveFormResponse,
} from "./form";
import { db } from "./index";

beforeEach(() => {
  // Clean up any existing test data
  db.prepare("DELETE FROM form_responses").run();
  db.prepare("DELETE FROM projects").run();
});

describe("saveFormResponse", () => {
  it("should insert new form response", () => {
    const projectId = "test-proj-1";
    createTestProject(projectId);

    const responseId = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Build a new e-commerce platform",
    );

    expect(responseId).toBeDefined();
    expect(typeof responseId).toBe("string");

    const row = db
      .prepare("SELECT * FROM form_responses WHERE id = ?")
      .get(responseId) as any;

    expect(row).toBeDefined();
    expect(row.project_id).toBe(projectId);
    expect(row.step_number).toBe(1);
    expect(row.field_name).toBe("projectDescription");
    expect(row.field_value).toBe("Build a new e-commerce platform");
    expect(row.created_at).toBeDefined();
  });

  it("should support multiple fields for same project and step", () => {
    const projectId = "test-proj-2";
    createTestProject(projectId);

    const id1 = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Description",
    );
    const id2 = saveFormResponse(projectId, 1, "existingRequirements", "None");

    expect(id1).not.toBe(id2);

    const rows = db
      .prepare("SELECT * FROM form_responses WHERE project_id = ?")
      .all(projectId);

    expect(rows).toHaveLength(2);
  });

  it("should support steps 1, 5, and 7", () => {
    const projectId = "test-proj-3";
    createTestProject(projectId);

    const id1 = saveFormResponse(projectId, 1, "field1", "value1");
    const id5 = saveFormResponse(projectId, 5, "field5", "value5");
    const id7 = saveFormResponse(projectId, 7, "field7", "value7");

    const row1 = db
      .prepare("SELECT * FROM form_responses WHERE id = ?")
      .get(id1) as any;
    const row5 = db
      .prepare("SELECT * FROM form_responses WHERE id = ?")
      .get(id5) as any;
    const row7 = db
      .prepare("SELECT * FROM form_responses WHERE id = ?")
      .get(id7) as any;

    expect(row1.step_number).toBe(1);
    expect(row5.step_number).toBe(5);
    expect(row7.step_number).toBe(7);
  });

  it("should upsert when duplicate field exists (UNIQUE constraint)", () => {
    const projectId = "test-proj-4";
    createTestProject(projectId);

    // First save
    const id1 = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Original value",
    );

    // Second save with same project/step/field - should update
    const id2 = saveFormResponse(
      projectId,
      1,
      "projectDescription",
      "Updated value",
    );

    // Should return different IDs (new row created via UPSERT)
    expect(id1).not.toBe(id2);

    // Should only have one row (old one replaced)
    const rows = db
      .prepare(
        "SELECT * FROM form_responses WHERE project_id = ? AND step_number = ? AND field_name = ?",
      )
      .all(projectId, 1, "projectDescription");

    expect(rows).toHaveLength(1);
    expect((rows[0] as any).field_value).toBe("Updated value");
    expect((rows[0] as any).id).toBe(id2);
  });
});

describe("getFormResponses", () => {
  it("should return empty array when no responses exist", () => {
    const result = getFormResponses("non-existent", 1);
    expect(result).toEqual([]);
  });

  it("should retrieve all responses for a project and step", () => {
    const projectId = "test-proj-5";
    createTestProject(projectId);

    saveFormResponse(projectId, 1, "field1", "value1");
    saveFormResponse(projectId, 1, "field2", "value2");
    saveFormResponse(projectId, 5, "field5", "value5"); // Different step

    const step1Responses = getFormResponses(projectId, 1);

    expect(step1Responses).toHaveLength(2);
    expect(
      step1Responses.find((r) => r.field_name === "field1")?.field_value,
    ).toBe("value1");
    expect(
      step1Responses.find((r) => r.field_name === "field2")?.field_value,
    ).toBe("value2");
  });

  it("should return responses in chronological order (oldest first)", () => {
    const projectId = "test-proj-6";
    createTestProject(projectId);

    saveFormResponse(projectId, 1, "field1", "value1");
    saveFormResponse(projectId, 1, "field2", "value2");
    saveFormResponse(projectId, 1, "field3", "value3");

    const responses = getFormResponses(projectId, 1);

    expect(responses).toHaveLength(3);
    expect(responses[0].field_name).toBe("field1");
    expect(responses[1].field_name).toBe("field2");
    expect(responses[2].field_name).toBe("field3");
  });

  it("should include all required fields in response", () => {
    const projectId = "test-proj-7";
    createTestProject(projectId);

    saveFormResponse(projectId, 1, "testField", "testValue");
    const responses = getFormResponses(projectId, 1);

    expect(responses).toHaveLength(1);
    const response = responses[0];

    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("project_id", projectId);
    expect(response).toHaveProperty("step_number", 1);
    expect(response).toHaveProperty("field_name", "testField");
    expect(response).toHaveProperty("field_value", "testValue");
    expect(response).toHaveProperty("created_at");
  });
});

describe("deleteFormResponses", () => {
  it("should delete all responses for a project", () => {
    const projectId = "test-proj-8";
    createTestProject(projectId);

    saveFormResponse(projectId, 1, "field1", "value1");
    saveFormResponse(projectId, 1, "field2", "value2");
    saveFormResponse(projectId, 5, "field5", "value5");

    const beforeDelete = getFormResponses(projectId, 1);
    expect(beforeDelete).toHaveLength(2);

    deleteFormResponses(projectId);

    const afterDelete = getFormResponses(projectId, 1);
    expect(afterDelete).toHaveLength(0);
  });

  it("should not error when deleting for non-existent project", () => {
    expect(() => deleteFormResponses("non-existent")).not.toThrow();
  });

  it("should only delete responses for specified project", () => {
    const project1 = "test-proj-9";
    const project2 = "test-proj-10";
    createTestProject(project1);
    createTestProject(project2);

    saveFormResponse(project1, 1, "field1", "value1");
    saveFormResponse(project2, 1, "field2", "value2");

    deleteFormResponses(project1);

    expect(getFormResponses(project1, 1)).toHaveLength(0);
    expect(getFormResponses(project2, 1)).toHaveLength(1);
  });
});

describe("foreign key cascade", () => {
  it("should delete form responses when project is deleted", () => {
    const projectId = "test-proj-11";
    createTestProject(projectId);

    saveFormResponse(projectId, 1, "field1", "value1");
    saveFormResponse(projectId, 5, "field5", "value5");
    saveFormResponse(projectId, 7, "field7", "value7");

    expect(getFormResponses(projectId, 1)).toHaveLength(1);
    expect(getFormResponses(projectId, 5)).toHaveLength(1);
    expect(getFormResponses(projectId, 7)).toHaveLength(1);

    // Delete the project - should cascade to form_responses
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    expect(getFormResponses(projectId, 1)).toHaveLength(0);
    expect(getFormResponses(projectId, 5)).toHaveLength(0);
    expect(getFormResponses(projectId, 7)).toHaveLength(0);
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
