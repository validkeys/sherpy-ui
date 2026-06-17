/**
 * BUG-034: Component Integration Tests
 *
 * Tests the actual prop flow from controller → WorkflowChat → ChatMessage → AnswerCard
 * to verify that auto-submit correctly triggers the state machine.
 */

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnswerCard } from "./AnswerCard";
import { ChatMessage } from "./ChatMessage";
import type { Message } from "./types";

describe("BUG-034: Component Prop Flow Integration", () => {
  describe("AnswerCard auto-submit behavior", () => {
    it("should call onSubmitForm when all fields are filled", async () => {
      const mockOnSubmitForm = vi.fn();

      const { rerender } = render(
        <AnswerCard
          formFields={[
            { id: "name", type: "text", label: "Name" },
            { id: "email", type: "text", label: "Email" },
          ]}
          formValues={{}}
          onSubmitForm={mockOnSubmitForm}
          autoSubmit
          disabled={false}
          isSubmitting={false}
        />,
      );

      // Initially empty - should not call
      expect(mockOnSubmitForm).not.toHaveBeenCalled();

      // Fill all fields
      rerender(
        <AnswerCard
          formFields={[
            { id: "name", type: "text", label: "Name" },
            { id: "email", type: "text", label: "Email" },
          ]}
          formValues={{
            name: "John Doe",
            email: "john@example.com",
          }}
          onSubmitForm={mockOnSubmitForm}
          autoSubmit
          disabled={false}
          isSubmitting={false}
        />,
      );

      // Should auto-submit after 500ms delay
      await waitFor(
        () => {
          expect(mockOnSubmitForm).toHaveBeenCalledWith({
            name: "John Doe",
            email: "john@example.com",
          });
        },
        { timeout: 1000 },
      );
    });

    it("should pass only values parameter to onSubmitForm", async () => {
      const mockOnSubmitForm = vi.fn();

      render(
        <AnswerCard
          formFields={[{ id: "field1", type: "text", label: "Field 1" }]}
          formValues={{ field1: "value1" }}
          onSubmitForm={mockOnSubmitForm}
          autoSubmit
          disabled={false}
          isSubmitting={false}
        />,
      );

      await waitFor(
        () => {
          expect(mockOnSubmitForm).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      // Verify only one argument (values) is passed, not two (question, values)
      expect(mockOnSubmitForm).toHaveBeenCalledWith({ field1: "value1" });
      expect(mockOnSubmitForm.mock.calls[0]).toHaveLength(1);
    });
  });

  describe("ChatMessage wraps AnswerCard correctly", () => {
    it("should transform (values) call from AnswerCard to (question, values) call to parent", async () => {
      const mockParentOnSubmitForm = vi.fn();

      const message: Message = {
        id: "msg-1",
        type: "question",
        role: "assistant",
        question: "What is your project name?",
        timestamp: new Date().toISOString(),
        formFields: [
          { id: "projectName", type: "text", label: "Project Name" },
        ],
      };

      render(
        <ChatMessage
          message={message}
          onSubmitForm={mockParentOnSubmitForm}
          autoSubmit
          formValues={{ projectName: "My Project" }}
          disabled={false}
          isSubmitting={false}
        />,
      );

      // Wait for auto-submit
      await waitFor(
        () => {
          expect(mockParentOnSubmitForm).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      // Verify ChatMessage added the question as first parameter
      expect(mockParentOnSubmitForm).toHaveBeenCalledWith(
        "What is your project name?",
        {
          projectName: "My Project",
        },
      );
      expect(mockParentOnSubmitForm.mock.calls[0]).toHaveLength(2);
    });
  });

  describe("Full prop chain simulation", () => {
    it("should correctly transform through all layers", async () => {
      // Mock the actual controller function
      const mockActorSend = vi.fn();
      const mockSubmitFormResponses = vi.fn((values) => {
        mockActorSend({
          type: "SUBMIT_FORM",
          stepNumber: 1,
          responses: values,
        });
      });

      // Controller layer: receives (question, values), ignores question, calls submitFormResponses
      const controllerOnSubmitForm = (
        _question: string,
        values: Record<string, string>,
      ) => {
        mockSubmitFormResponses(values);
      };

      // WorkflowChat layer: passes through
      const workflowChatOnSubmitForm = controllerOnSubmitForm;

      // ChatMessage layer: wraps to add question
      const message: Message = {
        id: "msg-1",
        type: "question",
        role: "assistant",
        question: "What is your project name?",
        timestamp: new Date().toISOString(),
        formFields: [
          { id: "projectName", type: "text", label: "Project Name" },
        ],
      };

      const chatMessageHandleSubmitForm = (values: Record<string, string>) => {
        if (message.type === "question") {
          workflowChatOnSubmitForm(message.question, values);
        }
      };

      // AnswerCard layer: calls with just values
      render(
        <AnswerCard
          formFields={[
            { id: "projectName", type: "text", label: "Project Name" },
          ]}
          formValues={{ projectName: "My Project" }}
          onSubmitForm={chatMessageHandleSubmitForm}
          autoSubmit
          disabled={false}
          isSubmitting={false}
        />,
      );

      // Wait for auto-submit
      await waitFor(
        () => {
          expect(mockActorSend).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      // Verify the actor received the correct event
      expect(mockActorSend).toHaveBeenCalledWith({
        type: "SUBMIT_FORM",
        stepNumber: 1,
        responses: { projectName: "My Project" },
      });
    });
  });
});
