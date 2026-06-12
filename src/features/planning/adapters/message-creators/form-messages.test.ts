import { describe, expect, it } from "vitest";
import type { PlanningContext } from "../../machines/types";
import {
  createFormQuestionMessage,
  createFormResponseMessages,
  FORM_FIELDS,
} from "./form-messages";

describe("form-messages", () => {
  describe("FORM_FIELDS", () => {
    it("defines Step 1 form fields", () => {
      expect(FORM_FIELDS[1]).toEqual([
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
      ]);
    });

    it("defines Step 5 form fields", () => {
      expect(FORM_FIELDS[5]).toEqual([
        {
          id: "deploymentStrategy",
          label: "What is the deployment strategy?",
          type: "text",
        },
        {
          id: "techStack",
          label: "What is the tech stack?",
          type: "text",
        },
      ]);
    });
  });

  describe("createFormQuestionMessage", () => {
    it("creates Step 1 form question message", () => {
      const context = {
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as PlanningContext;

      const message = createFormQuestionMessage(context, 1);

      expect(message).toEqual({
        type: "question",
        id: "step-1-current-question",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        question: "First, let's understand your starting point:",
        formFields: FORM_FIELDS[1],
      });
    });

    it("creates Step 5 form question message", () => {
      const context = {
        updatedAt: "2026-01-02T00:00:00.000Z",
      } as PlanningContext;

      const message = createFormQuestionMessage(context, 5);

      expect(message).toEqual({
        type: "question",
        id: "step-5-current-question",
        role: "assistant",
        timestamp: "2026-01-02T00:00:00.000Z",
        question: "Tell me how this should be implemented:",
        formFields: FORM_FIELDS[5],
      });
    });

    it("creates a new formFields array (not reference)", () => {
      const context = {
        updatedAt: "2026-01-01T00:00:00.000Z",
      } as PlanningContext;

      const message = createFormQuestionMessage(context, 1);

      expect(message.formFields).not.toBe(FORM_FIELDS[1]);
      expect(message.formFields).toEqual(FORM_FIELDS[1]);
    });
  });

  describe("createFormResponseMessages", () => {
    it("creates messages for Step 1 responses", () => {
      const responses = {
        existingRequirements: "Yes, I have a PRD",
        projectDescription: "Building a todo app",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages).toEqual([
        {
          type: "answer",
          id: "step-1-form-answer-existingRequirements",
          role: "user",
          timestamp: "2026-01-01T00:00:00.000Z",
          question: "Do you have existing requirements?",
          answer: "Yes, I have a PRD",
        },
        {
          type: "answer",
          id: "step-1-form-answer-projectDescription",
          role: "user",
          timestamp: "2026-01-01T00:00:00.000Z",
          question: "What are you building?",
          answer: "Building a todo app",
        },
      ]);
    });

    it("creates messages for Step 5 responses", () => {
      const responses = {
        deploymentStrategy: "Docker containers",
        techStack: "React + Node.js",
      };
      const timestamp = "2026-01-02T00:00:00.000Z";

      const messages = createFormResponseMessages(5, responses, timestamp);

      expect(messages).toEqual([
        {
          type: "answer",
          id: "step-5-form-answer-deploymentStrategy",
          role: "user",
          timestamp: "2026-01-02T00:00:00.000Z",
          question: "What is the deployment strategy?",
          answer: "Docker containers",
        },
        {
          type: "answer",
          id: "step-5-form-answer-techStack",
          role: "user",
          timestamp: "2026-01-02T00:00:00.000Z",
          question: "What is the tech stack?",
          answer: "React + Node.js",
        },
      ]);
    });

    it("filters out empty string responses", () => {
      const responses = {
        existingRequirements: "",
        projectDescription: "Building a todo app",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("step-1-form-answer-projectDescription");
    });

    it("filters out whitespace-only responses", () => {
      const responses = {
        existingRequirements: "   \n\t  ",
        projectDescription: "Building a todo app",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("step-1-form-answer-projectDescription");
    });

    it("returns empty array when all responses are empty", () => {
      const responses = {
        existingRequirements: "",
        projectDescription: "",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages).toEqual([]);
    });

    it("handles partial responses (missing fields)", () => {
      const responses = {
        projectDescription: "Building a todo app",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("step-1-form-answer-projectDescription");
    });

    it("preserves answer whitespace", () => {
      const responses = {
        projectDescription: "  Building a todo app  ",
      };
      const timestamp = "2026-01-01T00:00:00.000Z";

      const messages = createFormResponseMessages(1, responses, timestamp);

      expect(messages[0].answer).toBe("  Building a todo app  ");
    });
  });
});
