import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  _resetStore,
  createProject,
  getProject,
  listProjects,
  updateCurrentStep,
  updateProjectStatus,
} from "./store";

beforeEach(() => {
  _resetStore();
});

describe("listProjects", () => {
  it("returns empty array when store is empty", () => {
    expect(listProjects()).toEqual([]);
  });

  it("returns all projects", () => {
    createProject({ name: "Alpha", entryPath: "scratch" });
    createProject({ name: "Beta", entryPath: "doc-first" });
    expect(listProjects()).toHaveLength(2);
  });

  it("sorts by lastTouchedAt descending", async () => {
    const a = createProject({ name: "First", entryPath: "scratch" });
    await new Promise((r) => setTimeout(r, 5));
    const b = createProject({ name: "Second", entryPath: "scratch" });
    const list = listProjects();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it("reads projects from database", () => {
    const p1 = createProject({ name: "DB Alpha", entryPath: "scratch" });
    const p2 = createProject({ name: "DB Beta", entryPath: "doc-first" });

    const list = listProjects();

    expect(list).toHaveLength(2);
    expect(list.find((p) => p.id === p1.id)).toMatchObject({
      id: p1.id,
      code: p1.code,
      name: "DB Alpha",
      status: "active",
      entryPath: "scratch",
      currentStep: 1,
    });
    expect(list.find((p) => p.id === p2.id)).toMatchObject({
      id: p2.id,
      code: p2.code,
      name: "DB Beta",
      status: "active",
      entryPath: "doc-first",
      currentStep: 1,
    });
  });

  it("returns projects with camelCase field names", () => {
    createProject({ name: "CamelCase Test", entryPath: "scratch" });

    const list = listProjects();

    expect(list[0]).toHaveProperty("entryPath");
    expect(list[0]).toHaveProperty("currentStep");
    expect(list[0]).toHaveProperty("lastTouchedAt");
    expect(list[0]).toHaveProperty("createdAt");
    expect(list[0]).not.toHaveProperty("entry_path");
    expect(list[0]).not.toHaveProperty("current_step");
  });
});

describe("createProject", () => {
  it("generates an id and code", () => {
    const p = createProject({ name: "Test", entryPath: "scratch" });
    expect(p.id).toBeTruthy();
    expect(p.code).toMatch(/^SHR-\d{4}$/);
  });

  it("increments code counter", () => {
    const p1 = createProject({ name: "A", entryPath: "scratch" });
    const p2 = createProject({ name: "B", entryPath: "scratch" });
    expect(p1.code).not.toBe(p2.code);
  });

  it("sets defaults: status active, currentStep 1", () => {
    const p = createProject({ name: "X", entryPath: "doc-first" });
    expect(p.status).toBe("active");
    expect(p.currentStep).toBe(1);
    expect(p.entryPath).toBe("doc-first");
  });

  it("inserts project into database", () => {
    const p = createProject({ name: "DB Test", entryPath: "scratch" });

    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const row = stmt.get(p.id) as any;

    expect(row).toBeTruthy();
    expect(row.id).toBe(p.id);
    expect(row.code).toBe(p.code);
    expect(row.name).toBe("DB Test");
    expect(row.status).toBe("active");
    expect(row.entry_path).toBe("scratch");
    expect(row.current_step).toBe(1);
  });

  it("throws error when inserting duplicate project code", () => {
    const p1 = createProject({ name: "First", entryPath: "scratch" });

    // Manually insert duplicate code to test constraint
    const stmt = db.prepare(`
      INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    expect(() => {
      stmt.run(
        "duplicate-id",
        p1.code,
        "Duplicate",
        "active",
        "scratch",
        1,
        new Date().toISOString(),
        new Date().toISOString(),
      );
    }).toThrow();
  });
});

describe("updateProjectStatus", () => {
  it("updates status of existing project", () => {
    const p = createProject({ name: "Proj", entryPath: "scratch" });
    const updated = updateProjectStatus(p.id, "archived");
    expect(updated.status).toBe("archived");
  });

  it("throws when project not found", () => {
    expect(() => updateProjectStatus("no-such-id", "archived")).toThrow(
      "Project not found: no-such-id",
    );
  });
});

describe("getProject", () => {
  it("returns project by id", () => {
    const p = createProject({ name: "Get Me", entryPath: "scratch" });
    expect(getProject(p.id)?.name).toBe("Get Me");
  });

  it("returns undefined for unknown id", () => {
    expect(getProject("nope")).toBeUndefined();
  });
});

describe("updateCurrentStep", () => {
  it("updates currentStep for valid project and step number", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });
    const originalTimestamp = project.lastTouchedAt;

    const updated = updateCurrentStep(project.id, 3);

    expect(updated.currentStep).toBe(3);
    expect(updated.lastTouchedAt).not.toBe(originalTimestamp);
    expect(updated.id).toBe(project.id);
    expect(updated.name).toBe(project.name);
  });

  it("throws error for invalid projectId", () => {
    expect(() => updateCurrentStep("invalid-id", 2)).toThrow(
      "Project not found: invalid-id",
    );
  });

  it("throws error for invalid step number (negative)", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });

    expect(() => updateCurrentStep(project.id, -1)).toThrow(
      "Invalid step number: -1",
    );
  });

  it("throws error for invalid step number (zero)", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });

    expect(() => updateCurrentStep(project.id, 0)).toThrow(
      "Invalid step number: 0",
    );
  });

  it("updates lastTouchedAt timestamp", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });
    const originalTimestamp = project.lastTouchedAt;

    const updated = updateCurrentStep(project.id, 2);

    expect(updated.lastTouchedAt).not.toBe(originalTimestamp);
    expect(new Date(updated.lastTouchedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalTimestamp).getTime(),
    );
  });

  it("persists update in store", () => {
    const project = createProject({
      name: "Test Project",
      entryPath: "scratch",
    });

    updateCurrentStep(project.id, 5);
    const retrieved = getProject(project.id);

    expect(retrieved?.currentStep).toBe(5);
  });
});
