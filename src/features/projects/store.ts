import { nanoid } from "nanoid";
import type { CreateProjectInput, Project } from "./types";

const store = new Map<string, Project>();
const counterRef = { value: 42 };

function nextCode(): string {
  return `SHR-${String(counterRef.value++).padStart(4, "0")}`;
}

export function listProjects(): Project[] {
  return Array.from(store.values()).sort((a, b) =>
    b.lastTouchedAt.localeCompare(a.lastTouchedAt),
  );
}

export function createProject(input: CreateProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: nanoid(8),
    code: nextCode(),
    name: input.name,
    status: "active",
    entryPath: input.entryPath,
    currentStep: 1,
    lastTouchedAt: now,
    createdAt: now,
  };
  store.set(project.id, project);
  return project;
}

export function updateProjectStatus(
  id: string,
  status: Project["status"],
): Project {
  const project = store.get(id);
  if (!project) throw new Error(`Project not found: ${id}`);
  const updated = {
    ...project,
    status,
    lastTouchedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}

export function getProject(id: string): Project | undefined {
  return store.get(id);
}

export function _resetStore(): void {
  store.clear();
  counterRef.value = 42;
}

// Seed demo data unless explicitly disabled
if (process.env.SEED_DATA !== "false") {
  const { seedStore } = await import("./seed");
  seedStore(store, counterRef);
}
