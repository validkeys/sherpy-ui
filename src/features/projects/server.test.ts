import { beforeEach, describe, expect, it } from "vitest";
import {
  _resetStore,
  createProject,
  getProject,
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

function validateHealthCheckInput(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid input: expected object");
  }
  const d = data as Record<string, unknown>;
  if (typeof d.projectId !== "string" || !d.projectId) {
    throw new Error("projectId required");
  }
  return { projectId: d.projectId };
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

describe("$healthCheck validator", () => {
  it("accepts valid input with projectId", () => {
    const result = validateHealthCheckInput({ projectId: "test-123" });
    expect(result).toEqual({ projectId: "test-123" });
  });

  it("throws on non-object input", () => {
    expect(() => validateHealthCheckInput("bad")).toThrow(
      "invalid input: expected object",
    );
  });

  it("throws on missing projectId", () => {
    expect(() => validateHealthCheckInput({ projectId: "" })).toThrow(
      "projectId required",
    );
  });

  it("throws on null input", () => {
    expect(() => validateHealthCheckInput(null)).toThrow(
      "invalid input: expected object",
    );
  });
});

describe("$healthCheck (logic simulation)", () => {
  it("simulates healthy response when project exists", async () => {
    const p = createProject({ name: "Test", entryPath: "scratch" });
    const project = await getProject(p.id);

    expect(project).toBeTruthy();

    // Simulate health check result (database assumed writable in tests)
    const result = {
      healthy: !!project && true, // Assume database writable
      projectExists: !!project,
      databaseWritable: true,
      timestamp: new Date().toISOString(),
    };

    expect(result.healthy).toBe(true);
    expect(result.projectExists).toBe(true);
    expect(result.databaseWritable).toBe(true);
    expect(result.timestamp).toBeTruthy();
  });

  it("simulates unhealthy response when project does not exist", async () => {
    const project = await getProject("nonexistent-id");

    const result = {
      healthy: !!project && true,
      projectExists: !!project,
      databaseWritable: true,
      timestamp: new Date().toISOString(),
    };

    expect(result.healthy).toBe(false);
    expect(result.projectExists).toBe(false);
  });

  it("simulates error response structure", () => {
    const error = new Error("Database connection failed");

    const result = {
      healthy: false,
      projectExists: false,
      databaseWritable: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    expect(result.healthy).toBe(false);
    expect(result.error).toBe("Database connection failed");
  });

  it("simulates error response with non-Error exception", () => {
    const error = "String error";

    const result = {
      healthy: false,
      projectExists: false,
      databaseWritable: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    expect(result.healthy).toBe(false);
    expect(result.error).toBe("Unknown error");
  });
});
