/**
 * Database operations for form_responses table
 * Stores form field values from steps 1, 5, and 7
 */

import { nanoid } from "nanoid";
import { db } from "./index";
import type { DBFormResponse } from "./types";

/**
 * Save a form response to the database (UPSERT pattern)
 * If a response with the same project_id, step_number, and field_name exists,
 * it will be replaced due to UNIQUE constraint
 * @returns The ID of the created response
 */
export function saveFormResponse(
  projectId: string,
  stepNumber: 1 | 5 | 7,
  fieldName: string,
  fieldValue: string,
): string {
  const id = nanoid();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO form_responses (id, project_id, step_number, field_name, field_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, step_number, field_name)
    DO UPDATE SET
      id = excluded.id,
      field_value = excluded.field_value,
      created_at = excluded.created_at
  `);

  stmt.run(id, projectId, stepNumber, fieldName, fieldValue, createdAt);

  return id;
}

/**
 * Get all form responses for a specific project and step
 * Returns responses in chronological order (oldest first)
 */
export function getFormResponses(
  projectId: string,
  stepNumber: 1 | 5 | 7,
): DBFormResponse[] {
  const stmt = db.prepare<[string, number], DBFormResponse>(`
    SELECT id, project_id, step_number, field_name, field_value, created_at
    FROM form_responses
    WHERE project_id = ? AND step_number = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(projectId, stepNumber);
}

/**
 * Delete all form responses for a project
 * Automatically cascades when project is deleted due to FOREIGN KEY
 */
export function deleteFormResponses(projectId: string): void {
  const stmt = db.prepare(`
    DELETE FROM form_responses WHERE project_id = ?
  `);
  stmt.run(projectId);
}

/**
 * Clear all form responses (for testing only)
 * @internal
 */
export function _clearFormResponses(): void {
  db.prepare("DELETE FROM form_responses").run();
}
