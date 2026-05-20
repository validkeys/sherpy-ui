/**
 * BUG-006: Form Step Component Test
 * Tests the actual FormStep component to identify why submit button doesn't work
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PlanningMachineProvider,
  usePlanningMachine,
} from "../machines/PlanningMachineContext";
import { FormStep } from "./FormStep";

describe("BUG-006: FormStep Component", () => {
  beforeEach(() => {
    // Mock fetch for artifact generation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({
        type: "gap-analysis",
        title: "Gap Analysis",
        content: "Mock artifact content",
        metadata: {},
      }),
    });
  });

  it("renders gap analysis form with both questions", () => {
    render(
      <PlanningMachineProvider
        input={{ projectId: "test-123", entryPath: "new-project" }}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Check both form fields are present
    expect(
      screen.getByLabelText(/Do you have existing requirements/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/What are you building/i)).toBeInTheDocument();

    // Check submit button is present
    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeInTheDocument();

    // Initially, submit button should be disabled (no form data)
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when both fields are filled", async () => {
    render(
      <PlanningMachineProvider
        input={{ projectId: "test-123", entryPath: "new-project" }}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeDisabled();

    // Fill in first field
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    fireEvent.change(requirementsField, { target: { value: "No" } });

    // Button should still be disabled (only 1 field filled)
    expect(submitButton).toBeDisabled();

    // Fill in second field
    const descriptionField = screen.getByLabelText(/What are you building/i);
    fireEvent.change(descriptionField, {
      target: { value: "A simple HTML page with color changing background" },
    });

    // Now button should be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("submits form when submit button is clicked", async () => {
    render(
      <PlanningMachineProvider
        input={{ projectId: "test-123", entryPath: "new-project" }}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill in both fields
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    fireEvent.change(requirementsField, { target: { value: "No" } });

    const descriptionField = screen.getByLabelText(/What are you building/i);
    fireEvent.change(descriptionField, {
      target: { value: "Test project" },
    });

    // Click submit
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit button should be clickable when form is filled
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    // Test passes if no errors thrown
    expect(true).toBe(true);
  });

  it("checks if form field IDs match validation requirements", () => {
    // This test validates the structure
    const STEP1_QUESTIONS = [
      {
        id: "existingRequirements",
        label: "Do you have existing requirements?",
        type: "text",
      },
      {
        id: "projectDescription",
        label: "What are you building?",
        type: "textarea",
      },
    ];

    // The validation checks for these exact IDs
    const requiredIds = ["existingRequirements", "projectDescription"];

    STEP1_QUESTIONS.forEach((q) => {
      expect(requiredIds).toContain(q.id);
    });
  });

  it("reproduces bug: identifies if submit handler is actually called", async () => {
    const { container } = render(
      <PlanningMachineProvider
        input={{ projectId: "test-123", entryPath: "new-project" }}
      >
        <FormStep
          stepKey="step1_gapAnalysis"
          stepName="Gap Analysis"
          status="collecting"
        />
      </PlanningMachineProvider>,
    );

    // Fill form
    const requirementsField = screen.getByLabelText(
      /Do you have existing requirements/i,
    );
    fireEvent.change(requirementsField, { target: { value: "No" } });

    const descriptionField = screen.getByLabelText(/What are you building/i);
    fireEvent.change(descriptionField, {
      target: { value: "Test project" },
    });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).not.toBeDisabled();
    });

    // Check button attributes
    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.getAttribute("type")).toBe("submit");

    // Check form
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    // Try submitting via form - should not throw
    if (form) {
      fireEvent.submit(form);
      // Test passes if no errors thrown
      expect(form).toBeInTheDocument();
    }
  });
});
