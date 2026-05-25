/**
 * Repository for project planning state persistence
 *
 * This layer abstracts database operations from business logic,
 * providing a clean boundary between domain and data persistence.
 *
 * Design: Thin wrapper that delegates to existing server.db.ts functions.
 * Rationale: Allows swapping persistence implementation without touching domain/application layers.
 */

import {
  deletePlanningState as dbDeletePlanningState,
  getArtifact as dbGetArtifact,
  getArtifacts as dbGetArtifacts,
  getFormResponses as dbGetFormResponses,
  getInterviewAnswers as dbGetInterviewAnswers,
  hasPlanningState as dbHasPlanningState,
  loadPlanningState as dbLoadPlanningState,
  saveFormResponse as dbSaveFormResponse,
  saveInterviewAnswer as dbSaveInterviewAnswer,
  savePlanningState as dbSavePlanningState,
} from "../server.db";

/**
 * Save complete planning state for a project
 */
export async function savePlanningState(
  projectId: string,
  state: Record<string, unknown>,
): Promise<void> {
  await dbSavePlanningState(projectId, state);
}

/**
 * Load complete planning state for a project
 */
export async function loadPlanningState(
  projectId: string,
): Promise<Record<string, unknown> | null> {
  return await dbLoadPlanningState(projectId);
}

/**
 * Delete planning state for a project
 */
export async function deletePlanningState(projectId: string): Promise<void> {
  await dbDeletePlanningState(projectId);
}

/**
 * Check if planning state exists for a project
 */
export async function hasPlanningState(projectId: string): Promise<boolean> {
  return await dbHasPlanningState(projectId);
}

/**
 * Save a single interview answer
 */
export async function saveInterviewAnswer(
  projectId: string,
  stepNumber: 2 | 3,
  question: string,
  answer: string,
): Promise<void> {
  await dbSaveInterviewAnswer(projectId, stepNumber, question, answer);
}

/**
 * Load all interview answers for a project
 */
export async function getInterviewAnswers(
  projectId: string,
): Promise<Array<{ stepNumber: number; question: string; answer: string }>> {
  return await dbGetInterviewAnswers(projectId);
}

/**
 * Save a form response
 */
export async function saveFormResponse(
  projectId: string,
  stepNumber: number,
  questionId: string,
  response: string,
): Promise<void> {
  await dbSaveFormResponse(projectId, stepNumber, questionId, response);
}

/**
 * Load all form responses for a project step
 */
export async function getFormResponses(
  projectId: string,
  stepNumber: number,
): Promise<Array<{ questionId: string; response: string }>> {
  return await dbGetFormResponses(projectId, stepNumber);
}

/**
 * Get a single artifact by slug
 */
export async function getArtifact(
  projectId: string,
  slug: string,
): Promise<{ slug: string; content: string } | null> {
  return await dbGetArtifact(projectId, slug);
}

/**
 * Get all artifacts for a project
 */
export async function getArtifacts(
  projectId: string,
): Promise<Array<{ slug: string; content: string }>> {
  return await dbGetArtifacts(projectId);
}
