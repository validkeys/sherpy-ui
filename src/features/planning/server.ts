import { createServerFn } from "@tanstack/react-start";
import { generateArtifact } from "../ai/server";
import { getProject, initStore } from "../projects/store";
import { isInterviewStep } from "./step-config";
import {
  completeStep,
  getStepState,
  hasStepState,
  initProjectSteps,
  setStepArtifact,
  submitAnswer,
  submitAnswerAndComplete,
  updateStepOptions,
} from "./store";
import type { StepOption } from "./types";

export const $getStepState = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    return { projectId: d.projectId };
  })
  .handler(async ({ data }) => {
    await initStore();
    if (!hasStepState(data.projectId)) {
      const project = getProject(data.projectId);
      if (!project) throw new Error(`Project not found: ${data.projectId}`);
      // Initialize with backend currentStep to restore persisted state
      initProjectSteps(data.projectId, project.entryPath, project.currentStep);
    }
    return getStepState(data.projectId);
  });

export const $submitAnswer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    if (typeof d.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    if (typeof d.question !== "string" || !d.question.trim())
      throw new Error("question required");
    if (typeof d.answer !== "string" || !d.answer.trim())
      throw new Error("answer required");
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
      question: d.question.trim(),
      answer: d.answer.trim(),
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    const updatedState = submitAnswer(
      data.projectId,
      data.stepNumber,
      data.question,
      data.answer,
    );

    // Persist interview answer to database (steps 2 and 3 only)
    if (data.stepNumber === 2 || data.stepNumber === 3) {
      try {
        saveInterviewAnswer(
          data.projectId,
          data.stepNumber,
          data.question,
          data.answer,
        );
      } catch (error) {
        // Log but don't block - database persistence is fire-and-forget
        console.error(
          "[submitAnswer] Failed to persist interview answer:",
          error,
        );
      }
    }

    // Generate artifact after step completion
    // For now, we only have a single answer per step, so pass it as an array
    try {
      await generateArtifact(data.projectId, data.stepNumber, [data.answer]);
    } catch (error) {
      // Log but don't block - artifact generation is async and can fail
      console.error("Failed to generate artifact:", error);
    }

    return updatedState;
  });

export const $completeStep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    if (typeof d.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    const updatedState = completeStep(data.projectId, data.stepNumber);

    // Sync currentStep to backend projects store
    try {
      const response = await fetch(`/api/projects/${data.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: updatedState.currentStep }),
      });
      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error(
        "[syncStepToBackend] Error syncing step to backend:",
        error,
      );
    }

    // Generate artifact after step completion for interview steps
    const step = updatedState.steps.find(
      (s) => s.stepNumber === data.stepNumber,
    );
    if (
      step?.answers &&
      step.answers.length > 0 &&
      isInterviewStep(data.stepNumber)
    ) {
      try {
        const answers = step.answers.map((a) => a.value);
        const artifact = await generateArtifact(
          data.projectId,
          data.stepNumber,
          answers,
        );
        // Update the step with the artifact content
        setStepArtifact(data.projectId, data.stepNumber, artifact.content);
      } catch (error) {
        console.error("Failed to generate artifact:", error);
      }
    }

    return updatedState;
  });

export const $submitAnswerAndComplete = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    if (typeof d.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    if (typeof d.question !== "string" || !d.question.trim())
      throw new Error("question required");
    if (typeof d.answer !== "string" || !d.answer.trim())
      throw new Error("answer required");
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
      question: d.question.trim(),
      answer: d.answer.trim(),
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    const updatedState = submitAnswerAndComplete(
      data.projectId,
      data.stepNumber,
      data.question,
      data.answer,
    );

    // Sync currentStep to backend projects store
    try {
      const response = await fetch(`/api/projects/${data.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: updatedState.currentStep }),
      });
      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error(
        "[syncStepToBackend] Error syncing step to backend:",
        error,
      );
    }

    return updatedState;
  });

export const $updateStepOptions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    if (typeof d.stepNumber !== "number")
      throw new Error("stepNumber must be a number");
    if (!Array.isArray(d.options)) throw new Error("options must be an array");
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
      options: d.options as StepOption[],
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    return updateStepOptions(data.projectId, data.stepNumber, data.options);
  });

// ─────────────────────────────────────────────────────────────
// PLANNING STATE PERSISTENCE (SQLite)
// ─────────────────────────────────────────────────────────────

import { saveInterviewAnswer } from "../../lib/db/interview";
import {
  deletePlanningState,
  hasPlanningState,
  loadPlanningState,
  savePlanningState,
} from "../../lib/db/planning";

/**
 * Save planning machine state to database
 * Stores XState snapshot for persistence and recovery
 */
export const $savePlanningState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    if (typeof d.snapshot !== "object" || d.snapshot === null)
      throw new Error("snapshot required");

    // Validate snapshot structure
    const snapshot = d.snapshot as Record<string, unknown>;
    if (!snapshot.status || !snapshot.value || !snapshot.context) {
      throw new Error(
        "invalid snapshot: missing required fields (status, value, context)",
      );
    }

    return {
      projectId: d.projectId,
      snapshot: snapshot as any, // Type cast for serialized snapshot
    };
  })
  .handler(async ({ data }) => {
    // The snapshot is a serialized XState snapshot (from toJSON())
    // The DB layer accepts any as it stores JSON TEXT
    savePlanningState(data.projectId, data.snapshot as any);
    return { success: true };
  });

/**
 * Load planning machine state from database
 * Returns snapshot if found and valid, null otherwise
 */
export const $loadPlanningState = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    return { projectId: d.projectId };
  })
  .handler(async ({ data }) => {
    // Returns any to allow for serialized snapshot that will be
    // reconstructed by XState's createActor with snapshot option
    return loadPlanningState(data.projectId) as any;
  });

/**
 * Delete planning state from database
 */
export const $deletePlanningState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    return { projectId: d.projectId };
  })
  .handler(async ({ data }) => {
    deletePlanningState(data.projectId);
    return { success: true };
  });

/**
 * Check if planning state exists in database
 */
export const $hasPlanningState = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    if (typeof data !== "object" || data === null)
      throw new Error("invalid input: expected object");
    const d = data as Record<string, unknown>;
    if (typeof d.projectId !== "string" || !d.projectId)
      throw new Error("projectId required");
    return { projectId: d.projectId };
  })
  .handler(async ({ data }) => {
    return hasPlanningState(data.projectId);
  });
