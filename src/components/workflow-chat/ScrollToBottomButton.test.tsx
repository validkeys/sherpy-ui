import { fireEvent, render, screen } from "@testing-library/react";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

describe("ScrollToBottomButton", () => {
  it("should not render when visible is false", () => {
    render(<ScrollToBottomButton onClick={vi.fn()} visible={false} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render when visible is true", () => {
    const mockOnClick = vi.fn();
    render(<ScrollToBottomButton onClick={mockOnClick} visible={true} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Scroll to bottom");
  });

  it("should call onClick when clicked", () => {
    const mockOnClick = vi.fn();
    render(<ScrollToBottomButton onClick={mockOnClick} visible={true} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should display new message count badge", () => {
    const mockOnClick = vi.fn();
    render(
      <ScrollToBottomButton
        onClick={mockOnClick}
        visible={true}
        newMessageCount={5}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Scroll to bottom (5 new messages)",
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display 99+ for message counts over 99", () => {
    const mockOnClick = vi.fn();
    render(
      <ScrollToBottomButton
        onClick={mockOnClick}
        visible={true}
        newMessageCount={150}
      />,
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("should not display badge for zero messages", () => {
    const mockOnClick = vi.fn();
    render(
      <ScrollToBottomButton
        onClick={mockOnClick}
        visible={true}
        newMessageCount={0}
      />,
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
