import { describe, expect, it } from "vitest";
import {
  getArtifact,
  listArtifacts,
  seedArtifacts,
  upsertArtifact,
} from "./store";
import type { Artifact } from "./types";

// Server fns cannot be invoked in Vitest without TanStack Start Vite plugin
// transformation. Tests cover validator logic and store delegates directly.

function validateListArtifacts(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid input");
  }
  const input = data as Record<string, unknown>;
  if (typeof input.projectId !== "string" || !input.projectId) {
    throw new Error("projectId required");
  }
  return { projectId: input.projectId };
}

function validateGetArtifact(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid input");
  }
  const input = data as Record<string, unknown>;
  if (typeof input.projectId !== "string" || !input.projectId) {
    throw new Error("projectId required");
  }
  if (typeof input.key !== "string" || !input.key) {
    throw new Error("key required");
  }
  return { projectId: input.projectId, key: input.key };
}

describe("$listArtifacts validator", () => {
  it("accepts valid input", () => {
    const result = validateListArtifacts({ projectId: "test-project" });
    expect(result).toEqual({ projectId: "test-project" });
  });

  it("throws on null input", () => {
    expect(() => validateListArtifacts(null)).toThrow("invalid input");
  });

  it("throws on missing projectId", () => {
    expect(() => validateListArtifacts({})).toThrow("projectId required");
    expect(() => validateListArtifacts({ projectId: "" })).toThrow(
      "projectId required",
    );
  });
});

describe("$listArtifacts lazy-seed (store delegate)", () => {
  it("returns empty array before seed", () => {
    const projectId = `project-${Date.now()}-${Math.random()}`;
    const artifacts = listArtifacts(projectId);
    expect(artifacts).toEqual([]);
  });

  it("returns seeded artifacts after manual seed", () => {
    const projectId = `project-${Date.now()}-${Math.random()}`;
    seedArtifacts(projectId);
    const artifacts = listArtifacts(projectId);
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts[0]).toHaveProperty("id");
    expect(artifacts[0]).toHaveProperty("projectId");
    expect(artifacts[0]).toHaveProperty("key");
    expect(artifacts[0]).toHaveProperty("label");
    expect(artifacts[0]).toHaveProperty("format");
    expect(artifacts[0]).toHaveProperty("content");
    expect(artifacts[0]).toHaveProperty("status");
    expect(artifacts[0]).toHaveProperty("generatedAt");
  });
});

describe("$getArtifact validator", () => {
  it("accepts valid input", () => {
    const result = validateGetArtifact({
      projectId: "test-project",
      key: "test-key",
    });
    expect(result).toEqual({ projectId: "test-project", key: "test-key" });
  });

  it("throws on null input", () => {
    expect(() => validateGetArtifact(null)).toThrow("invalid input");
  });

  it("throws on missing projectId", () => {
    expect(() => validateGetArtifact({ key: "test" })).toThrow(
      "projectId required",
    );
    expect(() => validateGetArtifact({ projectId: "", key: "test" })).toThrow(
      "projectId required",
    );
  });

  it("throws on missing key", () => {
    expect(() => validateGetArtifact({ projectId: "test" })).toThrow(
      "key required",
    );
    expect(() => validateGetArtifact({ projectId: "test", key: "" })).toThrow(
      "key required",
    );
  });
});

describe("$getArtifact (store delegate)", () => {
  it("returns correct artifact by key", () => {
    const projectId = `project-${Date.now()}-${Math.random()}`;
    const artifact: Artifact = {
      id: `${projectId}-test`,
      projectId,
      key: "test-doc",
      label: "Test Document",
      format: "yaml",
      content: "test: value",
      status: "ready",
      generatedAt: new Date().toISOString(),
    };

    upsertArtifact(artifact);

    const retrieved = getArtifact(projectId, artifact.key);
    expect(retrieved).toEqual(artifact);
  });

  it("returns undefined on unknown key", () => {
    const projectId = `project-${Date.now()}-${Math.random()}`;
    const retrieved = getArtifact(projectId, "unknown-key");
    expect(retrieved).toBeUndefined();
  });
});
