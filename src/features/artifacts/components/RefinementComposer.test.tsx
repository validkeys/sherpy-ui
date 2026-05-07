import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RefinementComposer } from "./RefinementComposer";

describe("RefinementComposer", () => {
  it("renders with input and buttons", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
    );

    expect(
      screen.getByPlaceholderText(
        "Describe how you want to refine this artifact...",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refine" })).toBeInTheDocument();
  });

  it("calls onSubmit with instruction when form is submitted", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Describe how you want to refine this artifact...",
    );
    const submitButton = screen.getByRole("button", { name: "Refine" });

    fireEvent.change(input, {
      target: { value: "Make acceptance criteria more specific" },
    });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      "Make acceptance criteria more specific",
    );
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables submit button when input is empty", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Refine" });
    expect(submitButton).toBeDisabled();
  });

  it("trims whitespace from instruction", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={false}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Describe how you want to refine this artifact...",
    );
    const submitButton = screen.getByRole("button", { name: "Refine" });

    fireEvent.change(input, { target: { value: "  test instruction  " } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith("test instruction");
  });

  it("disables all controls when loading", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={true}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Describe how you want to refine this artifact...",
    );
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const submitButton = screen.getByRole("button", { name: "Refining..." });

    expect(input).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it("shows loading state on submit button", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <RefinementComposer
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Refining..." }),
    ).toBeInTheDocument();
  });
});
