/**
 * Step Configuration System
 *
 * Single source of truth for all planning step metadata.
 *
 * Step Types:
 * - 'interview': Multi-turn Q&A with user (e.g., Business Requirements)
 * - 'automated': LLM processes and generates artifact without user questions (e.g., Gap Analysis)
 *
 * To add a new step:
 * 1. Add entry to STEP_CONFIG
 * 2. If interview: Add STEP_X_CONTENT to skills-content.ts
 * 3. Add artifact filename mapping to getArtifactName() in skills-content.ts
 * 4. If automated: Add processing logic to server.ts
 */

import type { z } from "zod";
import {
  INTERVIEW_QUESTION_SCHEMA,
  InterviewQuestionSchema,
} from "./response-schemas";

export type StepType = "automated" | "interview";

export interface StepConfig {
  name: string;
  type: StepType;
  artifactKey: string;
  responseSchema?: object; // JSON Schema (legacy — used by streaming.ts, remove in M5)
  zodSchema?: z.ZodSchema; // Zod schema for AI SDK structured output
}

export const STEP_CONFIG: Record<number, StepConfig> = {
  1: {
    name: "Gap Analysis Worksheet",
    type: "interview",
    artifactKey: "gap-analysis",
    responseSchema: INTERVIEW_QUESTION_SCHEMA,
    zodSchema: InterviewQuestionSchema,
  },
  2: {
    name: "Business Requirements Interview",
    type: "interview",
    artifactKey: "business-requirements",
    responseSchema: INTERVIEW_QUESTION_SCHEMA,
    zodSchema: InterviewQuestionSchema,
  },
  3: {
    name: "Technical Requirements Interview",
    type: "interview",
    artifactKey: "technical-requirements",
    responseSchema: INTERVIEW_QUESTION_SCHEMA,
    zodSchema: InterviewQuestionSchema,
  },
  4: {
    name: "Style Anchors Collection",
    type: "automated",
    artifactKey: "style-anchors",
  },
  5: {
    name: "Implementation Planner",
    type: "automated",
    artifactKey: "implementation-plan",
  },
  6: {
    name: "Implementation Plan Review",
    type: "automated",
    artifactKey: "plan-review",
  },
  7: {
    name: "Architecture Decision Records",
    type: "automated",
    artifactKey: "architecture-decisions",
  },
  8: {
    name: "Delivery Timeline",
    type: "automated",
    artifactKey: "delivery-timeline",
  },
  9: {
    name: "QA Test Plan",
    type: "automated",
    artifactKey: "qa-test-plan",
  },
  10: {
    name: "Generate Summaries",
    type: "automated",
    artifactKey: "summaries",
  },
};

// Helper functions
export function getStepConfig(stepNumber: number): StepConfig | undefined {
  return STEP_CONFIG[stepNumber];
}

export function getStepName(stepNumber: number): string {
  return STEP_CONFIG[stepNumber]?.name ?? `Step ${stepNumber}`;
}

export function getStepType(stepNumber: number): StepType | undefined {
  return STEP_CONFIG[stepNumber]?.type;
}

export function getStepArtifactKey(stepNumber: number): string {
  return STEP_CONFIG[stepNumber]?.artifactKey ?? "unknown";
}

export function getStepNumberFromArtifactKey(
  artifactKey: string,
): number | undefined {
  for (const [stepNum, config] of Object.entries(STEP_CONFIG)) {
    if (config.artifactKey === artifactKey) {
      return Number(stepNum);
    }
  }
  return undefined;
}

export function isInterviewStep(stepNumber: number): boolean {
  return STEP_CONFIG[stepNumber]?.type === "interview";
}

export function isAutomatedStep(stepNumber: number): boolean {
  return STEP_CONFIG[stepNumber]?.type === "automated";
}

export function getStepResponseSchema(stepNumber: number): object | undefined {
  return STEP_CONFIG[stepNumber]?.responseSchema;
}

export function getStepZodSchema(stepNumber: number): z.ZodSchema | undefined {
  return STEP_CONFIG[stepNumber]?.zodSchema;
}

// Validation - run at module load (development only)
// Skip validation in test environments or when NODE_ENV is production
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  const expectedSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const configuredSteps = Object.keys(STEP_CONFIG).map(Number);
  const missing = expectedSteps.filter((n) => !configuredSteps.includes(n));

  if (missing.length > 0) {
    console.warn(
      `[STEP_CONFIG] Missing configuration for steps: ${missing.join(", ")}`,
    );
  }
}
