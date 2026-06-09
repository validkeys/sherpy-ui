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
 * JSON Schema for Interview Question responses from LLM.
 * Uses AWS Bedrock's response_format constraint to guarantee structured output.
 *
 * Schema follows JSON Schema Draft 2020-12 specification.
 * Properties MUST match StepOption interface exactly for backward compatibility.
 */
export const INTERVIEW_QUESTION_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  description:
    "Interview question with multiple-choice options for user selection. The question should be clear and focused, with options providing distinct choices.",
  properties: {
    question: {
      type: "string",
      description:
        "The question text to display to the user. MUST NOT include the options list - options are provided separately in the 'options' array. Keep this clean and focused on the question itself.",
    },
    options: {
      type: "array",
      description:
        "Array of multiple-choice options for the user to select from. Typically 2-4 options.",
      items: {
        type: "object",
        description: "A single option the user can select",
        properties: {
          letter: {
            type: "string",
            description:
              "Option identifier (e.g., 'A', 'B', 'C'). Used for user selection.",
            pattern: "^[A-Z]$",
          },
          title: {
            type: "string",
            description:
              "Short title for the option (1-5 words). Displayed prominently in the UI.",
          },
          body: {
            type: "string",
            description:
              "Detailed explanation of this option (1-3 sentences). Helps user understand implications.",
          },
          recommended: {
            type: "boolean",
            description:
              "Whether this option is recommended for the user. Only one option should be marked as recommended.",
          },
        },
        required: ["letter", "title", "body"],
        additionalProperties: false,
      },
      minItems: 2,
      maxItems: 5,
    },
    isComplete: {
      type: "boolean",
      description:
        "Whether this step is complete and no more questions are needed. When true, the step will transition to the next phase.",
    },
  },
  required: ["question", "options"],
  additionalProperties: false,
} as const;

/**
 * JSON Schema for Artifact Generation responses (YAML, Markdown).
 * Used for steps that generate structured output like business requirements.
 */
export const ARTIFACT_RESPONSE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  description: "Generated artifact content in YAML or Markdown format",
  properties: {
    content: {
      type: "string",
      description:
        "The generated artifact content (YAML or Markdown). Must be valid syntax for the specified format.",
    },
    format: {
      type: "string",
      enum: ["yaml", "markdown"],
      description: "The format of the generated content",
    },
  },
  required: ["content", "format"],
  additionalProperties: false,
} as const;

/**
 * JSON Schema for Refinement responses.
 * Used when iteratively improving existing artifacts based on user feedback.
 */
export const REFINEMENT_RESPONSE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  description: "Refined artifact content based on user feedback",
  properties: {
    content: {
      type: "string",
      description: "The refined artifact content with improvements applied",
    },
  },
  required: ["content"],
  additionalProperties: false,
} as const;

/**
 * TypeScript type for Interview Question responses.
 * Matches INTERVIEW_QUESTION_SCHEMA exactly.
 */
export type InterviewQuestionResponse = {
  question: string;
  options: StepOption[];
  isComplete?: boolean;
};

/**
 * TypeScript type for Artifact Generation responses.
 * Matches ARTIFACT_RESPONSE_SCHEMA exactly.
 */
export type ArtifactResponse = {
  content: string;
  format: "yaml" | "markdown";
};

/**
 * TypeScript type for Refinement responses.
 * Matches REFINEMENT_RESPONSE_SCHEMA exactly.
 */
export type RefinementResponse = {
  content: string;
};
