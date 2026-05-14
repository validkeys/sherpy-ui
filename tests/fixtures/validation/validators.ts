/**
 * Validation helper functions for test fixtures
 * Wraps Zod schemas with convenient validation utilities
 */

import type {
  Artifact,
  InterviewAnswer,
  PlanningContext,
} from "../../../src/features/planning/machines/types";
import {
  ArtifactSchema,
  InterviewAnswerSchema,
  PartialPlanningContextSchema,
  PlanningContextSchema,
  Step1ResponsesSchema,
  Step5ResponsesSchema,
} from "./schemas";

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Validates Step 1 responses
 */
export function validateStep1Responses(
  data: unknown,
): ValidationResult<Record<string, string>> {
  const result = Step1ResponsesSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Validates interview answer
 */
export function validateInterviewAnswer(
  data: unknown,
): ValidationResult<InterviewAnswer> {
  const result = InterviewAnswerSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Validates array of interview answers
 */
export function validateInterviewAnswers(
  data: unknown,
): ValidationResult<InterviewAnswer[]> {
  if (!Array.isArray(data)) {
    return { success: false, errors: ["Data must be an array"] };
  }

  const errors: string[] = [];
  const validAnswers: InterviewAnswer[] = [];

  data.forEach((item, index) => {
    const result = validateInterviewAnswer(item);
    if (result.success) {
      validAnswers.push(result.data);
    } else {
      errors.push(`Answer ${index}: ${result.errors.join(", ")}`);
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: validAnswers };
}

/**
 * Validates Step 5 responses
 */
export function validateStep5Responses(
  data: unknown,
): ValidationResult<Record<string, string>> {
  const result = Step5ResponsesSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Validates artifact structure
 */
export function validateArtifact(data: unknown): ValidationResult<Artifact> {
  const result = ArtifactSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Validates complete PlanningContext
 */
export function validatePlanningContext(
  data: unknown,
): ValidationResult<PlanningContext> {
  const result = PlanningContextSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Validates partial PlanningContext (for intermediate builder states)
 */
export function validatePartialPlanningContext(
  data: unknown,
): ValidationResult<Partial<PlanningContext>> {
  const result = PartialPlanningContextSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map(
      (err) => `${err.path.join(".")}: ${err.message}`,
    ),
  };
}

/**
 * Asserts that data is valid, throws on failure
 */
export function assertValidPlanningContext(
  data: unknown,
): asserts data is PlanningContext {
  const result = validatePlanningContext(data);

  if (!result.success) {
    throw new Error(`Invalid PlanningContext:\n${result.errors.join("\n")}`);
  }
}

/**
 * Asserts that data is valid interview answer, throws on failure
 */
export function assertValidInterviewAnswer(
  data: unknown,
): asserts data is InterviewAnswer {
  const result = validateInterviewAnswer(data);

  if (!result.success) {
    throw new Error(`Invalid InterviewAnswer:\n${result.errors.join("\n")}`);
  }
}

/**
 * Asserts that data is valid artifact, throws on failure
 */
export function assertValidArtifact(data: unknown): asserts data is Artifact {
  const result = validateArtifact(data);

  if (!result.success) {
    throw new Error(`Invalid Artifact:\n${result.errors.join("\n")}`);
  }
}
