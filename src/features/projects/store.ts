import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import type { CreateProjectInput, Project } from "./types";

const store = new Map<string, Project>();
const counterRef = { value: 42 };
let lastTimestamp = "";

function nextCode(): string {
  return `SHR-${String(counterRef.value++).padStart(4, "0")}`;
}

function getNewTimestamp(previousTimestamp?: string): string {
  let timestamp = new Date().toISOString();
  if (previousTimestamp && timestamp <= previousTimestamp) {
    const date = new Date(previousTimestamp);
    date.setMilliseconds(date.getMilliseconds() + 1);
    timestamp = date.toISOString();
  }
  lastTimestamp = timestamp;
  return timestamp;
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

  const stmt = db.prepare(`
    INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    project.id,
    project.code,
    project.name,
    project.status,
    project.entryPath,
    project.currentStep,
    project.createdAt,
    project.lastTouchedAt,
  );

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

export function updateCurrentStep(id: string, step: number): Project {
  const project = store.get(id);
  if (!project) throw new Error(`Project not found: ${id}`);
  if (step <= 0) throw new Error(`Invalid step number: ${step}`);
  const updated = {
    ...project,
    currentStep: step as Project["currentStep"],
    lastTouchedAt: getNewTimestamp(project.lastTouchedAt),
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
  db.prepare("DELETE FROM projects").run();
}

// TODO(M2): replace with persistent store — this Map is process-local.
// Vercel spawns multiple function instances; each has its own Map.
// Writes on one instance are invisible to others.
let _storeInitialized = false;

export async function initStore(): Promise<void> {
  if (_storeInitialized) return;
  _storeInitialized = true;
  if (process.env.SEED_DATA !== "false") {
    const { seedStore } = await import("./seed");
    seedStore(store, counterRef);
  }
}
