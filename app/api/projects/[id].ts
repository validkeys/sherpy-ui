import { defineEventHandler, getRouterParam, readBody } from "vinxi/http";
import { initStore, updateCurrentStep } from "@/features/projects/store";
import { updateCurrentStepSchema } from "../schemas";
import { validateBody } from "../utils/validate";

export default defineEventHandler(async (event) => {
  await initStore();

  const body = await readBody(event);
  const { currentStep } = validateBody(body, updateCurrentStepSchema);

  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw new Error("projectId required");
  }

  const updated = updateCurrentStep(projectId, currentStep);
  return updated;
});
