import { z } from "zod";
import type { StepOption } from "./types";

export const StepOptionSchema = z.object({
  letter: z.string().regex(/^[A-Z]$/),
  title: z.string(),
  body: z.string(),
  recommended: z.boolean().optional(),
});

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  options: z.array(StepOptionSchema).min(2).max(5),
  isComplete: z.boolean().optional(),
});

export const ArtifactResponseSchema = z.object({
  content: z.string(),
  format: z.enum(["yaml", "markdown"]),
});

export const RefinementResponseSchema = z.object({
  content: z.string(),
});

export const GapAnalysisAssessmentSchema = z.object({
  needsGapAnalysis: z.boolean(),
  reasoning: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

/**
 * TypeScript type for Interview Question responses.
 * Matches InterviewQuestionSchema exactly.
 */
export type InterviewQuestionResponse = {
  question: string;
  options: StepOption[];
  isComplete?: boolean;
};

/**
 * TypeScript type for Artifact Generation responses.
 * Matches ArtifactResponseSchema exactly.
 */
export type ArtifactResponse = {
  content: string;
  format: "yaml" | "markdown";
};

/**
 * TypeScript type for Refinement responses.
 * Matches RefinementResponseSchema exactly.
 */
export type RefinementResponse = {
  content: string;
};
