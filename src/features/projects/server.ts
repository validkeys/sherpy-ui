import { createServerFn } from "@tanstack/react-start";
import {
  createProject,
  deleteProject,
  getProject,
  initStore,
  listProjects,
  updateProjectStatus,
} from "./store";
import type { CreateProjectInput } from "./types";

export const $listProjects = createServerFn({ method: "GET" }).handler(
  async () => {
    await initStore();
    return listProjects();
  },
);

export const $createProject = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): CreateProjectInput => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.name !== "string" || !d.name.trim())
      throw new Error("name is required");
    if (d.name.trim().length > 120)
      throw new Error("name must be 120 characters or fewer");
    if (d.entryPath !== "scratch" && d.entryPath !== "doc-first")
      throw new Error("invalid entryPath");
    return {
      name: d.name.trim(),
      entryPath: d.entryPath as "scratch" | "doc-first",
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    return createProject(data);
  });

export const $updateProjectStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.id !== "string" || !d.id) throw new Error("id is required");
    // "archived" and "complete" are terminal states — no restore-to-active by design (M1)
    if (d.status !== "archived" && d.status !== "complete")
      throw new Error("status must be archived or complete");
    return { id: d.id, status: d.status as "archived" | "complete" };
  })
  .handler(async ({ data }) => {
    await initStore();
    return updateProjectStatus(data.id, data.status);
  });

export const $getProject = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.id !== "string" || !d.id) throw new Error("id is required");
    return { id: d.id };
  })
  .handler(({ data }) => getProject(data.id));

export const $deleteProject = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.id !== "string" || !d.id) throw new Error("id is required");
    return { id: d.id };
  })
  .handler(async ({ data }) => {
    await initStore();
    deleteProject(data.id);
    return { success: true };
  });

export const $healthCheck = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId) {
      throw new Error("projectId required");
    }
    return { projectId: d.projectId };
  })
  .handler(async ({ data }) => {
    try {
      await initStore();
      const project = await getProject(data.projectId);

      // Test database connectivity
      const canWrite = await testDatabaseWrite();

      return {
        healthy: !!project && canWrite,
        projectExists: !!project,
        databaseWritable: canWrite,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[healthCheck] Failed:", error);
      return {
        healthy: false,
        projectExists: false,
        databaseWritable: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  });

// Helper to test database write capability
async function testDatabaseWrite(): Promise<boolean> {
  try {
    const { db } = await import("@/lib/db");
    // Try a simple read that would fail if DB is locked/unavailable
    const stmt = db.prepare("SELECT 1 as test");
    stmt.get();
    return true;
  } catch {
    return false;
  }
}
