/**
 * Infrastructure layer: TanStack server functions for planning workflow
 *
 * Pattern: Load → Transform → Persist (with observability logging)
 * - Load: Fetch current state from repository
 * - Transform: Apply pure domain logic
 * - Persist: Save new state to repository
 *
 * This layer orchestrates domain + infrastructure but contains NO business logic.
 * All business rules live in the domain layer (step-commands.ts).
 *
 * @module features/planning/infrastructure/server-functions
 */

import { createServerFn } from "@tanstack/react-start";
import {
  completeStep,
  setStepArtifact,
  skipStep,
  submitStepAnswer,
} from "../domain/step-commands";
import type { StepNumber } from "../domain/types";
import type { ProjectStepState, StepOption } from "../types";
import {
  loadPlanningState,
  loadStepState,
  saveFormResponse,
  saveInterviewAnswer,
  savePlanningState,
  saveStepState,
} from "./repository";

/**
 * Logging utility for observability
 * Logs server actions with timestamp and context data
 */
function logServerAction(action: string, data: Record<string, unknown>): void {
  console.log(`[server-fn] ${action}`, {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Server function: Persist one interview answer without changing workflow state.
 *
 * Used by the legacy XState machine while it remains the workflow owner.
 */
export const $saveInterviewAnswer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId) {
      throw new Error("projectId required");
    }
    const stepNumber = d.stepNumber;
    if (stepNumber !== 2 && stepNumber !== 3) {
      throw new Error("stepNumber must be 2 or 3");
    }
    if (typeof d.question !== "string" || !d.question) {
      throw new Error("question required");
    }
    if (typeof d.answer !== "string" || !d.answer) {
      throw new Error("answer required");
    }
    return {
      projectId: d.projectId,
      stepNumber,
      question: d.question,
      answer: d.answer,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: {
        projectId: string;
        stepNumber: number;
        question: string;
        answer: string;
      };
    }) => {
      logServerAction("saveInterviewAnswer.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      await saveInterviewAnswer(
        data.projectId,
        data.stepNumber as 2 | 3,
        data.question,
        data.answer,
      );

      logServerAction("saveInterviewAnswer.success", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      return { success: true };
    },
  );

/**
 * Server function: Persist form responses without changing workflow state.
 *
 * Used by the legacy XState machine while it remains the workflow owner.
 */
export const $saveFormResponses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId) {
      throw new Error("projectId required");
    }
    const stepNumber = d.stepNumber;
    if (stepNumber !== 1 && stepNumber !== 5) {
      throw new Error("stepNumber must be 1 or 5");
    }
    if (typeof d.responses !== "object" || d.responses === null) {
      throw new Error("responses required");
    }

    return {
      projectId: d.projectId,
      stepNumber,
      responses: d.responses as Record<string, string>,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: {
        projectId: string;
        stepNumber: number;
        responses: Record<string, string>;
      };
    }) => {
      logServerAction("saveFormResponses.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
        responseCount: Object.keys(data.responses).length,
      });

      await Promise.all(
        Object.entries(data.responses).map(([fieldName, fieldValue]) =>
          saveFormResponse(
            data.projectId,
            data.stepNumber as 1 | 5,
            fieldName,
            fieldValue,
          ),
        ),
      );

      logServerAction("saveFormResponses.success", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      return { success: true };
    },
  );

/**
 * Server function: Submit an interview answer (Steps 2 & 3)
 *
 * Flow:
 * 1. Load current state
 * 2. Apply domain logic (submitStepAnswer)
 * 3. Persist new state + interview answer
 * 4. Return new state
 */
export const $submitAnswer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    if (typeof d.question !== "string" || !d.question) {
      throw new Error("question required");
    }
    if (typeof d.answer !== "string" || !d.answer) {
      throw new Error("answer required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
      question: d.question,
      answer: d.answer,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: {
        projectId: string;
        stepNumber: StepNumber;
        question: string;
        answer: string;
      };
    }) => {
      logServerAction("submitAnswer.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      try {
        // 1. Load current state (using domain-friendly repository function)
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic (pure function)
        const newState = submitStepAnswer(currentState, {
          stepNumber: data.stepNumber,
          question: data.question,
          value: data.answer,
        });

        // 3. Persist new state (parallel operations)
        if (data.stepNumber === 2 || data.stepNumber === 3) {
          await Promise.all([
            saveStepState(newState),
            saveInterviewAnswer(
              data.projectId,
              data.stepNumber,
              data.question,
              data.answer,
            ),
          ]);
        } else {
          // For other steps, just save planning state
          await saveStepState(newState);
        }

        logServerAction("submitAnswer.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        // 4. Return new state
        return newState;
      } catch (error) {
        logServerAction("submitAnswer.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Submit an answer and complete the current step.
 */
export const $submitAnswerAndComplete = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    if (typeof d.question !== "string" || !d.question) {
      throw new Error("question required");
    }
    if (typeof d.answer !== "string" || !d.answer) {
      throw new Error("answer required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
      question: d.question,
      answer: d.answer,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: {
        projectId: string;
        stepNumber: StepNumber;
        question: string;
        answer: string;
      };
    }) => {
      logServerAction("submitAnswerAndComplete.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      try {
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        const answeredState = submitStepAnswer(currentState, {
          stepNumber: data.stepNumber,
          question: data.question,
          value: data.answer,
        });
        const newState = completeStep(answeredState, data.stepNumber);

        if (data.stepNumber === 2 || data.stepNumber === 3) {
          await Promise.all([
            saveStepState(newState),
            saveInterviewAnswer(
              data.projectId,
              data.stepNumber,
              data.question,
              data.answer,
            ),
          ]);
        } else {
          await saveStepState(newState);
        }

        logServerAction("submitAnswerAndComplete.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        return newState;
      } catch (error) {
        logServerAction("submitAnswerAndComplete.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Mark a step as complete
 *
 * Flow:
 * 1. Load current state
 * 2. Apply domain logic (completeStep)
 * 3. Persist new state
 * 4. Return new state
 */
export const $completeStep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: { projectId: string; stepNumber: StepNumber };
    }) => {
      logServerAction("completeStep.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      try {
        // 1. Load current state
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = completeStep(currentState, data.stepNumber);

        // 3. Persist
        await saveStepState(newState);

        logServerAction("completeStep.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        return newState;
      } catch (error) {
        logServerAction("completeStep.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Replace options for a step.
 */
export const $updateStepOptions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    if (!Array.isArray(d.options)) {
      throw new Error("options required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
      options: d.options as StepOption[],
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: {
        projectId: string;
        stepNumber: StepNumber;
        options: StepOption[];
      };
    }) => {
      logServerAction("updateStepOptions.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      try {
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        const newState: ProjectStepState = {
          ...currentState,
          steps: currentState.steps.map((step) =>
            step.stepNumber === data.stepNumber
              ? { ...step, options: data.options }
              : step,
          ),
        };

        await saveStepState(newState);

        logServerAction("updateStepOptions.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        return newState;
      } catch (error) {
        logServerAction("updateStepOptions.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Skip a step
 *
 * Flow:
 * 1. Load current state
 * 2. Apply domain logic (skipStep)
 * 3. Persist new state
 * 4. Return new state
 */
export const $skipStep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: { projectId: string; stepNumber: StepNumber };
    }) => {
      logServerAction("skipStep.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
      });

      try {
        // 1. Load current state
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = skipStep(currentState, data.stepNumber);

        // 3. Persist
        await saveStepState(newState);

        logServerAction("skipStep.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        return newState;
      } catch (error) {
        logServerAction("skipStep.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Set artifact content for a step
 *
 * Flow:
 * 1. Load current state
 * 2. Apply domain logic (setStepArtifact)
 * 3. Persist new state
 * 4. Return new state
 */
export const $setStepArtifact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    if (typeof d.stepNumber !== "number") {
      throw new Error("stepNumber required");
    }
    if (typeof d.artifact !== "string") {
      throw new Error("artifact required");
    }
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber as StepNumber,
      artifact: d.artifact,
    };
  })
  .handler(
    async ({
      data,
    }: {
      data: { projectId: string; stepNumber: StepNumber; artifact: string };
    }) => {
      logServerAction("setStepArtifact.start", {
        projectId: data.projectId,
        stepNumber: data.stepNumber,
        artifactLength: data.artifact.length,
      });

      try {
        // 1. Load current state
        const currentState = await loadStepState(data.projectId);
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = setStepArtifact(currentState, {
          stepNumber: data.stepNumber,
          artifactKey: `step-${data.stepNumber}`,
          artifact: data.artifact,
        });

        // 3. Persist
        await saveStepState(newState);

        logServerAction("setStepArtifact.success", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
        });

        return newState;
      } catch (error) {
        logServerAction("setStepArtifact.error", {
          projectId: data.projectId,
          stepNumber: data.stepNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Get current step state for a project
 *
 * Read-only operation that converts XState snapshot to ProjectStepState.
 * If no planning state exists (new project), returns default initial state.
 */
export const $getStepState = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string") {
      throw new Error("projectId required");
    }
    return {
      projectId: d.projectId,
    };
  })
  .handler(async ({ data }: { data: { projectId: string } }) => {
    logServerAction("getStepState.start", {
      projectId: data.projectId,
    });

    try {
      // Load domain-friendly state directly
      const state = await loadStepState(data.projectId);

      // If no state exists (new project), return default state
      if (!state) {
        logServerAction("getStepState.success", {
          projectId: data.projectId,
          currentStep: 1,
          isNewProject: true,
        });

        // Import converter (lazy to prevent bundling issues)
        const { createDefaultStepState } = await import("./snapshot-to-state");
        return createDefaultStepState(data.projectId);
      }

      logServerAction("getStepState.success", {
        projectId: data.projectId,
        currentStep: state.currentStep,
      });

      return state;
    } catch (error) {
      logServerAction("getStepState.error", {
        projectId: data.projectId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

/**
 * Server function: Save planning machine state (XState snapshot) to database
 */
export const $savePlanningState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId) {
      throw new Error("projectId required");
    }
    if (typeof d.snapshot !== "object" || d.snapshot === null) {
      throw new Error("snapshot required");
    }
    return {
      projectId: d.projectId,
      snapshot: d.snapshot,
    };
  })
  .handler(
    async ({ data }: { data: { projectId: string; snapshot: unknown } }) => {
      logServerAction("savePlanningState.start", {
        projectId: data.projectId,
      });

      try {
        await savePlanningState(
          data.projectId,
          data.snapshot as Record<string, unknown>,
        );

        logServerAction("savePlanningState.success", {
          projectId: data.projectId,
        });

        return { success: true };
      } catch (error) {
        logServerAction("savePlanningState.error", {
          projectId: data.projectId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );

/**
 * Server function: Load planning machine state (XState snapshot) from database
 */
export const $loadPlanningState = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null) {
      throw new Error("invalid input: expected object");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId) {
      throw new Error("projectId required");
    }
    return {
      projectId: d.projectId,
    };
  })
  .handler(
    async ({ data }: { data: { projectId: string } }): Promise<unknown> => {
      logServerAction("loadPlanningState.start", {
        projectId: data.projectId,
      });

      try {
        const snapshot = await loadPlanningState(data.projectId);

        logServerAction("loadPlanningState.success", {
          projectId: data.projectId,
          hasSnapshot: !!snapshot,
        });

        return snapshot;
      } catch (error) {
        logServerAction("loadPlanningState.error", {
          projectId: data.projectId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );
