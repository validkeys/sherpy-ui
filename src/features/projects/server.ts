import { createServerFn } from "@tanstack/react-start";
import {
  createProject,
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
