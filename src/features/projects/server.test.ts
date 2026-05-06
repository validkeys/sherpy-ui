import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetStore,
  createProject,
  listProjects,
  updateProjectStatus,
} from "./store";

// Server fns delegate to store functions and add validation.
// We test the store functions (underlying behaviour) and validator
// logic extracted inline — the server fn builders are thin wrappers
// that cannot be invoked in Vitest without the TanStack Start Vite
// plugin transformation.

// --- validator helpers (mirrors server.ts validators) ---

function validateCreateProjectInput(data: unknown) {
  if (typeof data !== "object" || data === null)
    throw new Error("invalid input: expected object");
  const d = data as Record<string, unknown>;
  if (typeof d.name !== "string" || !d.name.trim())
    throw new Error("name is required");
  if (d.entryPath !== "scratch" && d.entryPath !== "doc-first")
    throw new Error("invalid entryPath");
  return {
    name: (d.name as string).trim(),
    entryPath: d.entryPath as "scratch" | "doc-first",
  };
}

function validateUpdateStatusInput(data: unknown) {
  if (typeof data !== "object" || data === null)
    throw new Error("invalid input: expected object");
  const d = data as Record<string, unknown>;
  if (typeof d.id !== "string" || !d.id) throw new Error("id is required");
  if (d.status !== "archived" && d.status !== "complete")
    throw new Error("status must be archived or complete");
  return { id: d.id, status: d.status as "archived" | "complete" };
}

beforeEach(() => {
  _resetStore();
});

describe("$listProjects (store delegate)", () => {
  it("returns empty array initially", () => {
    expect(listProjects()).toEqual([]);
  });

  it("returns created projects", () => {
    createProject({ name: "Alpha", entryPath: "scratch" });
    expect(listProjects()).toHaveLength(1);
  });
});

describe("$createProject validator", () => {
  it("accepts valid input and trims name", () => {
    const result = validateCreateProjectInput({
      name: "  My Project  ",
      entryPath: "scratch",
    });
    expect(result.name).toBe("My Project");
    expect(result.entryPath).toBe("scratch");
  });

  it("throws on non-object input", () => {
    expect(() => validateCreateProjectInput("bad")).toThrow(
      "invalid input: expected object",
    );
  });

  it("throws on missing name", () => {
    expect(() =>
      validateCreateProjectInput({ name: "", entryPath: "scratch" }),
    ).toThrow("name is required");
  });

  it("throws on invalid entryPath", () => {
    expect(() =>
      validateCreateProjectInput({ name: "Test", entryPath: "unknown" }),
    ).toThrow("invalid entryPath");
  });
});

describe("$createProject (store delegate)", () => {
  it("creates a project with valid input", () => {
    const p = createProject({ name: "Test", entryPath: "scratch" });
    expect(p.name).toBe("Test");
    expect(p.status).toBe("active");
    expect(listProjects()).toHaveLength(1);
  });
});

describe("$updateProjectStatus validator", () => {
  it("accepts valid archive input", () => {
    const result = validateUpdateStatusInput({ id: "abc", status: "archived" });
    expect(result).toEqual({ id: "abc", status: "archived" });
  });

  it("throws on missing id", () => {
    expect(() =>
      validateUpdateStatusInput({ id: "", status: "archived" }),
    ).toThrow("id is required");
  });

  it("throws on invalid status", () => {
    expect(() =>
      validateUpdateStatusInput({ id: "abc", status: "active" }),
    ).toThrow("status must be archived or complete");
  });
});

describe("$updateProjectStatus (store delegate)", () => {
  it("archives a project", () => {
    const p = createProject({ name: "X", entryPath: "scratch" });
    const updated = updateProjectStatus(p.id, "archived");
    expect(updated.status).toBe("archived");
  });

  it("throws on unknown id", () => {
    expect(() => updateProjectStatus("no-such-id", "archived")).toThrow(
      "Project not found: no-such-id",
    );
  });
});
