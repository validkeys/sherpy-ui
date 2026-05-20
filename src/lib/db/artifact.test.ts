/**
 * Tests for artifacts database operations
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  _clearArtifacts,
  deleteArtifacts,
  getArtifact,
  getArtifacts,
  saveArtifact,
} from "./artifact";
import { db } from "./index";

beforeEach(() => {
  // Clean up any existing test data
  db.prepare("DELETE FROM artifacts").run();
  db.prepare("DELETE FROM projects").run();
});

describe("saveArtifact", () => {
  it("should insert new artifact", () => {
    const projectId = "test-proj-1";
    createTestProject(projectId);

    const artifactId = saveArtifact(
      projectId,
      1,
      "yaml",
      "# Gap Analysis\nkey: value",
    );

    expect(artifactId).toBeDefined();
    expect(typeof artifactId).toBe("string");

    const row = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(artifactId) as any;

    expect(row).toBeDefined();
    expect(row.project_id).toBe(projectId);
    expect(row.step_number).toBe(1);
    expect(row.artifact_type).toBe("yaml");
    expect(row.content).toBe("# Gap Analysis\nkey: value");
    expect(row.generated_at).toBeDefined();
  });

  it("should support all step numbers (1-10)", () => {
    const projectId = "test-proj-2";
    createTestProject(projectId);

    // Test all 10 steps
    for (let step = 1; step <= 10; step++) {
      const id = saveArtifact(
        projectId,
        step as any,
        "yaml",
        `step ${step} content`,
      );
      const row = db
        .prepare("SELECT * FROM artifacts WHERE id = ?")
        .get(id) as any;
      expect(row.step_number).toBe(step);
    }

    const allArtifacts = db
      .prepare("SELECT * FROM artifacts WHERE project_id = ?")
      .all(projectId);
    expect(allArtifacts).toHaveLength(10);
  });

  it("should support both yaml and markdown artifact types", () => {
    const projectId = "test-proj-3";
    createTestProject(projectId);

    const yamlId = saveArtifact(projectId, 1, "yaml", "key: value");
    const mdId = saveArtifact(projectId, 2, "markdown", "# Heading");

    const yamlRow = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(yamlId) as any;
    const mdRow = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(mdId) as any;

    expect(yamlRow.artifact_type).toBe("yaml");
    expect(mdRow.artifact_type).toBe("markdown");
  });

  it("should upsert when duplicate step exists (UNIQUE constraint)", () => {
    const projectId = "test-proj-4";
    createTestProject(projectId);

    // First save
    const id1 = saveArtifact(projectId, 1, "yaml", "original: content");

    // Second save with same project/step - should update
    const id2 = saveArtifact(projectId, 1, "yaml", "updated: content");

    // Should return different IDs (new row created via UPSERT)
    expect(id1).not.toBe(id2);

    // Should only have one row (old one replaced)
    const rows = db
      .prepare(
        "SELECT * FROM artifacts WHERE project_id = ? AND step_number = ?",
      )
      .all(projectId, 1);

    expect(rows).toHaveLength(1);
    expect((rows[0] as any).content).toBe("updated: content");
    expect((rows[0] as any).id).toBe(id2);
  });
});

describe("getArtifacts", () => {
  it("should return empty array when no artifacts exist", () => {
    const result = getArtifacts("non-existent");
    expect(result).toEqual([]);
  });

  it("should retrieve all artifacts for a project", () => {
    const projectId = "test-proj-5";
    createTestProject(projectId);

    saveArtifact(projectId, 1, "yaml", "step1 content");
    saveArtifact(projectId, 2, "yaml", "step2 content");
    saveArtifact(projectId, 5, "markdown", "step5 content");

    const artifacts = getArtifacts(projectId);

    expect(artifacts).toHaveLength(3);
    expect(artifacts.find((a) => a.step_number === 1)?.content).toBe(
      "step1 content",
    );
    expect(artifacts.find((a) => a.step_number === 2)?.content).toBe(
      "step2 content",
    );
    expect(artifacts.find((a) => a.step_number === 5)?.content).toBe(
      "step5 content",
    );
  });

  it("should return artifacts in step order (ascending)", () => {
    const projectId = "test-proj-6";
    createTestProject(projectId);

    // Insert out of order
    saveArtifact(projectId, 5, "yaml", "step5");
    saveArtifact(projectId, 1, "yaml", "step1");
    saveArtifact(projectId, 3, "yaml", "step3");

    const artifacts = getArtifacts(projectId);

    expect(artifacts).toHaveLength(3);
    expect(artifacts[0].step_number).toBe(1);
    expect(artifacts[1].step_number).toBe(3);
    expect(artifacts[2].step_number).toBe(5);
  });

  it("should include all required fields in response", () => {
    const projectId = "test-proj-7";
    createTestProject(projectId);

    saveArtifact(projectId, 1, "yaml", "test content");
    const artifacts = getArtifacts(projectId);

    expect(artifacts).toHaveLength(1);
    const artifact = artifacts[0];

    expect(artifact).toHaveProperty("id");
    expect(artifact).toHaveProperty("project_id", projectId);
    expect(artifact).toHaveProperty("step_number", 1);
    expect(artifact).toHaveProperty("artifact_type", "yaml");
    expect(artifact).toHaveProperty("content", "test content");
    expect(artifact).toHaveProperty("generated_at");
  });
});

describe("getArtifact", () => {
  it("should return null when artifact does not exist", () => {
    const result = getArtifact("non-existent", 1);
    expect(result).toBeNull();
  });

  it("should retrieve specific artifact by project and step", () => {
    const projectId = "test-proj-8";
    createTestProject(projectId);

    saveArtifact(projectId, 1, "yaml", "step1 content");
    saveArtifact(projectId, 2, "yaml", "step2 content");

    const artifact = getArtifact(projectId, 1);

    expect(artifact).not.toBeNull();
    expect(artifact?.step_number).toBe(1);
    expect(artifact?.content).toBe("step1 content");
  });

  it("should return null when step exists for different project", () => {
    const project1 = "test-proj-9";
    const project2 = "test-proj-10";
    createTestProject(project1);
    createTestProject(project2);

    saveArtifact(project1, 1, "yaml", "project1 step1");

    const result = getArtifact(project2, 1);
    expect(result).toBeNull();
  });
});

describe("deleteArtifacts", () => {
  it("should delete all artifacts for a project", () => {
    const projectId = "test-proj-11";
    createTestProject(projectId);

    saveArtifact(projectId, 1, "yaml", "content1");
    saveArtifact(projectId, 2, "yaml", "content2");
    saveArtifact(projectId, 5, "markdown", "content5");

    const beforeDelete = getArtifacts(projectId);
    expect(beforeDelete).toHaveLength(3);

    deleteArtifacts(projectId);

    const afterDelete = getArtifacts(projectId);
    expect(afterDelete).toHaveLength(0);
  });

  it("should not error when deleting for non-existent project", () => {
    expect(() => deleteArtifacts("non-existent")).not.toThrow();
  });

  it("should only delete artifacts for specified project", () => {
    const project1 = "test-proj-12";
    const project2 = "test-proj-13";
    createTestProject(project1);
    createTestProject(project2);

    saveArtifact(project1, 1, "yaml", "content1");
    saveArtifact(project2, 1, "yaml", "content2");

    deleteArtifacts(project1);

    expect(getArtifacts(project1)).toHaveLength(0);
    expect(getArtifacts(project2)).toHaveLength(1);
  });
});

describe("foreign key cascade", () => {
  it("should delete artifacts when project is deleted", () => {
    const projectId = "test-proj-14";
    createTestProject(projectId);

    saveArtifact(projectId, 1, "yaml", "content1");
    saveArtifact(projectId, 2, "yaml", "content2");
    saveArtifact(projectId, 3, "markdown", "content3");

    expect(getArtifacts(projectId)).toHaveLength(3);

    // Delete the project - should cascade to artifacts
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    expect(getArtifacts(projectId)).toHaveLength(0);
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
