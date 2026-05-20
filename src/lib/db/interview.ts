/**
 * Database operations for interview_answers table
 * Stores individual Q&A records from interview steps (2 and 3)
 */

import { nanoid } from "nanoid";
import { db } from "./index";
import type { DBInterviewAnswer } from "./types";

/**
 * Save a new interview answer to the database
 * @returns The ID of the created answer
 */
export function saveInterviewAnswer(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
): string {
  const id = nanoid();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO interview_answers (id, project_id, step_number, question, answer, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, projectId, stepNumber, question, answer, createdAt);

  return id;
}

/**
 * Get all interview answers for a specific project and step
 * Returns answers in chronological order (oldest first)
 */
export function getInterviewAnswers(
  projectId: string,
  stepNumber: 2 | 3,
): DBInterviewAnswer[] {
  const stmt = db.prepare<[string, number], DBInterviewAnswer>(`
    SELECT id, project_id, step_number, question, answer, created_at
    FROM interview_answers
    WHERE project_id = ? AND step_number = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(projectId, stepNumber);
}

/**
 * Delete all interview answers for a project
 * Automatically cascades when project is deleted due to FOREIGN KEY
 */
export function deleteInterviewAnswers(projectId: string): void {
  const stmt = db.prepare(`
    DELETE FROM interview_answers WHERE project_id = ?
  `);
  stmt.run(projectId);
}

/**
 * Clear all interview answers (for testing only)
 * @internal
 */
export function _clearInterviewAnswers(): void {
  db.prepare("DELETE FROM interview_answers").run();
}
