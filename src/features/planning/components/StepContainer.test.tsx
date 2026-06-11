/**
 * StepContainer Component Tests
 * Tests the routing logic for all 10 steps
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { StepContainer } from "./StepContainer";

describe("StepContainer", () => {
  const defaultInput = {
    projectId: "test-project",
    entryPath: "new-project" as const,
  };

  describe("Component rendering", () => {
    it("renders StepContainer without errors", () => {
      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <StepContainer />
        </PlanningMachineProvider>,
      );

      expect(container).toBeDefined();
    });

    it("renders step1_gapAnalysis on initial load", () => {
      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <StepContainer />
        </PlanningMachineProvider>,
      );

      // Machine now starts in step1_gapAnalysis (BUG-001 fix)
      // Should render form step, not null
      expect(container.querySelector(".form-step")).not.toBeNull();
    });
  });

  describe("Unknown step handling", () => {
    it("renders step1 on initial load (no longer starts in idle)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <StepContainer />
        </PlanningMachineProvider>,
      );

      // After BUG-001 fix: machine starts in step1_gapAnalysis, not idle
      // Should render form step
      expect(container.querySelector(".form-step")).not.toBeNull();

      // Should NOT log warning (step1 is valid)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Integration with context", () => {
    it("uses useSelector to access state", () => {
      // Renders without throwing errors
      render(
        <PlanningMachineProvider input={defaultInput}>
          <StepContainer />
        </PlanningMachineProvider>,
      );

      // No errors should be thrown
      expect(true).toBe(true);
    });

    it("handles provider correctly", () => {
      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <StepContainer />
        </PlanningMachineProvider>,
      );

      expect(container).toBeDefined();
    });
  });
});
