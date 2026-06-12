import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveRegion } from "./live-region";

describe("LiveRegion", () => {
  describe("ARIA attributes", () => {
    it("renders with aria-live=polite by default", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-live", "polite");
    });

    it("renders with aria-live=assertive when priority is assertive", () => {
      render(<LiveRegion priority="assertive">Error message</LiveRegion>);
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-live", "assertive");
    });

    it("includes aria-atomic=true for complete announcements", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-atomic", "true");
    });

    it("has role=status for WCAG 4.1.3 compliance", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      const region = screen.getByRole("status");
      expect(region).toBeInTheDocument();
    });
  });

  describe("Visual hiding", () => {
    it("applies screen-reader-only class", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      const region = screen.getByRole("status");
      expect(region).toHaveClass("sr-only");
    });

    it("content is in the document for screen readers", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      expect(screen.getByText("Test announcement")).toBeInTheDocument();
    });
  });

  describe("Content updates", () => {
    it("announces new content when children change", () => {
      const { rerender } = render(<LiveRegion>First message</LiveRegion>);
      expect(screen.getByText("First message")).toBeInTheDocument();

      rerender(<LiveRegion>Second message</LiveRegion>);
      expect(screen.getByText("Second message")).toBeInTheDocument();
      expect(screen.queryByText("First message")).not.toBeInTheDocument();
    });

    it("handles empty children gracefully", () => {
      render(<LiveRegion>{""}</LiveRegion>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("handles null children gracefully", () => {
      render(<LiveRegion>{null}</LiveRegion>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("handles undefined children gracefully", () => {
      render(<LiveRegion>{undefined}</LiveRegion>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("Active state", () => {
    it("renders when active=true (default)", () => {
      render(<LiveRegion>Test announcement</LiveRegion>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders when active is explicitly true", () => {
      render(<LiveRegion active={true}>Test announcement</LiveRegion>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("does not render when active=false", () => {
      render(<LiveRegion active={false}>Test announcement</LiveRegion>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("can be toggled between active states", () => {
      const { rerender } = render(
        <LiveRegion active={true}>Test announcement</LiveRegion>,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();

      rerender(<LiveRegion active={false}>Test announcement</LiveRegion>);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      rerender(<LiveRegion active={true}>Test announcement</LiveRegion>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("Complex content", () => {
    it("renders complex ReactNode children", () => {
      render(
        <LiveRegion>
          <span>Complex</span> <strong>content</strong>
        </LiveRegion>,
      );
      expect(screen.getByText("Complex")).toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    it("handles multiple child elements", () => {
      render(
        <LiveRegion>
          <div>First line</div>
          <div>Second line</div>
        </LiveRegion>,
      );
      expect(screen.getByText("First line")).toBeInTheDocument();
      expect(screen.getByText("Second line")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("meets WCAG 4.1.3 Status Messages requirements", () => {
      render(<LiveRegion priority="polite">Loading complete</LiveRegion>);
      const region = screen.getByRole("status");

      // Required attributes for WCAG 4.1.3
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toHaveAttribute("aria-atomic", "true");
      expect(region).toHaveAttribute("role", "status");
    });

    it("uses assertive for error announcements", () => {
      render(<LiveRegion priority="assertive">Critical error</LiveRegion>);
      const region = screen.getByRole("status");

      expect(region).toHaveAttribute("aria-live", "assertive");
    });
  });
});
