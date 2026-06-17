/**
 * BUG-035 Integration Test: Verify auto-submit behavior with WorkflowChat + Controller
 *
 * These tests verify the complete prop chain from useWorkflowChatController
 * through WorkflowChat and ChatMessage to AnswerCard. Unit tests verified
 * AnswerCard in isolation; these verify the full integration.
 *
 * Coverage:
 * - Step 1 (Gap Analysis) form: autoSubmit=false (manual submit required)
 * - Step 2 (Business Reqs) interview: autoSubmit=true (500ms auto-submit)
 * - Step 3 (Technical Reqs) interview: autoSubmit=true (500ms auto-submit)
 * - Step 5 (Implementation) form: autoSubmit=false (manual submit required)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Artifact, Message } from "./types";
import { WorkflowChat } from "./WorkflowChat";

describe("BUG-035: Integration - Auto-submit behavior per step type", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Step 1 (Gap Analysis) - Manual form", () => {
    it("should NOT auto-submit when all fields filled", async () => {
      const mockOnSubmitForm = vi.fn();
      const mockOnFormValueChange = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "Tell us about your project",
          formFields: [
            { id: "existing", label: "Existing requirements?", type: "text" },
            {
              id: "description",
              label: "What are you building?",
              type: "textarea",
            },
          ],
          timestamp: "10:00 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          onFormValueChange={mockOnFormValueChange}
          formValues={{
            existing: "Yes, we have specs",
            description: "A project management tool",
          }}
          autoSubmit={false} // Step 1 behavior
        />,
      );

      // Wait beyond auto-submit timeout
      await vi.advanceTimersByTimeAsync(2000);

      // Should NOT have auto-submitted
      expect(mockOnSubmitForm).not.toHaveBeenCalled();

      // Submit button should be enabled and clickable
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).toBeEnabled();
    });

    it("should submit only when Submit button clicked", async () => {
      const user = userEvent.setup({ delay: null });
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "Tell us about your project",
          formFields: [
            { id: "existing", label: "Existing requirements?", type: "text" },
          ],
          timestamp: "10:00 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ existing: "Yes" }}
          autoSubmit={false}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
      expect(mockOnSubmitForm).toHaveBeenCalledWith(
        "Tell us about your project",
        { existing: "Yes" },
      );
    });
  });

  describe("Step 2/3 (Interview) - Auto-submit enabled", () => {
    it("should auto-submit after 500ms when all fields filled", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "What is your primary business goal?",
          formFields: [{ id: "answer", label: "Your answer", type: "text" }],
          timestamp: "10:00 AM",
        },
      ];

      const { rerender } = render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{}}
          autoSubmit={true} // Step 2/3 behavior
        />,
      );

      // Initially form is empty - should not submit
      await vi.advanceTimersByTimeAsync(600);
      expect(mockOnSubmitForm).not.toHaveBeenCalled();

      // User fills in field (simulated by formValues update)
      rerender(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ answer: "Increase revenue by 50%" }}
          autoSubmit={true}
        />,
      );

      // Should auto-submit after 500ms
      await vi.advanceTimersByTimeAsync(600);

      expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
      expect(mockOnSubmitForm).toHaveBeenCalledWith(
        "What is your primary business goal?",
        { answer: "Increase revenue by 50%" },
      );
    });

    it("should NOT auto-submit if field becomes empty during delay", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "What is your primary business goal?",
          formFields: [{ id: "answer", label: "Your answer", type: "text" }],
          timestamp: "10:00 AM",
        },
      ];

      const { rerender } = render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ answer: "Something" }}
          autoSubmit={true}
        />,
      );

      // Advance 200ms into the 500ms delay
      await vi.advanceTimersByTimeAsync(200);

      // User clears the field
      rerender(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ answer: "" }}
          autoSubmit={true}
        />,
      );

      // Complete the remaining time
      await vi.advanceTimersByTimeAsync(600);

      // Should NOT have submitted because field is empty
      expect(mockOnSubmitForm).not.toHaveBeenCalled();
    });
  });

  describe("Step 5 (Implementation Details) - Manual form", () => {
    it("should NOT auto-submit when all fields filled", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "Implementation details",
          formFields: [
            { id: "deployment", label: "Deployment strategy", type: "text" },
            { id: "techStack", label: "Tech stack", type: "text" },
          ],
          timestamp: "10:00 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{
            deployment: "Cloud",
            techStack: "React + Node.js",
          }}
          autoSubmit={false} // Step 5 behavior
        />,
      );

      // Wait beyond auto-submit timeout
      await vi.advanceTimersByTimeAsync(2000);

      // Should NOT have auto-submitted
      expect(mockOnSubmitForm).not.toHaveBeenCalled();
    });
  });

  describe("Multiple messages with different submit modes", () => {
    it("should handle mixed message types correctly", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "divider",
          stageNumber: 1,
          stageName: "Gap Analysis",
          stageColor: "blue",
        },
        {
          type: "question",
          role: "assistant",
          question: "Step 1 question (manual)",
          formFields: [{ id: "field1", label: "Field 1", type: "text" }],
          timestamp: "10:00 AM",
        },
        {
          type: "answer",
          role: "user",
          question: "Step 1 question (manual)",
          answer: "My answer",
          timestamp: "10:01 AM",
        },
        {
          type: "divider",
          stageNumber: 2,
          stageName: "Business Requirements",
          stageColor: "green",
        },
        {
          type: "question",
          role: "assistant",
          question: "Step 2 question (auto-submit)",
          formFields: [{ id: "field2", label: "Field 2", type: "text" }],
          timestamp: "10:02 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ field2: "Auto answer" }}
          autoSubmit={true} // Currently on Step 2 (auto-submit enabled)
        />,
      );

      // The last question (Step 2) should auto-submit
      await vi.advanceTimersByTimeAsync(600);

      expect(mockOnSubmitForm).toHaveBeenCalledTimes(1);
      expect(mockOnSubmitForm).toHaveBeenCalledWith(
        "Step 2 question (auto-submit)",
        { field2: "Auto answer" },
      );
    });
  });

  describe("Disabled state", () => {
    it("should NOT auto-submit when disabled=true even with autoSubmit=true", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "Interview question",
          formFields: [{ id: "answer", label: "Your answer", type: "text" }],
          timestamp: "10:00 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ answer: "Something" }}
          autoSubmit={true}
          disabled={true} // Disabled takes precedence
        />,
      );

      await vi.advanceTimersByTimeAsync(600);

      expect(mockOnSubmitForm).not.toHaveBeenCalled();
    });
  });

  describe("isSubmitting state", () => {
    it("should NOT auto-submit when isSubmitting=true", async () => {
      const mockOnSubmitForm = vi.fn();

      const messages: Message[] = [
        {
          type: "question",
          role: "assistant",
          question: "Interview question",
          formFields: [{ id: "answer", label: "Your answer", type: "text" }],
          timestamp: "10:00 AM",
        },
      ];

      render(
        <WorkflowChat
          messages={messages}
          artifacts={[]}
          onSubmitForm={mockOnSubmitForm}
          formValues={{ answer: "Something" }}
          autoSubmit={true}
          isSubmitting={true} // Prevents duplicate submissions
        />,
      );

      await vi.advanceTimersByTimeAsync(600);

      expect(mockOnSubmitForm).not.toHaveBeenCalled();
    });
  });
});
