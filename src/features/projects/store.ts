import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import type { DBProject } from "@/lib/db/types";
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
  const stmt = db.prepare(
    `SELECT * FROM projects ORDER BY last_touched_at DESC`,
  );
  const rows = stmt.all() as DBProject[];

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    entryPath: row.entry_path,
    currentStep: row.current_step as Project["currentStep"],
    createdAt: row.created_at,
    lastTouchedAt: row.last_touched_at,
  }));
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
  const project = getProject(id);
  if (!project) throw new Error(`Project not found: ${id}`);

  const lastTouchedAt = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE projects
    SET status = ?, last_touched_at = ?
    WHERE id = ?
  `);
  stmt.run(status, lastTouchedAt, id);

  const updated = {
    ...project,
    status,
    lastTouchedAt,
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
  // During migration: check Map first (for updates not yet in DB), then DB
  const mapProject = store.get(id);
  if (mapProject) return mapProject;

  const stmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
  const row = stmt.get(id) as DBProject | undefined;

  if (!row) return undefined;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    entryPath: row.entry_path,
    currentStep: row.current_step as Project["currentStep"],
    createdAt: row.created_at,
    lastTouchedAt: row.last_touched_at,
  };
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
