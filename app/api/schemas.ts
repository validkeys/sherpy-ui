import { z } from "zod";

/**
 * Reusable validation schemas for API endpoints
 *
 * These schemas provide:
 * - Runtime validation
 * - Automatic TypeScript type inference
 * - Descriptive error messages
 */

// ============================================================================
// Reusable Field Schemas
// ============================================================================

export const projectIdSchema = z
  .string()
  .min(1, "projectId is required and must not be empty");

export const stepNumberSchema = z
  .number()
  .int("step must be an integer")
  .min(1, "step must be at least 1")
  .max(10, "step must be between 1 and 10");

export const previousAnswersSchema = z.array(z.string());

// ============================================================================
// Endpoint-Specific Schemas
// ============================================================================

/**
 * Schema for PATCH /api/projects/[id]
 * Updates current step for a project
 */
export const updateCurrentStepSchema = z.object({
  currentStep: z.number().int("currentStep must be an integer"),
});

/**
 * Schema for POST /api/ai/interview
 * Requests AI-generated interview questions
 */
export const interviewRequestSchema = z.object({
  projectId: projectIdSchema,
  stepNumber: z.number().int("stepNumber must be an integer"),
  previousAnswers: previousAnswersSchema,
  projectContext: z.string().optional(),
});

/**
 * Schema for POST /api/dev/seed (DEVELOPMENT ONLY)
 * Seeds test data for E2E testing
 */
export const seedRequestSchema = z.object({
  step: stepNumberSchema,
  projectName: z.string().optional(),
  overrides: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for POST /api/dev/snapshot/capture (DEVELOPMENT ONLY)
 * Captures XState snapshots during manual testing
 */
export const snapshotCaptureSchema = z.object({
  projectId: projectIdSchema,
  step: stepNumberSchema,
  label: z.string().min(1, "label is required and must not be empty"),
  context: z.record(z.string(), z.unknown()),
});

// ============================================================================
// Type Exports (for TypeScript consumers)
// ============================================================================

export type UpdateCurrentStepInput = z.infer<typeof updateCurrentStepSchema>;
export type InterviewRequestInput = z.infer<typeof interviewRequestSchema>;
export type SeedRequestInput = z.infer<typeof seedRequestSchema>;
export type SnapshotCaptureInput = z.infer<typeof snapshotCaptureSchema>;
