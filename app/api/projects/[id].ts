import { defineEventHandler, readBody, getRouterParam } from "vinxi/http";
import { updateCurrentStep, initStore } from "@/features/projects/store";

export default defineEventHandler(async (event) => {
  await initStore();

  const body = await readBody(event);

  if (typeof body !== "object" || body === null) {
    throw new Error("invalid input");
  }

  const { currentStep } = body;

  if (currentStep === undefined) {
    throw new Error("currentStep required");
  }
  if (typeof currentStep !== "number") {
    throw new Error("currentStep must be a number");
  }

  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw new Error("projectId required");
  }

  const updated = updateCurrentStep(projectId, currentStep);
  return updated;
});
