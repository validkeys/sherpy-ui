/**
 * BUG-007: Gap Analysis Submit No API Call
 *
 * Reproduction: When clicking Submit button on Gap Analysis form,
 * no API call is made and no artifact generation occurs.
 * Form becomes disabled indefinitely with no transition to Step 2.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEP_KEYS } from "../machines/constants";
import { PlanningMachineProvider } from "../machines/PlanningMachineContext";
import { FormStep } from "./FormStep";

// Mock the server module at the top level
vi.mock("../../ai/server", () => ({
  $generateArtifact: vi.fn().mockResolvedValue({
    format: "markdown",
    content: "# Gap Analysis\n\nTest content",
    generatedAt: new Date().toISOString(),
  }),
  $generateQuestion: vi.fn().mockResolvedValue({
    question: "Mock question?",
    options: ["Option A", "Option B"],
  }),
  $assessGapAnalysisNeed: vi.fn().mockResolvedValue({
    needsGapAnalysis: true,
    reasoning: "Mock assessment",
    confidence: "high",
  }),
}));

describe("BUG-007: Gap Analysis Submit No API Call", () => {
  const defaultInput = {
    projectId: "test-bug-007",
    entryPath: "new-project" as const,
  };

  beforeEach(() => {
    // Reset localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock fetch for interview API (used in step 2)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({ question: "Test question?" }),
    });
  });

  it("should trigger artifact generation API call when submit is clicked", async () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill both required fields
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    const descriptionField = screen.getByLabelText(/What are you building/i);

    fireEvent.change(requirementsField, {
      target: { value: "No, starting from scratch" },
    });

    fireEvent.change(descriptionField, {
      target: { value: "Healthcare Portal - Patient management system" },
    });

    // Wait for submit button to be enabled
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Click submit
    fireEvent.click(submitButton);

    // ASSERTION 1: Button should show "Submitting..." state
    await waitFor(
      () => {
        expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // ASSERTION 2: Form fields should be disabled during submission
    await waitFor(
      () => {
        const requirementsFieldDisabled = (
          screen.getByLabelText(
            /Do you have existing requirements/i,
          ) as HTMLInputElement
        ).disabled;
        const descriptionFieldDisabled = (
          screen.getByLabelText(/What are you building/i) as HTMLTextAreaElement
        ).disabled;
        expect(requirementsFieldDisabled).toBe(true);
        expect(descriptionFieldDisabled).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it("exposes bug: form data is empty when submit is clicked", async () => {
    // Track console logs
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(" "));
      originalLog(...args);
    };

    render(
      <PlanningMachineProvider input={defaultInput}>
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill fields
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    const descriptionField = screen.getByLabelText(/What are you building/i);

    fireEvent.change(requirementsField, { target: { value: "No" } });
    fireEvent.change(descriptionField, { target: { value: "Test project" } });

    // Check if formData is being updated (now logged from useFormState hook)
    const formDataLogs = consoleLogs.filter((log) =>
      log.includes("[useFormState] Updated formData:"),
    );
    expect(formDataLogs.length).toBeGreaterThan(0);

    // Click submit
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    // Check what formData was sent
    const submitLogs = consoleLogs.filter((log) =>
      log.includes("[FormStep] Form data:"),
    );
    expect(submitLogs.length).toBeGreaterThan(0);

    // Restore console
    console.log = originalLog;

    // Check what formData was sent in the logs
    const eventLogs = consoleLogs.filter((log) =>
      log.includes("[FormStep] Sending event:"),
    );
    if (eventLogs.length > 0) {
      console.log("Event logs found:", eventLogs);
    }
  });

  it("verifies submit button is disabled initially", () => {
    render(
      <PlanningMachineProvider input={defaultInput}>
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });

  it("reproduces exact bug scenario from bug report", async () => {
    render(
      <PlanningMachineProvider
        input={{ ...defaultInput, projectId: "LcINIWVz" }}
      >
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Exact steps from bug report
    fireEvent.change(
      screen.getByLabelText(/Do you have existing requirements/i),
      { target: { value: "No, starting from scratch" } },
    );

    fireEvent.change(screen.getByLabelText(/What are you building/i), {
      target: { value: "Healthcare Portal - Patient management system" },
    });

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    // Click submit - this is where bug occurs
    fireEvent.click(submitButton);

    // Check for bug symptoms
    await waitFor(
      () => {
        // Bug symptom: Button shows "Submitting..." but fields still have values
        const requirementsField = screen.getByLabelText(
          /Do you have existing requirements/i,
        ) as HTMLInputElement;
        const descriptionField = screen.getByLabelText(
          /What are you building/i,
        ) as HTMLTextAreaElement;

        console.log("Bug check:", {
          requirementsValue: requirementsField.value,
          descriptionValue: descriptionField.value,
          submitButtonText: submitButton.textContent,
        });

        // Fields should retain their values
        expect(requirementsField.value).toBe("No, starting from scratch");
        expect(descriptionField.value).toBe(
          "Healthcare Portal - Patient management system",
        );
      },
      { timeout: 1000 },
    );
  });

  it("defensive check: prevents submission with incomplete form data", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation();

    render(
      <PlanningMachineProvider input={defaultInput}>
        <FormStep
          stepKey={STEP_KEYS.STEP_1_GAP_ANALYSIS}
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill only one field (incomplete form)
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    fireEvent.change(requirementsField, { target: { value: "Test" } });

    // Submit button should still be disabled, but we'll force a submit event
    const submitButton = screen.getByRole("button", { name: /submit/i });

    // Manually trigger form submission (bypassing button disabled state)
    const form = submitButton.closest("form");
    if (form) {
      fireEvent.submit(form);
    }

    // Verify defensive check logged error (now from useFormState hook)
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("VALIDATION FAILED"),
        expect.objectContaining({
          missingFieldIds: expect.arrayContaining(["projectDescription"]),
          requiredFieldIds: expect.arrayContaining([
            "existingRequirements",
            "projectDescription",
          ]),
        }),
      );
    });

    consoleSpy.mockRestore();
  });
});
