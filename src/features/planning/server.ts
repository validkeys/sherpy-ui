import { createServerFn } from "@tanstack/react-start";
import { generateArtifact } from "../ai/server";
import { getProject, initStore } from "../projects/store";
import {
  getStepState,
  hasStepState,
  initProjectSteps,
  submitAnswer,
} from "./store";

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
      initProjectSteps(data.projectId, project.entryPath);
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
    if (typeof d.answer !== "string" || !d.answer.trim())
      throw new Error("answer required");
    return {
      projectId: d.projectId,
      stepNumber: d.stepNumber,
      answer: d.answer.trim(),
    };
  })
  .handler(async ({ data }) => {
    await initStore();
    const updatedState = submitAnswer(
      data.projectId,
      data.stepNumber,
      data.answer,
    );

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
