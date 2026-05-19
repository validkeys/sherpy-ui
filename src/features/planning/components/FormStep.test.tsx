/**
 * FormStep Component Tests
 * Tests FormStep for steps 1 (Gap Analysis) and 5 (Implementation Planner)
 */

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PlanningStateBuilder } from "../../../../tests/fixtures/builders/PlanningStateBuilder";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { FormStep } from "./FormStep";

describe("FormStep", () => {
  describe("Step 1 - Gap Analysis", () => {
    const step1Props = {
      stepKey: "step1_gapAnalysis",
      stepName: "Gap Analysis",
      status: "active",
    };

    const renderStep1 = () => {
      const context = PlanningStateBuilder.new().build();
      return render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step1Props} />
        </PlanningMachineProvider>,
      );
    };

    it("renders step name", () => {
      renderStep1();
      expect(
        screen.getByRole("heading", { name: /gap analysis/i }),
      ).toBeDefined();
    });

    it("renders step 1 form fields", () => {
      renderStep1();
      expect(
        screen.getByLabelText(/do you have existing requirements/i),
      ).toBeDefined();
      expect(screen.getByLabelText(/what are you building/i)).toBeDefined();
    });

    it("renders textarea for project description", () => {
      renderStep1();
      const textarea = screen.getByLabelText(/what are you building/i);
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea.getAttribute("rows")).toBe("5");
    });

    it("renders text input for existing requirements", () => {
      renderStep1();
      const input = screen.getByLabelText(/do you have existing requirements/i);
      expect(input.tagName).toBe("INPUT");
      expect(input.getAttribute("type")).toBe("text");
    });

    it("handles input changes", async () => {
      const user = userEvent.setup();
      renderStep1();

      const input = screen.getByLabelText(
        /do you have existing requirements/i,
      ) as HTMLInputElement;
      await user.type(input, "Yes, we have PRD");

      expect(input.value).toBe("Yes, we have PRD");
    });

    it("handles textarea changes", async () => {
      const user = userEvent.setup();
      renderStep1();

      const textarea = screen.getByLabelText(
        /what are you building/i,
      ) as HTMLTextAreaElement;
      await user.type(textarea, "A new planning tool");

      expect(textarea.value).toBe("A new planning tool");
    });

    it("disables submit button when form invalid", () => {
      renderStep1();
      const submitButton = screen.getByRole("button", {
        name: /submit/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it("enables submit button when form valid", async () => {
      const user = userEvent.setup();
      renderStep1();

      const input = screen.getByLabelText(/do you have existing requirements/i);
      const textarea = screen.getByLabelText(/what are you building/i);

      await user.type(input, "Yes");
      await user.type(textarea, "Test project");

      await waitFor(() => {
        const submitButton = screen.getByRole("button", {
          name: /submit/i,
        }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(false);
      });
    });

    it("shows loading state during submission", () => {
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step1Props} status="submitting" />
        </PlanningMachineProvider>,
      );

      const submitButton = screen.getByRole("button", {
        name: /submitting/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it("disables inputs during submission", () => {
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step1Props} status="submitting" />
        </PlanningMachineProvider>,
      );

      const input = screen.getByLabelText(
        /do you have existing requirements/i,
      ) as HTMLInputElement;
      const textarea = screen.getByLabelText(
        /what are you building/i,
      ) as HTMLTextAreaElement;

      expect(input.disabled).toBe(true);
      expect(textarea.disabled).toBe(true);
    });
  });

  describe("Step 5 - Implementation Planner", () => {
    const step5Props = {
      stepKey: "step5_implPlanner",
      stepName: "Implementation Planner",
      status: "active",
    };

    const renderStep5 = () => {
      const context = PlanningStateBuilder.atStep(5)
        .completeStep(1)
        .completeStep(2)
        .completeStep(3)
        .completeStep(4)
        .build();

      return render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step5Props} />
        </PlanningMachineProvider>,
      );
    };

    it("renders step name", () => {
      renderStep5();
      expect(
        screen.getByRole("heading", { name: /implementation planner/i }),
      ).toBeDefined();
    });

    it("renders step 5 form fields", () => {
      renderStep5();
      expect(
        screen.getByLabelText(/what is the deployment strategy/i),
      ).toBeDefined();
      expect(screen.getByLabelText(/what is the tech stack/i)).toBeDefined();
    });

    it("renders select dropdown for deployment strategy", () => {
      renderStep5();
      const select = screen.getByLabelText(/what is the deployment strategy/i);
      expect(select.tagName).toBe("SELECT");
    });

    it("renders select options", () => {
      renderStep5();
      const select = screen.getByLabelText(/what is the deployment strategy/i);
      const options = Array.from(select.querySelectorAll("option")).map(
        (opt) => opt.textContent,
      );

      expect(options).toContain("Cloud");
      expect(options).toContain("On-Premise");
      expect(options).toContain("Hybrid");
      expect(options).toContain("Not Decided");
    });

    it("handles select changes", async () => {
      const user = userEvent.setup();
      renderStep5();

      const select = screen.getByLabelText(
        /what is the deployment strategy/i,
      ) as HTMLSelectElement;
      await user.selectOptions(select, "Cloud");

      expect(select.value).toBe("Cloud");
    });

    it("handles text input changes", async () => {
      const user = userEvent.setup();
      renderStep5();

      const input = screen.getByLabelText(
        /what is the tech stack/i,
      ) as HTMLInputElement;
      await user.type(input, "React, Node.js");

      expect(input.value).toBe("React, Node.js");
    });

    it("validates empty select values", () => {
      renderStep5();
      const submitButton = screen.getByRole("button", {
        name: /submit/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it("enables submit when all fields valid", async () => {
      const user = userEvent.setup();
      renderStep5();

      const select = screen.getByLabelText(/what is the deployment strategy/i);
      const input = screen.getByLabelText(/what is the tech stack/i);

      await user.selectOptions(select, "Cloud");
      await user.type(input, "React");

      await waitFor(() => {
        const submitButton = screen.getByRole("button", {
          name: /submit/i,
        }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(false);
      });
    });
  });

  describe("Form submission", () => {
    const step1Props = {
      stepKey: "step1_gapAnalysis",
      stepName: "Gap Analysis",
      status: "active",
    };

    it("prevents submission with invalid form", async () => {
      const user = userEvent.setup();
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step1Props} />
        </PlanningMachineProvider>,
      );

      const submitButton = screen.getByRole("button", {
        name: /submit/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);

      // Try to submit (button should be disabled)
      await user.click(submitButton);

      // Should not submit
      expect(submitButton.disabled).toBe(true);
    });

    it("handles form submission with valid data", async () => {
      const user = userEvent.setup();
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep {...step1Props} />
        </PlanningMachineProvider>,
      );

      const input = screen.getByLabelText(/do you have existing requirements/i);
      const textarea = screen.getByLabelText(/what are you building/i);

      await user.type(input, "Yes");
      await user.type(textarea, "Test project");

      await waitFor(() => {
        const submitButton = screen.getByRole("button", {
          name: /submit/i,
        }) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(false);
      });

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      // Form should remain on screen (machine handles state transition)
      expect(
        screen.getByRole("heading", { name: /gap analysis/i }),
      ).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("handles generatingArtifact status", () => {
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="generatingArtifact"
          />
        </PlanningMachineProvider>,
      );

      const submitButton = screen.getByRole("button", {
        name: /submitting/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it("rejects whitespace-only values", async () => {
      const user = userEvent.setup();
      const context = PlanningStateBuilder.new().build();
      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="active"
          />
        </PlanningMachineProvider>,
      );

      const input = screen.getByLabelText(/do you have existing requirements/i);
      const textarea = screen.getByLabelText(/what are you building/i);

      await user.type(input, "   ");
      await user.type(textarea, "   ");

      const submitButton = screen.getByRole("button", {
        name: /submit/i,
      }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe("BUG-011: Form data capture on submit", () => {
    it("should send SUBMIT_FORM event with form data to XState machine", async () => {
      const user = userEvent.setup();
      const context = PlanningStateBuilder.new().build();

      render(
        <PlanningMachineProvider
          input={{ projectId: context.projectId, entryPath: context.entryPath }}
          storageKey="test-bug-011-submit"
        >
          <FormStep
            stepKey="step1_gapAnalysis"
            stepName="Gap Analysis"
            status="active"
          />
        </PlanningMachineProvider>,
      );

      const input = screen.getByLabelText(
        /do you have existing requirements/i,
      ) as HTMLInputElement;
      const textarea = screen.getByLabelText(
        /what are you building/i,
      ) as HTMLTextAreaElement;

      // Fill form
      await user.type(input, "No, starting from scratch");
      await user.type(textarea, "A healthcare portal for patient records");

      // Verify form values
      expect(input.value).toBe("No, starting from scratch");
      expect(textarea.value).toBe("A healthcare portal for patient records");

      // Get global actor before submit
      const actor = (window as any).__planningActor;
      if (actor) {
        const stateBefore = actor.getSnapshot();
        console.log("[BUG-011 TEST] State before submit:", {
          value: stateBefore.value,
          step1Responses: stateBefore.context.step1Responses,
        });
        expect(stateBefore.context.step1Responses).toEqual({});
      }

      // Submit form
      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      // Check state after submit
      await waitFor(
        () => {
          const actor = (window as any).__planningActor;
          if (actor) {
            const stateAfter = actor.getSnapshot();
            console.log("[BUG-011 TEST] State after submit:", {
              value: stateAfter.value,
              step1Responses: stateAfter.context.step1Responses,
            });

            // BUG-011: step1Responses should contain form data
            expect(stateAfter.context.step1Responses).toHaveProperty(
              "existingRequirements",
            );
            expect(stateAfter.context.step1Responses).toHaveProperty(
              "projectDescription",
            );
            expect(stateAfter.context.step1Responses.existingRequirements).toBe(
              "No, starting from scratch",
            );
            expect(stateAfter.context.step1Responses.projectDescription).toBe(
              "A healthcare portal for patient records",
            );

            // Machine should transition from 'collecting' to 'submitting'
            expect(stateAfter.value).not.toEqual({
              step1_gapAnalysis: "collecting",
            });
          }
        },
        { timeout: 1000 },
      );
    });
  });
});
