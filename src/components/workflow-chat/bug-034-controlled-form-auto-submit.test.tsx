/**
 * BUG-034: Controlled Form Auto-Submit Test
 *
 * Tests the specific scenario where AnswerCard is controlled via formValues prop
 * and values are updated by parent (simulating machine context updates).
 */

import { render, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnswerCard } from "./AnswerCard";

describe("BUG-034: Controlled Form Auto-Submit", () => {
  it("should auto-submit when controlled formValues become complete", async () => {
    const mockOnSubmitForm = vi.fn();
    const mockOnFormValueChange = vi.fn();

    // Start with empty values
    const { rerender } = render(
      <AnswerCard
        formFields={[
          { id: "projectName", type: "text", label: "Project Name" },
          { id: "description", type: "text", label: "Description" },
        ]}
        formValues={{}}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        onFormValueChange={mockOnFormValueChange}
        disabled={false}
        isSubmitting={false}
      />,
    );

    // Initially empty - no submit
    expect(mockOnSubmitForm).not.toHaveBeenCalled();

    // Simulate machine context updating with partial values
    rerender(
      <AnswerCard
        formFields={[
          { id: "projectName", type: "text", label: "Project Name" },
          { id: "description", type: "text", label: "Description" },
        ]}
        formValues={{
          projectName: "My Project",
        }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        onFormValueChange={mockOnFormValueChange}
        disabled={false}
        isSubmitting={false}
      />,
    );

    // Still incomplete - no submit
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(mockOnSubmitForm).not.toHaveBeenCalled();

    // Simulate machine context updating with ALL values
    rerender(
      <AnswerCard
        formFields={[
          { id: "projectName", type: "text", label: "Project Name" },
          { id: "description", type: "text", label: "Description" },
        ]}
        formValues={{
          projectName: "My Project",
          description: "My Description",
        }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        onFormValueChange={mockOnFormValueChange}
        disabled={false}
        isSubmitting={false}
      />,
    );

    // Should auto-submit after 500ms delay
    await waitFor(
      () => {
        expect(mockOnSubmitForm).toHaveBeenCalledWith({
          projectName: "My Project",
          description: "My Description",
        });
      },
      { timeout: 1000 },
    );
  });

  it("should not auto-submit if isSubmitting=true", async () => {
    const mockOnSubmitForm = vi.fn();

    render(
      <AnswerCard
        formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
        formValues={{ field1: "value1" }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        disabled={false}
        isSubmitting={true} // Already submitting
      />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should not auto-submit if disabled=true", async () => {
    const mockOnSubmitForm = vi.fn();

    render(
      <AnswerCard
        formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
        formValues={{ field1: "value1" }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        disabled={true} // Disabled
        isSubmitting={false}
      />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(mockOnSubmitForm).not.toHaveBeenCalled();
  });

  it("should not auto-submit if onSubmitForm is undefined", async () => {
    const { container } = render(
      <AnswerCard
        formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
        formValues={{ field1: "value1" }}
        onSubmitForm={undefined} // No handler
        disabled={false}
        isSubmitting={false}
      />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Should not crash, just do nothing
    expect(container).toBeInTheDocument();
  });

  it("should auto-submit again if values change after first submit", async () => {
    const mockOnSubmitForm = vi.fn();

    const { rerender } = render(
      <AnswerCard
        formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
        formValues={{ field1: "value1" }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        disabled={false}
        isSubmitting={false}
      />,
    );

    // Wait for first auto-submit
    await waitFor(
      () => {
        expect(mockOnSubmitForm).toHaveBeenCalledWith({ field1: "value1" });
      },
      { timeout: 1000 },
    );

    mockOnSubmitForm.mockClear();

    // Change values
    rerender(
      <AnswerCard
        formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
        formValues={{ field1: "value2" }}
        onSubmitForm={mockOnSubmitForm}
        autoSubmit
        disabled={false}
        isSubmitting={false}
      />,
    );

    // Should auto-submit again with new values
    await waitFor(
      () => {
        expect(mockOnSubmitForm).toHaveBeenCalledWith({ field1: "value2" });
      },
      { timeout: 1000 },
    );
  });
});
