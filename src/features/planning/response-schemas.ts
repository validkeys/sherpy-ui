import { z } from "zod";
import type { StepOption } from "./types";

export const StepOptionSchema = z.object({
  letter: z
    .string()
    .regex(/^[A-Z]$/)
    .describe("Single uppercase letter identifier (A, B, C, or D)"),
  title: z.string().describe("Short title for the option (1-5 words)"),
  body: z.string().describe("Detailed explanation of what this option means"),
  recommended: z
    .boolean()
    .optional()
    .describe("Whether this option is the recommended choice"),
});

export const InterviewQuestionSchema = z.object({
  question: z
    .string()
    .describe("The interview question to present to the user"),
  options: z
    .array(StepOptionSchema)
    .min(2)
    .max(5)
    .describe("Multiple choice options (2-5 options)"),
  isComplete: z
    .boolean()
    .optional()
    .describe("Whether this is the last question in the interview"),
});

export const ArtifactResponseSchema = z.object({
  content: z.string().describe("The generated artifact content"),
  format: z
    .enum(["yaml", "markdown"])
    .describe("The format of the artifact content"),
});

export const RefinementResponseSchema = z.object({
  content: z
    .string()
    .describe("The refined artifact content incorporating user feedback"),
});

export const GapAnalysisAssessmentSchema = z.object({
  needsGapAnalysis: z
    .boolean()
    .describe("Whether gap analysis is needed based on project context"),
  reasoning: z
    .string()
    .describe("Explanation of why gap analysis is or isn't needed"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level in the assessment"),
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
