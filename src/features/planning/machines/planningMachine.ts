/**
 * XState v5 Planning Machine
 *
 * Manages the 10-step planning workflow with state machines
 */

import { assign, fromPromise, setup } from "xstate";
import { createInterviewAnswer } from "../domain/step-commands";
import type {
  Artifact,
  PlanningContext,
  PlanningEvent,
  PlanningInput,
} from "./types";

// ─────────────────────────────────────────────────────────────
// PERSISTENCE HELPER (BUG-019)
// ─────────────────────────────────────────────────────────────

/**
 * ✅ Interview answer persistence removed - now handled by StatePersistence (BUG-022)
 * This prevents duplicate writes (old: immediate fire-and-forget, new: debounced batch)
 */

function persistFormResponsesToDatabase(
  projectId: string,
  stepNumber: 1 | 5,
  responses: Record<string, string>,
): void {
  import("../infrastructure/server-functions")
    .then(({ $saveFormResponses }) => {
      return $saveFormResponses({
        data: { projectId, stepNumber, responses },
      });
    })
    .then(() => {
      console.log(
        `[persistFormResponses] ✅ Saved: Step ${stepNumber}, ${Object.keys(responses).length} responses`,
      );
    })
    .catch((error) => {
      console.error(`[persistFormResponses] ❌ Failed to persist responses:`, {
        projectId,
        stepNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

// ─────────────────────────────────────────────────────────────
// REAL API ACTORS
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
    // Use existing server function (same pattern as generateArtifact)
    console.log("[fetchQuestion] Importing server function...");
    const { $generateQuestion } = await import("../../ai/server");

    console.log("[fetchQuestion] Calling $generateQuestion...");
    const result = await $generateQuestion({
      data: {
        projectId: input.projectId,
        stepNumber: input.stepNumber,
        previousAnswers: input.previousAnswers,
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

    // Parse options from markdown in question text
    const { parseOptions } = await import("../../ai/parse-options");
    const parsedOptions = parseOptions(result.question);

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
  } else if (input.stepNumber === 2 && input.accumulatedContext.step2Answers) {
    const stepAnswers = input.accumulatedContext.step2Answers as Array<{
      value: string;
    }>;
    answers.push(...stepAnswers.map((a) => a.value));
  } else if (input.stepNumber === 3 && input.accumulatedContext.step3Answers) {
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

  // Persist form responses to database (steps 1 and 5)
  if (input.stepNumber === 1 && input.accumulatedContext.step1Responses) {
    const responses = input.accumulatedContext.step1Responses as Record<
      string,
      string
    >;
    persistFormResponsesToDatabase(input.projectId, 1, responses);
  } else if (
    input.stepNumber === 5 &&
    input.accumulatedContext.step5Responses
  ) {
    const responses = input.accumulatedContext.step5Responses as Record<
      string,
      string
    >;
    persistFormResponsesToDatabase(input.projectId, 5, responses);
  }

  try {
    // Call server function for artifact generation
    console.log("[generateArtifact] Importing server function...");
    const { $generateArtifact } = await import("../../ai/server");

    console.log("[generateArtifact] Calling $generateArtifact...");
    const artifact = await $generateArtifact({
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

// ─────────────────────────────────────────────────────────────
// NAVIGATION HELPERS
// ─────────────────────────────────────────────────────────────

const _STEP_NUMBER_TO_KEY: Record<number, string> = {
  1: "step1_gapAnalysis",
  2: "step2_businessReqs",
  3: "step3_techReqs",
  4: "step4_styleAnchors",
  5: "step5_implPlanner",
  6: "step6_definitionOfDone",
  7: "step7_archDecisions",
  8: "step8_deliveryTimeline",
  9: "step9_qaTestPlan",
  10: "step10_summaries",
};

const _STEP_KEY_TO_NUMBER: Record<string, number> = {
  step1_gapAnalysis: 1,
  step2_businessReqs: 2,
  step3_techReqs: 3,
  step4_styleAnchors: 4,
  step5_implPlanner: 5,
  step6_definitionOfDone: 6,
  step7_archDecisions: 7,
  step8_deliveryTimeline: 8,
  step9_qaTestPlan: 9,
  step10_summaries: 10,
};

function isStepComplete(context: PlanningContext, stepNumber: number): boolean {
  return context.completedSteps.includes(stepNumber);
}

function _canNavigateForward(context: PlanningContext): boolean {
  // Can go forward if current step is complete and not on step 10
  return (
    context.currentStepNumber < 10 &&
    isStepComplete(context, context.currentStepNumber)
  );
}

function _canNavigateBack(context: PlanningContext): boolean {
  // Can go back if not on step 1
  return context.currentStepNumber > 1;
}

// ─────────────────────────────────────────────────────────────
// MACHINE DEFINITION
// ─────────────────────────────────────────────────────────────

export const planningMachine = setup({
  types: {
    context: {} as PlanningContext,
    events: {} as PlanningEvent,
    input: {} as PlanningInput,
  },
  actors: {
    fetchQuestion,
    generateArtifact,
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
  initial: "step1_gapAnalysis",
  context: ({ input }: { input: PlanningInput }) => ({
    projectId: input.projectId,
    entryPath: input.entryPath,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    step1Responses: {},
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
    // Global navigation handlers - explicit transitions based on current step
    NEXT: [
      {
        guard: ({ context }) =>
          context.currentStepNumber === 1 && isStepComplete(context, 1),
        target: ".step2_businessReqs",
        actions: assign({
          currentStepNumber: 2,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 2 && isStepComplete(context, 2),
        target: ".step3_techReqs",
        actions: assign({
          currentStepNumber: 3,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 3 && isStepComplete(context, 3),
        target: ".step4_styleAnchors",
        actions: assign({
          currentStepNumber: 4,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 4 && isStepComplete(context, 4),
        target: ".step5_implPlanner",
        actions: assign({
          currentStepNumber: 5,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 5 && isStepComplete(context, 5),
        target: ".step6_definitionOfDone",
        actions: assign({
          currentStepNumber: 6,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 6 && isStepComplete(context, 6),
        target: ".step7_archDecisions",
        actions: assign({
          currentStepNumber: 7,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 7 && isStepComplete(context, 7),
        target: ".step8_deliveryTimeline",
        actions: assign({
          currentStepNumber: 8,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 8 && isStepComplete(context, 8),
        target: ".step9_qaTestPlan",
        actions: assign({
          currentStepNumber: 9,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) =>
          context.currentStepNumber === 9 && isStepComplete(context, 9),
        target: ".step10_summaries",
        actions: assign({
          currentStepNumber: 10,
          updatedAt: () => new Date().toISOString(),
        }),
      },
    ],
    BACK: [
      {
        guard: ({ context }) => context.currentStepNumber === 2,
        target: ".step1_gapAnalysis",
        actions: assign({
          currentStepNumber: 1,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 3,
        target: ".step2_businessReqs",
        actions: assign({
          currentStepNumber: 2,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 4,
        target: ".step3_techReqs",
        actions: assign({
          currentStepNumber: 3,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 5,
        target: ".step4_styleAnchors",
        actions: assign({
          currentStepNumber: 4,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 6,
        target: ".step5_implPlanner",
        actions: assign({
          currentStepNumber: 5,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 7,
        target: ".step6_definitionOfDone",
        actions: assign({
          currentStepNumber: 6,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 8,
        target: ".step7_archDecisions",
        actions: assign({
          currentStepNumber: 7,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 9,
        target: ".step8_deliveryTimeline",
        actions: assign({
          currentStepNumber: 8,
          updatedAt: () => new Date().toISOString(),
        }),
      },
      {
        guard: ({ context }) => context.currentStepNumber === 10,
        target: ".step9_qaTestPlan",
        actions: assign({
          currentStepNumber: 9,
          updatedAt: () => new Date().toISOString(),
        }),
      },
    ],
    RESUME_AUTOMATED_STEP: [
      {
        guard: ({ event }) =>
          event.type === "RESUME_AUTOMATED_STEP" && event.stepNumber === 4,
        target: ".step4_styleAnchors",
      },
      {
        guard: ({ event }) =>
          event.type === "RESUME_AUTOMATED_STEP" && event.stepNumber === 6,
        target: ".step6_definitionOfDone",
      },
      {
        guard: ({ event }) =>
          event.type === "RESUME_AUTOMATED_STEP" && event.stepNumber === 8,
        target: ".step8_deliveryTimeline",
      },
      {
        guard: ({ event }) =>
          event.type === "RESUME_AUTOMATED_STEP" && event.stepNumber === 9,
        target: ".step9_qaTestPlan",
      },
      {
        guard: ({ event }) =>
          event.type === "RESUME_AUTOMATED_STEP" && event.stepNumber === 10,
        target: ".step10_summaries",
      },
    ],
    // State synchronization - hot-reload actor from database snapshot
    RESTORE_SNAPSHOT: {
      actions: assign(({ context, event }) => {
        // Type guard to ensure we have the right event
        if (!event || event.type !== "RESTORE_SNAPSHOT") return {};

        const dbContext = event.snapshot?.context;

        // Validate database context
        if (!dbContext?.updatedAt) {
          console.warn(
            "[RESTORE_SNAPSHOT] Invalid database snapshot, ignoring",
          );
          return {}; // No-op, keep current state
        }

        // Compare timestamps to determine which state is authoritative
        const localTime = new Date(context.updatedAt).getTime();
        const dbTime = new Date(dbContext.updatedAt).getTime();

        // CRITICAL: Preserve local changes if local is newer
        // This protects optimistic updates that haven't synced yet
        if (localTime > dbTime) {
          console.log(
            "[RESTORE_SNAPSHOT] Keeping local changes (newer than DB)",
          );
          return {}; // No-op, local is authoritative
        }

        // Database is newer - apply DB snapshot
        console.log(
          "[RESTORE_SNAPSHOT] Applying database snapshot (newer than local)",
        );
        return {
          ...dbContext,
          // Preserve any transient UI state that doesn't persist to DB
          // (Add fields here if needed based on requirements)
        };
      }),
    },
  },

  states: {
    idle: {
      on: {
        START_PLANNING: {
          target: "step1_gapAnalysis",
          actions: assign({
            currentStepNumber: 1,
            updatedAt: () => new Date().toISOString(),
          }),
        },
      },
    },

    // ─── STEP 1: Gap Analysis (Form) ───────────────────────
    step1_gapAnalysis: {
      initial: "collecting",
      states: {
        collecting: {
          on: {
            SUBMIT_FORM: {
              guard: ({ event }) =>
                event.type === "SUBMIT_FORM" && event.stepNumber === 1,
              target: "submitting",
              actions: assign({
                step1Responses: ({ event }) => event.responses,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
        submitting: {
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
              target: "#planning.step2_businessReqs",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  1: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(1)
                    ? context.completedSteps
                    : [...context.completedSteps, 1],
                currentStepNumber: 2,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "collecting",
              actions: assign({
                error: ({ event }) =>
                  `Step 1 artifact generation failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 2: Business Requirements (Interview) ─────────
    step2_businessReqs: {
      initial: "asking",
      states: {
        asking: {
          invoke: {
            id: "fetchQ2",
            src: "fetchQuestion",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 2,
              previousAnswers: context.step2Answers.map((a) => a.value),
              projectContext: buildProjectContext(context),
            }),
            onDone: {
              target: "answering",
              actions: assign({
                step2CurrentQuestion: ({ event }) => event.output.question,
                step2CurrentOptions: ({ event }) =>
                  event.output.options ?? null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "asking",
              actions: assign({
                error: ({ event }) =>
                  `Failed to fetch question: ${event.error}`,
              }),
            },
          },
        },
        answering: {
          on: {
            SUBMIT_ANSWER: {
              guard: ({ event }) =>
                event.type === "SUBMIT_ANSWER" && event.stepNumber === 2,
              target: "checkingComplete",
              actions: assign({
                step2Answers: ({ context, event }) => {
                  // ✅ Persistence now handled by StatePersistence layer (BUG-022)
                  // Removed duplicate fire-and-forget call that caused double writes

                  // Delegate answer creation to domain layer
                  const newAnswer = createInterviewAnswer(
                    event.question,
                    event.answer,
                  );
                  return [...context.step2Answers, newAnswer];
                },
                step2CurrentQuestion: null,
                step2CurrentOptions: null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
        checkingComplete: {
          always: [
            {
              guard: ({ context }) => context.step2Answers.length < 10,
              target: "asking",
            },
            {
              target: "generatingArtifact",
            },
          ],
        },
        generatingArtifact: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 2,
              accumulatedContext: {
                responses: context.step1Responses,
                step2Answers: context.step2Answers,
                projectOverview: buildProjectContext(context),
              },
            }),
            onDone: {
              target: "#planning.step3_techReqs",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  2: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(2)
                    ? context.completedSteps
                    : [...context.completedSteps, 2],
                currentStepNumber: 3,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "asking",
              actions: assign({
                error: ({ event }) => `Step 2 artifact failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 3: Technical Requirements (Interview) ────────
    step3_techReqs: {
      initial: "asking",
      states: {
        asking: {
          invoke: {
            id: "fetchQ3",
            src: "fetchQuestion",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 3,
              previousAnswers: context.step3Answers.map((a) => a.value),
              projectContext: buildProjectContext(context),
            }),
            onDone: {
              target: "answering",
              actions: assign({
                step3CurrentQuestion: ({ event }) => event.output.question,
                step3CurrentOptions: ({ event }) =>
                  event.output.options ?? null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "asking",
              actions: assign({
                error: ({ event }) =>
                  `Failed to fetch question: ${event.error}`,
              }),
            },
          },
        },
        answering: {
          on: {
            SUBMIT_ANSWER: {
              guard: ({ event }) =>
                event.type === "SUBMIT_ANSWER" && event.stepNumber === 3,
              target: "checkingComplete",
              actions: assign({
                step3Answers: ({ context, event }) => {
                  // ✅ Persistence now handled by StatePersistence layer (BUG-022)
                  // Removed duplicate fire-and-forget call that caused double writes

                  // Delegate answer creation to domain layer
                  const newAnswer = createInterviewAnswer(
                    event.question,
                    event.answer,
                  );
                  return [...context.step3Answers, newAnswer];
                },
                step3CurrentQuestion: null,
                step3CurrentOptions: null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
        checkingComplete: {
          always: [
            {
              guard: ({ context }) => context.step3Answers.length < 10,
              target: "asking",
            },
            {
              target: "generatingArtifact",
            },
          ],
        },
        generatingArtifact: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 3,
              accumulatedContext: {
                responses: context.step1Responses,
                step2Answers: context.step2Answers,
                step3Answers: context.step3Answers,
                projectOverview: buildProjectContext(context),
              },
            }),
            onDone: {
              target: "#planning.step4_styleAnchors",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  3: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(3)
                    ? context.completedSteps
                    : [...context.completedSteps, 3],
                currentStepNumber: 4,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "asking",
              actions: assign({
                error: ({ event }) => `Step 3 artifact failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 4: Style Anchors Collection (Automated) ──────
    step4_styleAnchors: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 4,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
              },
            }),
            onDone: {
              target: "#planning.step5_implPlanner",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  4: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(4)
                    ? context.completedSteps
                    : [...context.completedSteps, 4],
                currentStepNumber: 5,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 4 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 5: Implementation Planner (Form) ─────────────
    step5_implPlanner: {
      initial: "collecting",
      states: {
        collecting: {
          on: {
            SUBMIT_FORM: {
              guard: ({ event }) =>
                event.type === "SUBMIT_FORM" && event.stepNumber === 5,
              target: "submitting",
              actions: assign({
                step5Responses: ({ event }) => event.responses,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
        submitting: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 5,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                step5Responses: context.step5Responses,
              },
            }),
            onDone: {
              target: "#planning.step6_definitionOfDone",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  5: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(5)
                    ? context.completedSteps
                    : [...context.completedSteps, 5],
                currentStepNumber: 6,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "collecting",
              actions: assign({
                error: ({ event }) => `Step 5 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 6: Definition of Done (Automated) ────────────
    step6_definitionOfDone: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 6,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                artifacts: context.artifacts,
              },
            }),
            onDone: {
              target: "#planning.step7_archDecisions",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  6: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(6)
                    ? context.completedSteps
                    : [...context.completedSteps, 6],
                currentStepNumber: 7,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 6 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 7: Architecture Decisions (Artifact-only) ────
    step7_archDecisions: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 7,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                artifacts: context.artifacts,
              },
            }),
            onDone: {
              target: "reviewing",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  7: event.output,
                }),
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 7 failed: ${event.error}`,
              }),
            },
          },
        },
        reviewing: {
          on: {
            EDIT_ARTIFACT: {
              guard: ({ event }) =>
                event.type === "EDIT_ARTIFACT" && event.stepNumber === 7,
              actions: assign({
                step7Edits: ({ event }) => event.content,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            APPROVE_ARTIFACT: {
              guard: ({ event }) =>
                event.type === "APPROVE_ARTIFACT" && event.stepNumber === 7,
              target: "#planning.step8_deliveryTimeline",
              actions: assign({
                artifacts: ({ context }) => ({
                  ...context.artifacts,
                  7: context.step7Edits
                    ? {
                        type: "markdown",
                        content: context.step7Edits,
                        generatedAt: new Date().toISOString(),
                      }
                    : context.artifacts[7],
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(7)
                    ? context.completedSteps
                    : [...context.completedSteps, 7],
                currentStepNumber: 8,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
      },
    },

    // ─── STEP 8: Delivery Timeline (Automated) ─────────────
    step8_deliveryTimeline: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 8,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                artifacts: context.artifacts,
              },
            }),
            onDone: {
              target: "#planning.step9_qaTestPlan",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  8: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(8)
                    ? context.completedSteps
                    : [...context.completedSteps, 8],
                currentStepNumber: 9,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 8 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 9: QA Test Plan (Automated) ──────────────────
    step9_qaTestPlan: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 9,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                artifacts: context.artifacts,
              },
            }),
            onDone: {
              target: "#planning.step10_summaries",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  9: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(9)
                    ? context.completedSteps
                    : [...context.completedSteps, 9],
                currentStepNumber: 10,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 9 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 10: Executive/Developer Summaries (Automated)
    step10_summaries: {
      initial: "generating",
      states: {
        generating: {
          invoke: {
            src: "generateArtifact",
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 10,
              accumulatedContext: {
                projectOverview: buildProjectContext(context),
                artifacts: context.artifacts,
              },
            }),
            onDone: {
              target: "#planning.complete",
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  10: event.output,
                }),
                completedSteps: ({ context }) =>
                  context.completedSteps.includes(10)
                    ? context.completedSteps
                    : [...context.completedSteps, 10],
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: "generating",
              actions: assign({
                error: ({ event }) => `Step 10 failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── COMPLETE: All steps done ──────────────────────────
    complete: {
      type: "final",
    },
  },
});
