import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import type { DBProject } from "@/lib/db/types";
import type { CreateProjectInput, Project } from "./types";

const counterRef = { value: 42 };
let lastTimestamp = "";

function initializeCounter(): void {
  const stmt = db.prepare(`
    SELECT code FROM projects
    WHERE code LIKE 'SHR-%'
    ORDER BY code DESC
    LIMIT 1
  `);
  const row = stmt.get() as { code: string } | undefined;

  if (row) {
    const match = row.code.match(/SHR-(\d+)/);
    if (match) {
      counterRef.value = parseInt(match[1], 10) + 1;
    }
  }
}

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

  return {
    ...project,
    status,
    lastTouchedAt,
  };
}

export function updateCurrentStep(id: string, step: number): Project {
  const project = getProject(id);
  if (!project) throw new Error(`Project not found: ${id}`);
  if (step <= 0) throw new Error(`Invalid step number: ${step}`);

  const lastTouchedAt = getNewTimestamp(project.lastTouchedAt);

  const stmt = db.prepare(`
    UPDATE projects
    SET current_step = ?, last_touched_at = ?
    WHERE id = ?
  `);
  stmt.run(step, lastTouchedAt, id);

  return {
    ...project,
    currentStep: step as Project["currentStep"],
    lastTouchedAt,
  };
}

export function getProject(id: string): Project | undefined {
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
  counterRef.value = 42;
  db.prepare("DELETE FROM projects").run();
}

let _storeInitialized = false;

export async function initStore(): Promise<void> {
  if (_storeInitialized) return;
  _storeInitialized = true;

  // Initialize counter from existing database records
  initializeCounter();

  if (process.env.SEED_DATA !== "false") {
    const { seedStore } = await import("./seed");
    seedStore(counterRef);
  }
}
