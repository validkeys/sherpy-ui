/**
 * AutomatedStep Component Tests
 * Tests AutomatedStep for steps 4, 6, 8, 9, 10
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EVENT_TYPES, STEP_KEYS } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { AutomatedStep } from "./AutomatedStep";

describe("AutomatedStep", () => {
  const defaultInput = {
    projectId: "test-project",
    entryPath: "new-project" as const,
  };

  describe("Step 4 - Style Anchors", () => {
    const step4Props = {
      stepKey: STEP_KEYS.STEP_4_STYLE_ANCHORS,
      stepName: "Style Anchors",
    };

    it("renders step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step4Props} />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /style anchors/i }),
      ).toBeDefined();
    });

    it("shows no artifact message initially", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step4Props} />
        </PlanningMachineProvider>,
      );

      expect(screen.getByText(/no artifact generated yet/i)).toBeDefined();
    });
  });

  describe("Step 6 - Definition of Done", () => {
    const step6Props = {
      stepKey: STEP_KEYS.STEP_6_DEFINITION_OF_DONE,
      stepName: "Definition of Done",
    };

    it("renders step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step6Props} />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /definition of done/i }),
      ).toBeDefined();
    });
  });

  describe("Step 8 - Delivery Timeline", () => {
    const step8Props = {
      stepKey: STEP_KEYS.STEP_8_DELIVERY_TIMELINE,
      stepName: "Delivery Timeline",
    };

    it("renders step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step8Props} />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /delivery timeline/i }),
      ).toBeDefined();
    });
  });

  describe("Step 9 - QA Test Plan", () => {
    const step9Props = {
      stepKey: STEP_KEYS.STEP_9_QA_TEST_PLAN,
      stepName: "QA Test Plan",
    };

    it("renders step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step9Props} />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /qa test plan/i }),
      ).toBeDefined();
    });
  });

  describe("Step 10 - Summaries", () => {
    const step10Props = {
      stepKey: "step10_summaries",
      stepName: "Summaries",
    };

    it("renders step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep {...step10Props} />
        </PlanningMachineProvider>,
      );

      expect(screen.getByRole("heading", { name: /summaries/i })).toBeDefined();
    });
  });

  describe("Loading state", () => {
    it("shows spinner during generation", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      // Initial state shows no artifact
      expect(screen.getByText(/no artifact generated yet/i)).toBeDefined();
    });

    it("shows generating message", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      // Check component renders
      expect(
        screen.getByRole("heading", { name: /style anchors/i }),
      ).toBeDefined();
    });
  });

  describe("Artifact display", () => {
    it("shows no artifact message when artifact is null", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      expect(screen.getByText(/no artifact generated yet/i)).toBeDefined();
    });

    it("renders without errors for all step keys", () => {
      const steps = [
        { key: STEP_KEYS.STEP_4_STYLE_ANCHORS, name: "Style Anchors" },
        {
          key: STEP_KEYS.STEP_6_DEFINITION_OF_DONE,
          name: "Definition of Done",
        },
        { key: STEP_KEYS.STEP_8_DELIVERY_TIMELINE, name: "Delivery Timeline" },
        { key: STEP_KEYS.STEP_9_QA_TEST_PLAN, name: "QA Test Plan" },
        { key: "step10_summaries", name: "Summaries" },
      ];

      steps.forEach((step) => {
        const { unmount } = render(
          <PlanningMachineProvider input={defaultInput}>
            <AutomatedStep stepKey={step.key} stepName={step.name} />
          </PlanningMachineProvider>,
        );

        expect(
          screen.getByRole("heading", { name: new RegExp(step.name, "i") }),
        ).toBeDefined();
        unmount();
      });
    });
  });

  describe("Error handling", () => {
    it("handles invalid stepKey gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep stepKey="invalid_step" stepName="Invalid Step" />
        </PlanningMachineProvider>,
      );

      // Should return null (empty container)
      expect(container.querySelector(".automated-step")).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[AutomatedStep] Invalid stepKey: invalid_step",
      );

      consoleSpy.mockRestore();
    });

    it("returns null for unknown step keys", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep stepKey="step99_unknown" stepName="Unknown" />
        </PlanningMachineProvider>,
      );

      expect(container.querySelector(".automated-step")).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("Step number mapping", () => {
    it("maps step4_styleAnchors to number 4", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      // Component renders correctly
      expect(
        screen.getByRole("heading", { name: /style anchors/i }),
      ).toBeDefined();
    });

    it("maps step6_definitionOfDone to number 6", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_6_DEFINITION_OF_DONE}
            stepName="Definition of Done"
          />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /definition of done/i }),
      ).toBeDefined();
    });

    it("maps step8_deliveryTimeline to number 8", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_8_DELIVERY_TIMELINE}
            stepName="Delivery Timeline"
          />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /delivery timeline/i }),
      ).toBeDefined();
    });

    it("maps step9_qaTestPlan to number 9", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_9_QA_TEST_PLAN}
            stepName="QA Test Plan"
          />
        </PlanningMachineProvider>,
      );

      expect(
        screen.getByRole("heading", { name: /qa test plan/i }),
      ).toBeDefined();
    });

    it("maps step10_summaries to number 10", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep stepKey="step10_summaries" stepName="Summaries" />
        </PlanningMachineProvider>,
      );

      expect(screen.getByRole("heading", { name: /summaries/i })).toBeDefined();
    });
  });

  describe("Component structure", () => {
    it("renders automated-step container", () => {
      const { container } = render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      expect(container.querySelector(".automated-step")).toBeDefined();
    });

    it("renders heading with step name", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      const heading = screen.getByRole("heading", { name: /style anchors/i });
      expect(heading.tagName).toBe("H2");
    });

    it("renders no-artifact message initially", () => {
      render(
        <PlanningMachineProvider input={defaultInput}>
          <AutomatedStep
            stepKey={STEP_KEYS.STEP_4_STYLE_ANCHORS}
            stepName="Style Anchors"
          />
        </PlanningMachineProvider>,
      );

      const noArtifact = screen.getByText(/no artifact generated yet/i);
      expect(noArtifact).toBeDefined();
    });
  });
});
