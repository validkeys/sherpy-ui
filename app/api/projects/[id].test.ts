import { describe, it, expect, beforeEach } from "vitest";
import {
  createProject,
  updateCurrentStep,
  _resetStore,
  initStore,
} from "@/features/projects/store";

function validateUpdateProjectStep(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("invalid input");
  }
  const input = data as Record<string, unknown>;
  if (input.currentStep === undefined) {
    throw new Error("currentStep required");
  }
  if (typeof input.currentStep !== "number") {
    throw new Error("currentStep must be a number");
  }
  return { currentStep: input.currentStep };
}

describe("PUT /api/projects/[id] validator", () => {
  it("accepts valid input", () => {
    const result = validateUpdateProjectStep({ currentStep: 2 });
    expect(result).toEqual({ currentStep: 2 });
  });

  it("throws on null input", () => {
    expect(() => validateUpdateProjectStep(null)).toThrow("invalid input");
  });

  it("throws on missing currentStep", () => {
    expect(() => validateUpdateProjectStep({})).toThrow(
      "currentStep required",
    );
  });

  it("throws on non-number currentStep", () => {
    expect(() => validateUpdateProjectStep({ currentStep: "2" })).toThrow(
      "currentStep must be a number",
    );
  });
});

describe("PUT /api/projects/[id] (store delegate)", () => {
  beforeEach(async () => {
    _resetStore();
    await initStore();
  });

  it("updates currentStep for valid project", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });
    const initialTimestamp = project.lastTouchedAt;

    const updated = updateCurrentStep(project.id, 2);

    expect(updated.id).toBe(project.id);
    expect(updated.currentStep).toBe(2);
    expect(updated.lastTouchedAt).not.toBe(initialTimestamp);
  });

  it("throws on invalid step number (zero)", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });

    expect(() => updateCurrentStep(project.id, 0)).toThrow(
      "Invalid step number: 0",
    );
  });

  it("throws on invalid step number (negative)", () => {
    const project = createProject({ name: "Test Project", entryPath: "scratch" });

    expect(() => updateCurrentStep(project.id, -1)).toThrow("Invalid step");
  });

  it("throws on non-existent project", () => {
    expect(() => updateCurrentStep("nonexistent-id", 2)).toThrow(
      "Project not found: nonexistent-id",
    );
  });
});
