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
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 2: Business Requirements (Interview) ─────────
    step2_businessReqs: {
      initial: 'placeholder',
      states: {
        placeholder: {},
      },
    },

    // ─── STEP 3: Technical Requirements (Interview) ────────
    step3_techReqs: {
      initial: 'placeholder',
      states: {
        placeholder: {},
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
