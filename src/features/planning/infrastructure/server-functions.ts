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
import type { ProjectStepState } from "../types";
import {
  loadPlanningState,
  saveInterviewAnswer,
  savePlanningState,
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
    if (typeof d.question !== "string") {
      throw new Error("question required");
    }
    if (typeof d.answer !== "string") {
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
        // 1. Load current state
        const currentState = (await loadPlanningState(
          data.projectId,
        )) as ProjectStepState | null;
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic (pure function)
        const newState = submitStepAnswer(
          currentState,
          data.stepNumber,
          data.question,
          data.answer,
        );

        // 3. Persist new state (parallel operations)
        if (data.stepNumber === 2 || data.stepNumber === 3) {
          await Promise.all([
            savePlanningState(
              data.projectId,
              newState as unknown as Record<string, unknown>,
            ),
            saveInterviewAnswer(
              data.projectId,
              data.stepNumber,
              data.question,
              data.answer,
            ),
          ]);
        } else {
          // For other steps, just save planning state
          await savePlanningState(
            data.projectId,
            newState as unknown as Record<string, unknown>,
          );
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
        const currentState = (await loadPlanningState(
          data.projectId,
        )) as ProjectStepState | null;
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = completeStep(currentState, data.stepNumber);

        // 3. Persist
        await savePlanningState(
          data.projectId,
          newState as unknown as Record<string, unknown>,
        );

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
        const currentState = (await loadPlanningState(
          data.projectId,
        )) as ProjectStepState | null;
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = skipStep(currentState, data.stepNumber);

        // 3. Persist
        await savePlanningState(
          data.projectId,
          newState as unknown as Record<string, unknown>,
        );

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
        const currentState = (await loadPlanningState(
          data.projectId,
        )) as ProjectStepState | null;
        if (!currentState) {
          throw new Error("Project not found");
        }

        // 2. Apply domain logic
        const newState = setStepArtifact(
          currentState,
          data.stepNumber,
          data.artifact,
        );

        // 3. Persist
        await savePlanningState(
          data.projectId,
          newState as unknown as Record<string, unknown>,
        );

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
 * Read-only operation, no state transformation.
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
      const state = (await loadPlanningState(
        data.projectId,
      )) as ProjectStepState | null;
      if (!state) {
        throw new Error("Project not found");
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
