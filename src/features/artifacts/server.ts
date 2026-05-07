import { createServerFn } from "@tanstack/react-start";
import {
  getArtifact,
  listArtifacts,
  seedArtifacts,
  upsertArtifact,
} from "./store";

export const $listArtifacts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) {
      throw new Error("invalid input");
    }
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId) {
      throw new Error("projectId required");
    }
    return { projectId: input.projectId };
  })
  .handler(async ({ data }) => {
    // Lazy seed if empty (for demo projects created in M1 seed)
    if (listArtifacts(data.projectId).length === 0) {
      seedArtifacts(data.projectId);
    }
    return listArtifacts(data.projectId);
  });

export const $getArtifact = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) {
      throw new Error("invalid input");
    }
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId) {
      throw new Error("projectId required");
    }
    if (typeof input.key !== "string" || !input.key) {
      throw new Error("key required");
    }
    return { projectId: input.projectId, key: input.key };
  })
  .handler(async ({ data }) => {
    const artifact = getArtifact(data.projectId, data.key);
    if (!artifact) {
      throw new Error("Artifact not found");
    }
    return artifact;
  });

export const $updateArtifact = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (typeof d !== "object" || d === null) {
      throw new Error("invalid input");
    }
    const input = d as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !input.projectId) {
      throw new Error("projectId required");
    }
    if (typeof input.key !== "string" || !input.key) {
      throw new Error("key required");
    }
    if (typeof input.content !== "string") {
      throw new Error("content required");
    }
    return {
      projectId: input.projectId,
      key: input.key,
      content: input.content,
    };
  })
  .handler(async ({ data }) => {
    const existing = getArtifact(data.projectId, data.key);
    if (!existing) {
      throw new Error("Artifact not found");
    }
    const updated = { ...existing, content: data.content };
    upsertArtifact(updated);
    return updated;
  });
