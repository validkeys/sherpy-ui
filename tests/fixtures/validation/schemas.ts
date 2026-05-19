/**
 * Zod validation schemas for PlanningContext
 * Provides runtime validation for test fixture data
 */

import { z } from "zod";

/**
 * Schema for Step 1 responses (Gap Analysis form)
 */
export const Step1ResponsesSchema = z.object({
  existingRequirements: z
    .string()
    .min(1, "Existing requirements cannot be empty"),
  projectDescription: z.string().min(1, "Project description cannot be empty"),
});

/**
 * Schema for interview answers (Steps 2, 3)
 */
export const InterviewAnswerSchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
  value: z.string().min(1, "Answer value cannot be empty"),
  timestamp: z.string().datetime("Timestamp must be valid ISO 8601 datetime"),
});

/**
 * Schema for Step 5 responses (Implementation Planner form)
 */
export const Step5ResponsesSchema = z.object({
  deploymentStrategy: z.string().min(1, "Deployment strategy cannot be empty"),
  techStack: z.string().min(1, "Tech stack cannot be empty"),
});

/**
 * Schema for artifact structure
 */
export const ArtifactSchema = z.object({
  type: z.enum(["yaml", "markdown"], {
    errorMap: () => ({ message: 'Artifact type must be "yaml" or "markdown"' }),
  }),
  content: z.string().min(1, "Artifact content cannot be empty"),
  generatedAt: z
    .string()
    .datetime("Generated timestamp must be valid ISO 8601 datetime"),
});

/**
 * Schema for artifacts map (indexed by step number)
 */
export const StepArtifactMapSchema = z.record(
  z.coerce.number().int().min(1).max(10),
  ArtifactSchema.optional(),
);

/**
 * Schema for entry path
 */
export const EntryPathSchema = z.enum(["new-project", "existing-project"], {
  errorMap: () => ({
    message: 'Entry path must be "new-project" or "existing-project"',
  }),
});

/**
 * Schema for completed steps array
 */
export const CompletedStepsSchema = z
  .array(z.number().int().min(1).max(10))
  .refine((steps) => {
    const sorted = [...steps].sort((a, b) => a - b);
    return JSON.stringify(steps) === JSON.stringify(sorted);
  }, "Completed steps must be sorted in ascending order")
  .refine((steps) => {
    const unique = new Set(steps);
    return unique.size === steps.length;
  }, "Completed steps must not contain duplicates");

/**
 * Full PlanningContext validation schema
 */
export const PlanningContextSchema = z.object({
  projectId: z.string().min(1, "Project ID cannot be empty"),
  entryPath: EntryPathSchema,
  startedAt: z
    .string()
    .datetime("Started timestamp must be valid ISO 8601 datetime"),
  updatedAt: z
    .string()
    .datetime("Updated timestamp must be valid ISO 8601 datetime"),

  step1Responses: z.record(z.string(), z.string()),

  step2Answers: z.array(InterviewAnswerSchema),
  step2CurrentQuestion: z.string().nullable(),
  step2CurrentOptions: z.array(z.string()).nullable(),

  step3Answers: z.array(InterviewAnswerSchema),
  step3CurrentQuestion: z.string().nullable(),
  step3CurrentOptions: z.array(z.string()).nullable(),

  step5Responses: z.record(z.string(), z.string()),

  step7Edits: z.string().nullable(),

  artifacts: StepArtifactMapSchema,

  completedSteps: CompletedStepsSchema,
  currentStepNumber: z
    .number()
    .int()
    .min(1)
    .max(10, "Step number must be between 1 and 10"),

  error: z.string().nullable(),
});

/**
 * Partial context schema for building intermediate states
 */
export const PartialPlanningContextSchema = PlanningContextSchema.partial();

/**
 * Type inference helpers
 */
export type ValidatedStep1Responses = z.infer<typeof Step1ResponsesSchema>;
export type ValidatedInterviewAnswer = z.infer<typeof InterviewAnswerSchema>;
export type ValidatedStep5Responses = z.infer<typeof Step5ResponsesSchema>;
export type ValidatedArtifact = z.infer<typeof ArtifactSchema>;
export type ValidatedPlanningContext = z.infer<typeof PlanningContextSchema>;
