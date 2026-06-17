/**
 * BUG-034 Regression Test: Auto-submit validation with controlled formValues
 *
 * Root Cause: canSubmitForm was calculated inline instead of memoized,
 * so it didn't recalculate when formValues prop changed, preventing auto-submit
 * from triggering even when all fields were filled.
 *
 * Fix: Wrapped canSubmitForm in useMemo with proper dependencies.
 */

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerCard } from "./AnswerCard";

describe("BUG-034: Auto-submit with controlled formValues", () => {
  const mockOnSubmitForm = vi.fn();
  const mockOnFormValueChange = vi.fn();

  const formFields = [
    {
      id: "existingRequirements",
      label: "Do you have existing requirements?",
      type: "text" as const,
    },
    {
      id: "projectDescription",
      label: "What are you building?",
      type: "textarea" as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should NOT auto-submit when formValues prop is empty", async () => {
    const emptyFormValues = {};

    render(
      <AnswerCard
        formFields={formFields}
        formValues={emptyFormValues}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Wait for any potential auto-submit (shouldn't happen)
    vi.advanceTimersByTime(600);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should auto-submit when formValues prop is filled (controlled mode)", async () => {
    const filledFormValues = {
      existingRequirements: "No",
      projectDescription: "A test project",
    };

    const { rerender } = render(
      <AnswerCard
        formFields={formFields}
        formValues={{}}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Simulate machine context update by re-rendering with filled values
    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={filledFormValues}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    // Advance past the 500ms auto-submit delay
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockOnSubmitForm).toHaveBeenCalledWith(filledFormValues);
    expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
  });

  it("should recalculate canSubmitForm when formValues changes from empty to partial", async () => {
    const partialFormValues = {
      existingRequirements: "Yes",
      projectDescription: "", // Still empty
    };

    const { rerender } = render(
      <AnswerCard
        formFields={formFields}
        formValues={{}}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Update to partial values
    rerender(
      <AnswerCard
        formFields={formFields}
        formValues={partialFormValues}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Should NOT auto-submit with partial data
    vi.advanceTimersByTime(600);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should recalculate canSubmitForm when formValues changes from partial to complete", async () => {
    const partialFormValues = {
      existingRequirements: "Yes",
      projectDescription: "",
    };

    const completeFormValues = {
      existingRequirements: "Yes",
      projectDescription: "A complete description",
    };

    const { rerender } = render(
      <AnswerCard
        formFields={formFields}
        formValues={partialFormValues}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Update to complete values
    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={completeFormValues}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    // Should auto-submit with complete data
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(mockOnSubmitForm).toHaveBeenCalledWith(completeFormValues);
    expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
  });

  it("should handle rapid formValues updates with debounce behavior", async () => {
    const { rerender } = render(
      <AnswerCard
        formFields={formFields}
        formValues={{}}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    // Simulate rapid updates (typing) - each update resets the 500ms timer
    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={{ existingRequirements: "Y", projectDescription: "" }}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(100); // Timer at 100ms
    });

    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={{ existingRequirements: "Yes", projectDescription: "" }}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(100); // Timer at 200ms
    });

    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={{ existingRequirements: "Yes", projectDescription: "A" }}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(100); // Timer at 300ms
    });

    // Final complete state - this resets timer to 0
    act(() => {
      rerender(
        <AnswerCard
          formFields={formFields}
          formValues={{
            existingRequirements: "Yes",
            projectDescription: "A test",
          }}
          onFormValueChange={mockOnFormValueChange}
          onSubmitForm={mockOnSubmitForm}
        />,
      );
    });

    // Now advance the full 500ms from the last update
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Should only submit once with final values
    expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
    expect(mockOnSubmitForm).toHaveBeenCalledWith({
      existingRequirements: "Yes",
      projectDescription: "A test",
    });
  });

  it("should not auto-submit when disabled prop is true", async () => {
    const filledFormValues = {
      existingRequirements: "No",
      projectDescription: "A test project",
    };

    render(
      <AnswerCard
        formFields={formFields}
        formValues={filledFormValues}
        disabled={true}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    vi.advanceTimersByTime(600);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should not auto-submit when isSubmitting prop is true", async () => {
    const filledFormValues = {
      existingRequirements: "No",
      projectDescription: "A test project",
    };

    render(
      <AnswerCard
        formFields={formFields}
        formValues={filledFormValues}
        isSubmitting={true}
        onFormValueChange={mockOnFormValueChange}
        onSubmitForm={mockOnSubmitForm}
      />,
    );

    vi.advanceTimersByTime(600);

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });
});
