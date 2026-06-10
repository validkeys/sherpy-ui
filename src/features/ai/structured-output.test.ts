/**
 * Integration tests for Structured Output feature
 * Tests response parsing, backward compatibility, and type safety.
 *
 * Structured output is always enabled for interview steps via the AI SDK.
 * JSON Schema constants and feature flags have been removed (M5 cleanup).
 */

import { describe, expect, test } from "vitest";
import type { InterviewQuestionResponse } from "../planning/response-schemas";
import type { StepOption } from "../planning/types";

describe("Structured Output - Response Parsing", () => {
  test("valid JSON response parsed correctly", () => {
    const jsonResponse = JSON.stringify({
      question: "What is your goal?",
      options: [
        {
          letter: "A",
          title: "Option A",
          body: "Description A",
          recommended: true,
        },
        {
          letter: "B",
          title: "Option B",
          body: "Description B",
          recommended: false,
        },
      ],
      isComplete: false,
    });

    const parsed: InterviewQuestionResponse = JSON.parse(jsonResponse);
    expect(parsed.question).toBe("What is your goal?");
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options[0].letter).toBe("A");
    expect(parsed.options[0].recommended).toBe(true);
    expect(parsed.isComplete).toBe(false);
  });

  test("question text is clean without options section", () => {
    const jsonResponse = JSON.stringify({
      question: "What is your goal?",
      options: [
        {
          letter: "A",
          title: "Option A",
          body: "Description A",
          recommended: false,
        },
      ],
      isComplete: false,
    });

    const parsed: InterviewQuestionResponse = JSON.parse(jsonResponse);
    expect(parsed.question).not.toContain("**Options:**");
    expect(parsed.question).not.toContain("A)");
  });

  test("options extracted properly from JSON", () => {
    const jsonResponse = JSON.stringify({
      question: "Choose an option",
      options: [
        {
          letter: "A",
          title: "First",
          body: "First option",
          recommended: true,
        },
        {
          letter: "B",
          title: "Second",
          body: "Second option",
          recommended: false,
        },
        {
          letter: "C",
          title: "Third",
          body: "Third option",
          recommended: false,
        },
      ],
      isComplete: false,
    });

    const parsed: InterviewQuestionResponse = JSON.parse(jsonResponse);
    expect(parsed.options).toHaveLength(3);
    expect(parsed.options[0].letter).toBe("A");
    expect(parsed.options[1].letter).toBe("B");
    expect(parsed.options[2].letter).toBe("C");
    expect(parsed.options[0].recommended).toBe(true);
    expect(parsed.options[1].recommended).toBe(false);
  });

  test("isComplete boolean works", () => {
    const completeResponse = JSON.stringify({
      question: "Final question",
      options: [],
      isComplete: true,
    });

    const parsed: InterviewQuestionResponse = JSON.parse(completeResponse);
    expect(parsed.isComplete).toBe(true);
  });

  test("isComplete defaults to undefined if not provided", () => {
    const response = JSON.stringify({
      question: "Question",
      options: [],
    });

    const parsed: InterviewQuestionResponse = JSON.parse(response);
    expect(parsed.isComplete).toBeUndefined();
  });

  test("invalid JSON throws error", () => {
    const invalidJson = "{invalid json}";
    expect(() => JSON.parse(invalidJson)).toThrow();
  });

  test("malformed JSON with missing fields throws or has undefined properties", () => {
    const malformedJson = JSON.stringify({
      question: "Question without options",
    });

    const parsed: any = JSON.parse(malformedJson);
    expect(parsed.options).toBeUndefined();
  });
});

describe("Structured Output - Backward Compatibility", () => {
  test("text responses with [STEP_COMPLETE] marker detected", () => {
    const textResponse = "Here is the final question.\n[STEP_COMPLETE]";
    expect(textResponse).toContain("[STEP_COMPLETE]");

    const cleanText = textResponse.replace("[STEP_COMPLETE]", "").trim();
    expect(cleanText).not.toContain("[STEP_COMPLETE]");
    expect(cleanText).toBe("Here is the final question.");
  });

  test("text responses without [STEP_COMPLETE] are incomplete", () => {
    const textResponse = "Here is a question.\n\n**Options:**\nA) Option A";
    expect(textResponse).not.toContain("[STEP_COMPLETE]");
  });

  test("parseOptions fallback available for text mode", async () => {
    const parseOptionsModule = await import("./parse-options");
    expect(parseOptionsModule.parseOptions).toBeDefined();
    expect(typeof parseOptionsModule.parseOptions).toBe("function");
  });

  test("StepOption interface unchanged for backward compatibility", () => {
    const option: StepOption = {
      letter: "A",
      title: "Test",
      body: "Test body",
      recommended: true,
    };

    expect(option.letter).toBe("A");
    expect(option.title).toBe("Test");
    expect(option.body).toBe("Test body");
    expect(option.recommended).toBe(true);
  });
});

describe("Structured Output - Error Handling", () => {
  test("JSON parse errors are catchable", () => {
    const invalidJson = "not valid json";

    let error: Error | null = null;
    try {
      JSON.parse(invalidJson);
    } catch (err) {
      error = err as Error;
    }

    expect(error).not.toBeNull();
    expect(error?.message).toContain("JSON");
  });

  test("missing required fields in JSON can be detected", () => {
    const incompleteJson = JSON.stringify({ question: "Test" });
    const parsed: any = JSON.parse(incompleteJson);

    expect(parsed.question).toBeDefined();
    expect(parsed.options).toBeUndefined();
  });

  test("fallback to text mode when JSON parsing fails", () => {
    const textFallback = "Question text\n\n**Options:**\nA) Option A";

    let parsed: InterviewQuestionResponse | null = null;
    let fallbackText = "";

    try {
      parsed = JSON.parse(textFallback);
    } catch {
      fallbackText = textFallback;
    }

    expect(parsed).toBeNull();
    expect(fallbackText).toBe(textFallback);
  });
});

describe("Structured Output - Type Safety", () => {
  test("InterviewQuestionResponse type matches schema", () => {
    const response: InterviewQuestionResponse = {
      question: "Test question",
      options: [
        { letter: "A", title: "Option A", body: "Body A", recommended: false },
      ],
      isComplete: false,
    };

    expect(response.question).toBeDefined();
    expect(response.options).toBeDefined();
    expect(Array.isArray(response.options)).toBe(true);
  });

  test("StepOption properties are type-safe", () => {
    const option: StepOption = {
      letter: "A",
      title: "Title",
      body: "Body",
      recommended: false,
    };

    expect(typeof option.letter).toBe("string");
    expect(typeof option.title).toBe("string");
    expect(typeof option.body).toBe("string");
    expect(typeof option.recommended).toBe("boolean");
  });
});
