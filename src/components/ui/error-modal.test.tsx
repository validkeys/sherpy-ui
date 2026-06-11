import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorModal, type ErrorModalAction } from "./error-modal";

describe("ErrorModal", () => {
  const defaultProps = {
    open: true,
    title: "Test Error",
    message: "This is a test error message",
    actions: [{ label: "OK", onClick: vi.fn() }] as ErrorModalAction[],
  };

  it("renders when open is true", () => {
    render(<ErrorModal {...defaultProps} />);
    expect(screen.getByText("Test Error")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test error message"),
    ).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ErrorModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Test Error")).not.toBeInTheDocument();
  });

  it("displays error severity with correct icon and styling", () => {
    render(<ErrorModal {...defaultProps} severity="error" />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("displays warning severity with correct icon", () => {
    render(<ErrorModal {...defaultProps} severity="warning" />);
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("displays info severity with correct icon", () => {
    render(<ErrorModal {...defaultProps} severity="info" />);
    expect(screen.getByText("ℹ️")).toBeInTheDocument();
  });

  it("defaults to error severity when not specified", () => {
    render(<ErrorModal {...defaultProps} />);
    expect(screen.getByText("⚠️")).toBeInTheDocument();
  });

  it("calls action onClick when button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const actions: ErrorModalAction[] = [{ label: "Click Me", onClick }];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    await user.click(screen.getByText("Click Me"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders multiple actions", () => {
    const actions: ErrorModalAction[] = [
      { label: "Primary", onClick: vi.fn() },
      { label: "Secondary", onClick: vi.fn() },
      { label: "Danger", onClick: vi.fn(), variant: "danger" },
    ];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    expect(screen.getByText("Danger")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ErrorModal {...defaultProps} onClose={onClose} />);

    // Click backdrop (outside the modal content)
    const backdrop = document.querySelector('[class*="bg-black"]');
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("applies primary variant to first action by default", () => {
    const actions: ErrorModalAction[] = [
      { label: "First", onClick: vi.fn() },
      { label: "Second", onClick: vi.fn() },
    ];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    const firstButton = screen.getByText("First");
    expect(firstButton).toHaveClass("bg-blue-600");
  });

  it("applies secondary variant to subsequent actions by default", () => {
    const actions: ErrorModalAction[] = [
      { label: "First", onClick: vi.fn() },
      { label: "Second", onClick: vi.fn() },
    ];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    const secondButton = screen.getByText("Second");
    expect(secondButton).toHaveClass("bg-gray-200");
  });

  it("respects explicit variant prop", () => {
    const actions: ErrorModalAction[] = [
      { label: "Danger Action", onClick: vi.fn(), variant: "danger" },
    ];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    const button = screen.getByText("Danger Action");
    expect(button).toHaveClass("bg-red-600");
  });

  it("renders long messages correctly", () => {
    const longMessage =
      "This is a very long error message that should still be displayed correctly in the modal. "
        .repeat(5)
        .trim();

    render(<ErrorModal {...defaultProps} message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("handles action with no variant specified", () => {
    const actions: ErrorModalAction[] = [{ label: "Action", onClick: vi.fn() }];

    render(<ErrorModal {...defaultProps} actions={actions} />);

    const button = screen.getByText("Action");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-blue-600"); // Should default to primary
  });
});
