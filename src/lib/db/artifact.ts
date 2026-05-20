/**
 * Database operations for artifacts table
 * Stores generated documents from steps 1-10
 */

import { nanoid } from "nanoid";
import { db } from "./index";
import type { DBArtifact } from "./types";

/**
 * Save an artifact to the database (UPSERT pattern)
 * If an artifact with the same project_id and step_number exists,
 * it will be replaced due to UNIQUE constraint
 * @returns The ID of the created artifact
 */
export function saveArtifact(
  projectId: string,
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
  artifactType: "yaml" | "markdown",
  content: string,
): string {
  const id = nanoid();
  const generatedAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO artifacts (id, project_id, step_number, artifact_type, content, generated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, step_number)
    DO UPDATE SET
      id = excluded.id,
      artifact_type = excluded.artifact_type,
      content = excluded.content,
      generated_at = excluded.generated_at
  `);

  stmt.run(id, projectId, stepNumber, artifactType, content, generatedAt);

  return id;
}

/**
 * Get all artifacts for a specific project
 * Returns artifacts in step order (ascending)
 */
export function getArtifacts(projectId: string): DBArtifact[] {
  const stmt = db.prepare<[string], DBArtifact>(`
    SELECT id, project_id, step_number, artifact_type, content, generated_at
    FROM artifacts
    WHERE project_id = ?
    ORDER BY step_number ASC
  `);

  return stmt.all(projectId);
}

/**
 * Get a specific artifact by project and step
 * Returns null if not found
 */
export function getArtifact(
  projectId: string,
  stepNumber: number,
): DBArtifact | null {
  const stmt = db.prepare<[string, number], DBArtifact>(`
    SELECT id, project_id, step_number, artifact_type, content, generated_at
    FROM artifacts
    WHERE project_id = ? AND step_number = ?
  `);

  return stmt.get(projectId, stepNumber) ?? null;
}

/**
 * Delete all artifacts for a project
 * Automatically cascades when project is deleted due to FOREIGN KEY
 */
export function deleteArtifacts(projectId: string): void {
  const stmt = db.prepare(`
    DELETE FROM artifacts WHERE project_id = ?
  `);
  stmt.run(projectId);
}

/**
 * Clear all artifacts (for testing only)
 * @internal
 */
export function _clearArtifacts(): void {
  db.prepare("DELETE FROM artifacts").run();
}
