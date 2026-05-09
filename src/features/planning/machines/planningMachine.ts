/**
 * XState v5 Planning Machine
 *
 * Manages the 10-step planning workflow with state machines
 */

import { setup, assign, fromPromise } from 'xstate';
import type {
  PlanningContext,
  PlanningEvent,
  PlanningInput,
  Artifact,
  InterviewAnswer,
} from './types';

// ─────────────────────────────────────────────────────────────
// STUB ACTORS (will be replaced with real implementations in t-009)
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
  // STUB: return mock data
  return {
    question: `Mock question for step ${input.stepNumber}`,
    options: ['Option A', 'Option B', 'Option C'],
  };
});

const generateArtifact = fromPromise<
  Artifact,
  {
    projectId: string;
    stepNumber: number;
    accumulatedContext: Record<string, unknown>;
  }
>(async ({ input }) => {
  // STUB: return mock artifact
  return {
    type: 'yaml',
    content: `# Mock artifact for step ${input.stepNumber}`,
    generatedAt: new Date().toISOString(),
  };
});

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

function buildProjectContext(ctx: PlanningContext): string {
  const parts: string[] = [];
  if (ctx.step1Responses.overview) {
    parts.push(`Project: ${ctx.step1Responses.overview}`);
  }
  if (ctx.step2Answers.length > 0) {
    parts.push('Business Requirements:');
    ctx.step2Answers.forEach((a) => parts.push(`  Q: ${a.question}\n  A: ${a.value}`));
  }
  if (ctx.step3Answers.length > 0) {
    parts.push('Technical Requirements:');
    ctx.step3Answers.forEach((a) => parts.push(`  Q: ${a.question}\n  A: ${a.value}`));
  }
  return parts.join('\n\n');
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
  id: 'planning',
  initial: 'idle',
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
    error: null,
  }),

  states: {
    idle: {
      on: {
        START_PLANNING: 'step1_gapAnalysis',
      },
    },

    // ─── STEP 1: Gap Analysis (Form) ───────────────────────
    step1_gapAnalysis: {
      initial: 'collecting',
      states: {
        collecting: {
          on: {
            SUBMIT_FORM: {
              guard: ({ event }) => event.type === 'SUBMIT_FORM' && event.stepNumber === 1,
              target: 'submitting',
              actions: assign({
                step1Responses: ({ event }) => event.responses,
                updatedAt: () => new Date().toISOString(),
              }),
            },
          },
        },
        submitting: {
          invoke: {
            src: 'generateArtifact',
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 1,
              accumulatedContext: {
                responses: context.step1Responses,
              },
            }),
            onDone: {
              target: '#planning.step2_businessReqs',
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  1: event.output,
                }),
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: 'collecting',
              actions: assign({
                error: ({ event }) => `Step 1 artifact generation failed: ${event.error}`,
              }),
            },
          },
        },
      },
    },

    // ─── STEP 2: Business Requirements (Interview) ─────────
    step2_businessReqs: {
      initial: 'asking',
      states: {
        asking: {
          invoke: {
            id: 'fetchQ2',
            src: 'fetchQuestion',
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 2,
              previousAnswers: context.step2Answers.map((a) => a.value),
              projectContext: buildProjectContext(context),
            }),
            onDone: {
              target: 'answering',
              actions: assign({
                step2CurrentQuestion: ({ event }) => event.output.question,
                step2CurrentOptions: ({ event }) => event.output.options ?? null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: 'asking',
              actions: assign({
                error: ({ event }) => `Failed to fetch question: ${event.error}`,
              }),
            },
          },
        },
        answering: {
          on: {
            SUBMIT_ANSWER: {
              guard: ({ event }) => event.type === 'SUBMIT_ANSWER' && event.stepNumber === 2,
              target: 'checkingComplete',
              actions: assign({
                step2Answers: ({ context, event }) => [
                  ...context.step2Answers,
                  {
                    question: event.question,
                    value: event.answer,
                    timestamp: new Date().toISOString(),
                  },
                ],
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
              target: 'asking',
            },
            {
              target: 'generatingArtifact',
            },
          ],
        },
        generatingArtifact: {
          invoke: {
            src: 'generateArtifact',
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 2,
              accumulatedContext: {
                responses: context.step1Responses,
                answers: context.step2Answers,
                projectOverview: buildProjectContext(context),
              },
            }),
            onDone: {
              target: '#planning.step3_techReqs',
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  2: event.output,
                }),
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: 'asking',
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
      initial: 'asking',
      states: {
        asking: {
          invoke: {
            id: 'fetchQ3',
            src: 'fetchQuestion',
            input: ({ context }) => ({
              projectId: context.projectId,
              stepNumber: 3,
              previousAnswers: context.step3Answers.map((a) => a.value),
              projectContext: buildProjectContext(context),
            }),
            onDone: {
              target: 'answering',
              actions: assign({
                step3CurrentQuestion: ({ event }) => event.output.question,
                step3CurrentOptions: ({ event }) => event.output.options ?? null,
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: 'asking',
              actions: assign({
                error: ({ event }) => `Failed to fetch question: ${event.error}`,
              }),
            },
          },
        },
        answering: {
          on: {
            SUBMIT_ANSWER: {
              guard: ({ event }) => event.type === 'SUBMIT_ANSWER' && event.stepNumber === 3,
              target: 'checkingComplete',
              actions: assign({
                step3Answers: ({ context, event }) => [
                  ...context.step3Answers,
                  {
                    question: event.question,
                    value: event.answer,
                    timestamp: new Date().toISOString(),
                  },
                ],
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
              target: 'asking',
            },
            {
              target: 'generatingArtifact',
            },
          ],
        },
        generatingArtifact: {
          invoke: {
            src: 'generateArtifact',
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
              target: '#planning.step4_styleAnchors',
              actions: assign({
                artifacts: ({ context, event }) => ({
                  ...context.artifacts,
                  3: event.output,
                }),
                updatedAt: () => new Date().toISOString(),
              }),
            },
            onError: {
              target: 'asking',
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
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 5: Implementation Planner (Form) ─────────────
    step5_implPlanner: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 6: Definition of Done (Automated) ────────────
    step6_definitionOfDone: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 7: Architecture Decisions (Artifact-only) ────
    step7_archDecisions: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 8: Delivery Timeline (Automated) ─────────────
    step8_deliveryTimeline: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 9: QA Test Plan (Automated) ──────────────────
    step9_qaTestPlan: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 10: Executive/Developer Summaries (Automated)
    step10_summaries: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── COMPLETE: All steps done ──────────────────────────
    complete: {
      type: 'final',
    },
  },
});
