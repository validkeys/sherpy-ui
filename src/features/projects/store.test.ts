import { beforeEach, describe, expect, it } from "vitest";
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
    const project = createProject({ name: "Test Project", entryPath: "scratch" });
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
    const project = createProject({ name: "Test Project", entryPath: "scratch" });

    expect(() => updateCurrentStep(project.id, -1)).toThrow(
      "Invalid step number: -1",
    );
  });

  it("throws error for invalid step number (zero)", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });

    expect(() => updateCurrentStep(project.id, 0)).toThrow(
      "Invalid step number: 0",
    );
  });

  it("updates lastTouchedAt timestamp", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });
    const originalTimestamp = project.lastTouchedAt;

    const updated = updateCurrentStep(project.id, 2);

    expect(updated.lastTouchedAt).not.toBe(originalTimestamp);
    expect(new Date(updated.lastTouchedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalTimestamp).getTime(),
    );
  });

  it("persists update in store", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });

    updateCurrentStep(project.id, 5);
    const retrieved = getProject(project.id);

    expect(retrieved?.currentStep).toBe(5);
  });
});
