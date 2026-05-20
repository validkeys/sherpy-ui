import { db } from "@/lib/db";
import type { Project } from "./types";

const SEED_PROJECTS: Omit<Project, "id">[] = [
  {
    code: "SHR-0001",
    name: "sherpy-web",
    status: "active",
    entryPath: "scratch",
    currentStep: 4,
    lastTouchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    code: "SHR-0002",
    name: "billing-platform",
    status: "active",
    entryPath: "doc-first",
    currentStep: 2,
    lastTouchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    code: "SHR-0003",
    name: "mobile-v3",
    status: "archived",
    entryPath: "scratch",
    currentStep: 7,
    lastTouchedAt: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    code: "SHR-0004",
    name: "design-tokens",
    status: "complete",
    entryPath: "doc-first",
    currentStep: 10,
    lastTouchedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function seedStore(counterRef: { value: number }): void {
  const stmt = db.prepare(`
    INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [index, seed] of SEED_PROJECTS.entries()) {
    const id = `seed-000${index + 1}`;
    stmt.run(
      id,
      seed.code,
      seed.name,
      seed.status,
      seed.entryPath,
      seed.currentStep,
      seed.createdAt,
      seed.lastTouchedAt,
    );
  }
  // Advance counter past seed codes (SHR-0001 through SHR-0004)
  counterRef.value = Math.max(counterRef.value, 5);
}
