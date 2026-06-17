/**
 * BUG-035 Regression Test: Step 1 form should NOT auto-submit
 *
 * Problem: Step 1 manual form auto-submitted after filling one field
 * instead of requiring the Submit button click.
 *
 * Root Cause: Auto-submit logic applied to ALL forms regardless of mode.
 * Fix: Added autoSubmit prop (default false). Only interview-mode questions
 * (Steps 2/3) pass autoSubmit={true}. Manual forms (Steps 1/5) use default
 * false and require explicit Submit button click.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerCard } from "./AnswerCard";

const formFields = [
  {
    id: "projectName",
    label: "Project name",
    type: "text" as const,
  },
];

describe("BUG-035: Manual forms must not auto-submit (timing)", () => {
  const mockOnSubmitForm = vi.fn();
  const mockOnFormValueChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should NOT auto-submit when autoSubmit prop is omitted (default)", () => {
    render(
      <AnswerCard
        formFields={formFields}
        formValues={{ projectName: "My Project" }}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    vi.advanceTimersByTime(2000);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should NOT auto-submit when autoSubmit={false}", () => {
    render(
      <AnswerCard
        formFields={formFields}
        formValues={{ projectName: "My Project" }}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit={false}
      />,
    );

    vi.advanceTimersByTime(2000);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should NOT auto-submit multi-field Step 1 form even when all fields filled", () => {
    const multiFields = [
      { id: "projectName", label: "Project name", type: "text" as const },
      { id: "summary", label: "Summary", type: "textarea" as const },
    ];

    render(
      <AnswerCard
        formFields={multiFields}
        formValues={{
          projectName: "Test Project",
          summary: "A summary",
        }}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    vi.advanceTimersByTime(2000);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should auto-submit when autoSubmit={true} (interview mode)", () => {
    const { rerender } = render(
      <AnswerCard
        formFields={formFields}
        formValues={{}}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
      />,
    );

    expect(mockOnSubmitForm).not.toHaveBeenCalled();

    rerender(
      <AnswerCard
        formFields={formFields}
        formValues={{ projectName: "My Project" }}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
      />,
    );

    vi.advanceTimersByTime(600);

    expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
    expect(mockOnSubmitForm).toHaveBeenCalledWith({
      projectName: "My Project",
    });
  });
});

describe("BUG-035: Manual submit button works when autoSubmit is false", () => {
  it("should submit via Submit button click", async () => {
    const user = userEvent.setup();
    const mockOnSubmitForm = vi.fn();

    render(
      <AnswerCard
        formFields={formFields}
        formValues={{ projectName: "My Project" }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit={false}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Submit answer" });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
    expect(mockOnSubmitForm).toHaveBeenCalledWith({
      projectName: "My Project",
    });
  });
});
