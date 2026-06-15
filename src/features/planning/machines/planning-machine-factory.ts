/**
 * Planning Machine Factory with Dependency Injection
 *
 * Creates planning machine with injected server functions instead of dynamic imports.
 * Benefits:
 * - Zero runtime import latency (functions pre-resolved)
 * - Compile-time type checking (no async import boundaries)
 * - Easier testing (inject mocks at machine creation)
 * - Better tree-shaking (static imports)
 */

import { assign, fromPromise, setup } from "xstate";
import {
  $completeStep,
  $setStepArtifact,
  $submitAnswer,
} from "../infrastructure/server-functions";
import { EVENT_TYPES, STEP_KEYS, STEP_STATES } from "./constants";
import type {
  Artifact,
  PlanningContext,
  PlanningEvent,
  PlanningInput,
} from "./types";

// ─────────────────────────────────────────────────────────────
// SERVER FUNCTION TYPES
// ─────────────────────────────────────────────────────────────

/**
 * Type-safe interface for injected server functions.
 * Allows testing with mocks while ensuring type safety.
 */
export type ServerFunctions = {
  $generateQuestion: (params: {
    data: {
      projectId: string;
      stepNumber: number;
      previousAnswers: string[];
      projectContext?: string;
    };
  }) => Promise<{ question: string; options?: string[] }>;

  $assessGapAnalysisNeed: (params: {
    data: {
      projectId: string;
      projectDescription: string;
      hasExistingRequirements: string;
    };
  }) => Promise<{
    needsGapAnalysis: boolean;
    reasoning: string;
    confidence: "high" | "medium" | "low";
  }>;

  $generateArtifact: (params: {
    data: {
      projectId: string;
      stepNumber: number;
      answers: string[];
    };
  }) => Promise<{
    format: "yaml" | "markdown";
    content: string;
    generatedAt: string;
  }>;

  parseOptions: (text: string) => Array<{ title: string }>;
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function buildProjectContext(ctx: PlanningContext): string {
  const parts: string[] = [];

  // Step 1: Gap Analysis responses
  if (ctx.step1Responses.projectDescription) {
    parts.push(`Project: ${ctx.step1Responses.projectDescription}`);
  }
  if (ctx.step1Responses.existingRequirements) {
    parts.push(
      `Has existing requirements: ${ctx.step1Responses.existingRequirements}`,
    );
  }

  // Step 2: Business Requirements
  if (ctx.step2Answers.length > 0) {
    parts.push("Business Requirements:");
    for (const a of ctx.step2Answers) {
      parts.push(`  Q: ${a.question}\n  A: ${a.value}`);
    }
  }

  // Step 3: Technical Requirements
  if (ctx.step3Answers.length > 0) {
    parts.push("Technical Requirements:");
    for (const a of ctx.step3Answers) {
      parts.push(`  Q: ${a.question}\n  A: ${a.value}`);
    }
  }

  return parts.join("\n\n");
}

function isStepComplete(context: PlanningContext, stepNumber: number): boolean {
  return context.completedSteps.includes(stepNumber);
}

// ─────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Creates a planning machine with injected dependencies.
 *
 * @param serverFunctions - Server functions injected for actors
 * @returns Configured XState machine ready for createActor()
 *
 * @example
 * ```typescript
 * import { createPlanningMachine } from './planning-machine-factory';
 * import { $generateQuestion, $assessGapAnalysisNeed, $generateArtifact } from '../../ai/server';
 * import { parseOptions } from '../../ai/parse-options';
 *
 * const machine = createPlanningMachine({
 *   $generateQuestion,
 *   $assessGapAnalysisNeed,
 *   $generateArtifact,
 *   parseOptions,
 * });
 *
 * const actor = createActor(machine, { input: { projectId: '123', entryPath: 'new-project' } });
 * actor.start();
 * ```
 */
export function createPlanningMachine(serverFunctions: ServerFunctions) {
  // ─────────────────────────────────────────────────────────────
  // ACTORS (using injected functions)
  // ─────────────────────────────────────────────────────────────

  const fetchQuestion = fromPromise<
    { question: string; options?: string[] },
    {
      projectId: string;
      stepNumber: number;
      previousAnswers: string[];
      projectContext: string;
    }
  >(async ({ input }) => {
    console.log("[fetchQuestion] Input:", {
      projectId: input.projectId,
      stepNumber: input.stepNumber,
      previousAnswersCount: input.previousAnswers.length,
    });

    try {
      // Use injected function instead of dynamic import
      console.log("[fetchQuestion] Calling $generateQuestion...");
      const result = await serverFunctions.$generateQuestion({
        data: {
          projectId: input.projectId,
          stepNumber: input.stepNumber,
          previousAnswers: input.previousAnswers,
          projectContext: input.projectContext,
        },
      });

      console.log("[fetchQuestion] ✅ Success:", {
        hasQuestion: !!result.question,
        questionLength: result.question?.length ?? 0,
      });

      // Validate question is non-empty
      if (!result.question || result.question.trim().length === 0) {
        throw new Error("Server returned empty question");
      }

      // Structured output provides options directly from the server function.
      // Fall back to parsing markdown options from the question text.
      if (result.options && result.options.length > 0) {
        return {
          question: result.question,
          options: result.options,
        };
      }

      // Use injected parseOptions function
      const parsedOptions = serverFunctions.parseOptions(result.question);

      return {
        question: result.question,
        options:
          parsedOptions.length > 0
            ? parsedOptions.map((opt) => opt.title)
            : undefined,
      };
    } catch (error) {
      console.error("[fetchQuestion] ❌ Error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  const assessGapAnalysisNeed = fromPromise<
    {
      needsGapAnalysis: boolean;
      reasoning: string;
      confidence: "high" | "medium" | "low";
    },
    {
      projectId: string;
      projectDescription: string;
      hasExistingRequirements: string;
    }
  >(async ({ input }) => {
    console.log("[assessGapAnalysisNeed] Starting assessment:", {
      projectId: input.projectId,
      projectDescription: input.projectDescription.substring(0, 50),
      hasExistingRequirements: input.hasExistingRequirements,
    });

    try {
      // Use injected function instead of dynamic import
      console.log("[assessGapAnalysisNeed] Calling $assessGapAnalysisNeed...");
      const result = await serverFunctions.$assessGapAnalysisNeed({
        data: {
          projectId: input.projectId,
          projectDescription: input.projectDescription,
          hasExistingRequirements: input.hasExistingRequirements,
        },
      });

      console.log("[assessGapAnalysisNeed] ✅ Success:", result);

      return result;
    } catch (error) {
      console.error("[assessGapAnalysisNeed] ❌ Error:", error);
      throw error;
    }
  });

  const generateArtifact = fromPromise<
    Artifact,
    {
      projectId: string;
      stepNumber: number;
      accumulatedContext: Record<string, unknown>;
    }
  >(async ({ input }) => {
    console.log("[generateArtifact] Starting with input:", input);

    // Extract answers from accumulated context
    const answers: string[] = [];

    // Collect answers from step-specific context
    if (input.stepNumber === 1 && input.accumulatedContext.step1Responses) {
      const responses = input.accumulatedContext.step1Responses as Record<
        string,
        string
      >;
      answers.push(...Object.values(responses));
    } else if (
      input.stepNumber === 2 &&
      input.accumulatedContext.step2Answers
    ) {
      const stepAnswers = input.accumulatedContext.step2Answers as Array<{
        value: string;
      }>;
      answers.push(...stepAnswers.map((a) => a.value));
    } else if (
      input.stepNumber === 3 &&
      input.accumulatedContext.step3Answers
    ) {
      const stepAnswers = input.accumulatedContext.step3Answers as Array<{
        value: string;
      }>;
      answers.push(...stepAnswers.map((a) => a.value));
    } else if (
      input.stepNumber === 5 &&
      input.accumulatedContext.step5Responses
    ) {
      const responses = input.accumulatedContext.step5Responses as Record<
        string,
        string
      >;
      answers.push(...Object.values(responses));
    }

    console.log("[generateArtifact] Extracted answers:", answers);

    try {
      // Use injected function instead of dynamic import
      console.log("[generateArtifact] Calling $generateArtifact...");
      const artifact = await serverFunctions.$generateArtifact({
        data: {
          projectId: input.projectId,
          stepNumber: input.stepNumber,
          answers,
        },
      });

      console.log("[generateArtifact] ✅ Success! Got artifact:", artifact);

      // Convert server Artifact type to machine Artifact type
      return {
        type: artifact.format === "markdown" ? "markdown" : "yaml",
        content: artifact.content,
        generatedAt: artifact.generatedAt,
      };
    } catch (error) {
      console.error("[generateArtifact] ❌ Error:", error);
      throw error;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // MACHINE SETUP
  // ─────────────────────────────────────────────────────────────

  // M5: Step name mapping for navigation transitions
  // NOTE: Steps 4-10 use placeholder names until BUG-029 Phase 7 updates them to match constants
  const STEP_NAMES: Record<number, string> = {
    1: STEP_KEYS.STEP_1_GAP_ANALYSIS,
    2: STEP_KEYS.STEP_2_BUSINESS_REQS,
    3: STEP_KEYS.STEP_3_TECH_REQS,
    4: "step4_architecture", // TODO: Update to STEP_KEYS.STEP_4_STYLE_ANCHORS
    5: "step5_dataModeling", // TODO: Update to STEP_KEYS.STEP_5_IMPL_PLANNER
    6: "step6_testing", // TODO: Update to STEP_KEYS.STEP_6_DEFINITION_OF_DONE
    7: "step7_refinement", // TODO: Update to STEP_KEYS.STEP_7_ARCH_DECISIONS
    8: "step8_documentation", // TODO: Update to STEP_KEYS.STEP_8_DELIVERY_TIMELINE
    9: "step9_deployment", // TODO: Update to STEP_KEYS.STEP_9_QA_TEST_PLAN
    10: "step10_monitoring", // TODO: Update to STEP_KEYS.STEP_10_SUMMARIES
  };

  return setup({
    types: {
      context: {} as PlanningContext,
      events: {} as PlanningEvent,
      input: {} as PlanningInput,
    },
    actors: {
      fetchQuestion,
      assessGapAnalysisNeed,
      generateArtifact,
      // Wrapper actors for server functions (no repository imports)
      persistAnswerService: fromPromise(
        async ({
          input,
        }: {
          input: {
            projectId: string;
            stepNumber: number;
            question: string;
            answer: string;
          };
        }) => {
          const result = await $submitAnswer({ data: input });
          return result;
        },
      ),
      persistArtifactService: fromPromise(
        async ({
          input,
        }: {
          input: {
            projectId: string;
            stepNumber: number;
            artifactKey: string;
            artifact: string;
          };
        }) => {
          const result = await $setStepArtifact({ data: input });
          return result;
        },
      ),
      completeStepService: fromPromise(
        async ({
          input,
        }: {
          input: { projectId: string; stepNumber: number };
        }) => {
          const result = await $completeStep({ data: input });
          return result;
        },
      ),
    },
    guards: {},
    actions: {
      clearError: assign({ error: null }),
      setError: assign({
        error: (_, params: { message: string }) => params.message,
      }),
    },
  }).createMachine({
    id: "planning",
    initial: STEP_KEYS.STEP_1_GAP_ANALYSIS,
    context: ({ input }: { input: PlanningInput }) => ({
      projectId: input.projectId,
      entryPath: input.entryPath,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      step1Responses: {},
      step1GapAnalysisNeeded: null,
      step1GapAnalysisReasoning: null,
      step2Answers: [],
      step2CurrentQuestion: null,
      step2CurrentOptions: null,
      step3Answers: [],
      step3CurrentQuestion: null,
      step3CurrentOptions: null,
      step5Responses: {},
      step7Edits: null,
      artifacts: {},
      completedSteps: [],
      currentStepNumber: 1,
      error: null,
    }),

    on: {
      // Global navigation handlers - programmatically generated transitions
      // M5: Reduced from 85 lines to 21 lines by generating transitions in loops
      [EVENT_TYPES.NEXT]: Array.from({ length: 9 }, (_, i) => {
        const currentStep = i + 1;
        const nextStep = i + 2;
        return {
          guard: ({ context }) =>
            context.currentStepNumber === currentStep &&
            isStepComplete(context, currentStep),
          target: `.${STEP_NAMES[nextStep]}`,
        };
      }),
      [EVENT_TYPES.BACK]: Array.from({ length: 9 }, (_, i) => {
        const currentStep = i + 2; // Steps 2-10
        const previousStep = i + 1; // Steps 1-9
        return {
          guard: ({ context }) => context.currentStepNumber === currentStep,
          target: `.${STEP_NAMES[previousStep]}`,
        };
      }),

      [EVENT_TYPES.RESTORE_SNAPSHOT]: {
        actions: assign(({ event }) => {
          // XState's type system narrows the event type based on the handler key
          if (event.type === EVENT_TYPES.RESTORE_SNAPSHOT) {
            return event.snapshot.context;
          }
          return {};
        }),
      },
    },

    states: {
      // ───────────────────────────────────────────────────────
      // STEP 1: Gap Analysis
      // ───────────────────────────────────────────────────────
      [STEP_KEYS.STEP_1_GAP_ANALYSIS]: {
        initial: STEP_STATES.STEP_1.COLLECTING_INFO,
        entry: assign({
          currentStepNumber: 1,
          updatedAt: () => new Date().toISOString(),
        }),

        states: {
          [STEP_STATES.STEP_1.COLLECTING_INFO]: {
            on: {
              [EVENT_TYPES.UPDATE_FORM_FIELD]: {
                actions: assign({
                  step1Responses: ({ context, event }) => {
                    if (event.stepNumber !== 1) return context.step1Responses;
                    return {
                      ...context.step1Responses,
                      [event.fieldId]: event.value,
                    };
                  },
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              [EVENT_TYPES.SUBMIT_FORM]: {
                target: STEP_STATES.STEP_1.ASSESSING_NEED,
                actions: assign({
                  step1Responses: ({ event }) => event.responses,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
            },
          },

          [STEP_STATES.STEP_1.ASSESSING_NEED]: {
            invoke: {
              src: "assessGapAnalysisNeed",
              input: ({ context }) => ({
                projectId: context.projectId,
                projectDescription:
                  context.step1Responses.projectDescription || "",
                hasExistingRequirements:
                  context.step1Responses.existingRequirements || "",
              }),
              onDone: {
                // BUG-030 FIX: Always generate artifact after assessment
                target: STEP_STATES.STEP_1.SUBMITTING,
                actions: assign({
                  step1GapAnalysisNeeded: ({ event }) =>
                    event.output?.needsGapAnalysis ?? null,
                  step1GapAnalysisReasoning: ({ event }) =>
                    event.output?.reasoning ?? null,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                // On error, still generate artifact with fallback reasoning
                target: STEP_STATES.STEP_1.SUBMITTING,
                actions: assign({
                  step1GapAnalysisNeeded: false,
                  step1GapAnalysisReasoning:
                    "Assessment failed, proceeding with artifact generation",
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to assess gap analysis need",
                }),
              },
            },
          },

          [STEP_STATES.STEP_1.SUBMITTING]: {
            invoke: {
              src: "generateArtifact",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 1,
                accumulatedContext: {
                  step1Responses: context.step1Responses,
                },
              }),
              onDone: {
                // Transition to persisting state to use workflow service
                target: "persistingArtifact",
                actions: assign({
                  // Store generated artifact temporarily for persistence
                  _tempArtifact: ({ event }) => event.output,
                }),
              },
              onError: {
                target: STEP_STATES.STEP_1.COLLECTING_INFO,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to generate gap analysis artifact",
                }),
              },
            },
          },

          // New state: Persist artifact via workflow service
          persistingArtifact: {
            invoke: {
              src: "persistArtifactService",
              input: ({ context }) => {
                if (!context._tempArtifact) {
                  throw new Error("No artifact to persist");
                }
                return {
                  projectId: context.projectId,
                  stepNumber: 1,
                  artifactKey: "gap-analysis",
                  artifact: context._tempArtifact.content,
                };
              },
              onDone: {
                target: "completingStep",
                actions: assign({
                  // Keep generated artifact (machine context uses Artifact object)
                  artifacts: ({ context }) => ({
                    ...context.artifacts,
                    1: context._tempArtifact!,
                  }),
                  _tempArtifact: undefined,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.STEP_1.COLLECTING_INFO,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to persist gap analysis artifact",
                  _tempArtifact: undefined,
                }),
              },
            },
          },

          // New state: Complete step via workflow service
          completingStep: {
            invoke: {
              src: "completeStepService",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 1,
              }),
              onDone: {
                target: STEP_STATES.STEP_1.COMPLETE,
                actions: assign({
                  // Extract completion status from persisted state
                  completedSteps: ({ event }) =>
                    event.output?.steps
                      ?.filter((s) => s.status === "complete")
                      .map((s) => s.stepNumber) ?? [],
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.STEP_1.COLLECTING_INFO,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to complete step",
                }),
              },
            },
          },

          [STEP_STATES.STEP_1.COMPLETE]: {
            type: "final",
          },
        },
      },

      // ───────────────────────────────────────────────────────
      // STEP 2: Business Requirements (Interview)
      // ───────────────────────────────────────────────────────
      [STEP_KEYS.STEP_2_BUSINESS_REQS]: {
        initial: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
        entry: assign({
          currentStepNumber: 2,
          updatedAt: () => new Date().toISOString(),
        }),

        states: {
          [STEP_STATES.INTERVIEW.FETCHING_QUESTION]: {
            invoke: {
              src: "fetchQuestion",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 2,
                previousAnswers: context.step2Answers.map((a) => a.value),
                projectContext: buildProjectContext(context),
              }),
              onDone: {
                target: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
                actions: assign({
                  step2CurrentQuestion: ({ event }) =>
                    event.output?.question ?? null,
                  step2CurrentOptions: ({ event }) =>
                    event.output?.options ?? null,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to fetch question",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.AWAITING_ANSWER]: {
            on: {
              [EVENT_TYPES.SUBMIT_ANSWER]: {
                target: "persistingAnswer",
              },
              FINISH_INTERVIEW: {
                target: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
              },
            },
          },

          // New state: Persist answer via workflow service
          persistingAnswer: {
            invoke: {
              src: "persistAnswerService",
              input: ({ context, event }) => {
                // Guard: only process SUBMIT_ANSWER events
                if (event.type !== EVENT_TYPES.SUBMIT_ANSWER) {
                  throw new Error(`Expected SUBMIT_ANSWER, got ${event.type}`);
                }
                return {
                  projectId: context.projectId,
                  stepNumber: 2,
                  question: event.question,
                  answer: event.answer,
                };
              },
              onDone: {
                target: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
                actions: assign({
                  // Extract step2 answers from persisted state
                  step2Answers: ({ event }) =>
                    event.output?.steps?.[1]?.answers ?? [],
                  step2CurrentQuestion: null,
                  step2CurrentOptions: null,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to persist answer",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.GENERATING_ARTIFACT]: {
            invoke: {
              src: "generateArtifact",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 2,
                accumulatedContext: {
                  step2Answers: context.step2Answers,
                },
              }),
              onDone: {
                target: STEP_STATES.INTERVIEW.COMPLETE,
                actions: assign({
                  artifacts: ({ context, event }) => ({
                    ...context.artifacts,
                    businessRequirements: event.output,
                  }),
                  completedSteps: ({ context }) => [
                    ...context.completedSteps,
                    2,
                  ],
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to generate artifact",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.ERROR]: {
            on: {
              RETRY: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
            },
          },

          [STEP_STATES.INTERVIEW.COMPLETE]: {
            type: "final",
          },
        },
      },

      // ───────────────────────────────────────────────────────
      // STEP 3: Technical Requirements (Interview)
      // ───────────────────────────────────────────────────────
      [STEP_KEYS.STEP_3_TECH_REQS]: {
        initial: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
        entry: assign({
          currentStepNumber: 3,
          updatedAt: () => new Date().toISOString(),
        }),

        states: {
          [STEP_STATES.INTERVIEW.FETCHING_QUESTION]: {
            invoke: {
              src: "fetchQuestion",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 3,
                previousAnswers: context.step3Answers.map((a) => a.value),
                projectContext: buildProjectContext(context),
              }),
              onDone: {
                target: STEP_STATES.INTERVIEW.AWAITING_ANSWER,
                actions: assign({
                  step3CurrentQuestion: ({ event }) =>
                    event.output?.question ?? null,
                  step3CurrentOptions: ({ event }) =>
                    event.output?.options ?? null,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to fetch question",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.AWAITING_ANSWER]: {
            on: {
              [EVENT_TYPES.SUBMIT_ANSWER]: {
                target: "persistingAnswer",
              },
              FINISH_INTERVIEW: {
                target: STEP_STATES.INTERVIEW.GENERATING_ARTIFACT,
              },
            },
          },

          // New state: Persist answer via workflow service
          persistingAnswer: {
            invoke: {
              src: "persistAnswerService",
              input: ({ context, event }) => {
                // Guard: only process SUBMIT_ANSWER events
                if (event.type !== EVENT_TYPES.SUBMIT_ANSWER) {
                  throw new Error(`Expected SUBMIT_ANSWER, got ${event.type}`);
                }
                return {
                  projectId: context.projectId,
                  stepNumber: 3,
                  question: event.question,
                  answer: event.answer,
                };
              },
              onDone: {
                target: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
                actions: assign({
                  // Extract step3 answers from persisted state
                  step3Answers: ({ event }) =>
                    event.output?.steps?.[2]?.answers ?? [],
                  step3CurrentQuestion: null,
                  step3CurrentOptions: null,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to persist answer",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.GENERATING_ARTIFACT]: {
            invoke: {
              src: "generateArtifact",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 3,
                accumulatedContext: {
                  step3Answers: context.step3Answers,
                },
              }),
              onDone: {
                target: "persistingArtifact",
                actions: assign({
                  _tempArtifact: ({ event }) => event.output,
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to generate artifact",
                }),
              },
            },
          },

          // New state: Persist artifact via workflow service
          persistingArtifact: {
            invoke: {
              src: "persistArtifactService",
              input: ({ context }) => {
                if (!context._tempArtifact) {
                  throw new Error("No artifact to persist");
                }
                return {
                  projectId: context.projectId,
                  stepNumber: 3,
                  artifactKey: "technical-requirements",
                  artifact: context._tempArtifact.content,
                };
              },
              onDone: {
                target: "completingStep",
                actions: assign({
                  artifacts: ({ context }) => ({
                    ...context.artifacts,
                    technicalRequirements: context._tempArtifact!,
                  }),
                  _tempArtifact: undefined,
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to persist artifact",
                  _tempArtifact: undefined,
                }),
              },
            },
          },

          // New state: Complete step via workflow service
          completingStep: {
            invoke: {
              src: "completeStepService",
              input: ({ context }) => ({
                projectId: context.projectId,
                stepNumber: 3,
              }),
              onDone: {
                target: STEP_STATES.INTERVIEW.COMPLETE,
                actions: assign({
                  completedSteps: ({ event }) =>
                    event.output?.steps
                      ?.filter((s) => s.status === "complete")
                      .map((s) => s.stepNumber) ?? [],
                  updatedAt: () => new Date().toISOString(),
                }),
              },
              onError: {
                target: STEP_STATES.INTERVIEW.ERROR,
                actions: assign({
                  error: ({ event }) =>
                    event.error instanceof Error
                      ? event.error.message
                      : "Failed to complete step",
                }),
              },
            },
          },

          [STEP_STATES.INTERVIEW.ERROR]: {
            on: {
              RETRY: STEP_STATES.INTERVIEW.FETCHING_QUESTION,
            },
          },

          [STEP_STATES.INTERVIEW.COMPLETE]: {
            type: "final",
          },
        },
      },

      // ───────────────────────────────────────────────────────
      // STEPS 4-10: Placeholder states
      // ───────────────────────────────────────────────────────
      step4_architecture: {
        entry: assign({
          currentStepNumber: 4,
          completedSteps: ({ context }) => [...context.completedSteps, 4],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step5_dataModeling: {
        entry: assign({
          currentStepNumber: 5,
          completedSteps: ({ context }) => [...context.completedSteps, 5],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step6_testing: {
        entry: assign({
          currentStepNumber: 6,
          completedSteps: ({ context }) => [...context.completedSteps, 6],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step7_refinement: {
        entry: assign({
          currentStepNumber: 7,
          completedSteps: ({ context }) => [...context.completedSteps, 7],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step8_documentation: {
        entry: assign({
          currentStepNumber: 8,
          completedSteps: ({ context }) => [...context.completedSteps, 8],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step9_deployment: {
        entry: assign({
          currentStepNumber: 9,
          completedSteps: ({ context }) => [...context.completedSteps, 9],
          updatedAt: () => new Date().toISOString(),
        }),
      },
      step10_monitoring: {
        entry: assign({
          currentStepNumber: 10,
          completedSteps: ({ context }) => [...context.completedSteps, 10],
          updatedAt: () => new Date().toISOString(),
        }),
      },
    },
  });
}
