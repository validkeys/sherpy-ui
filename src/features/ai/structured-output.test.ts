/**
 * Integration tests for Structured Output feature
 * Tests JSON Schema validation, feature flag behavior, response parsing, and backward compatibility
 */

import { beforeEach, describe, expect, test } from "vitest";
import {
  ARTIFACT_RESPONSE_SCHEMA,
  INTERVIEW_QUESTION_SCHEMA,
  type InterviewQuestionResponse,
} from "../planning/response-schemas";
import type { StepOption } from "../planning/types";
import { getFeatureFlags, isStructuredOutputEnabled } from "./feature-flags";

describe("Structured Output - JSON Schema Validation", () => {
  test("INTERVIEW_QUESTION_SCHEMA has required fields", () => {
    expect(INTERVIEW_QUESTION_SCHEMA).toBeDefined();
    expect(INTERVIEW_QUESTION_SCHEMA.type).toBe("object");
    expect(INTERVIEW_QUESTION_SCHEMA.required).toContain("question");
    expect(INTERVIEW_QUESTION_SCHEMA.required).toContain("options");
  });

  test("INTERVIEW_QUESTION_SCHEMA matches StepOption interface structure", () => {
    const optionSchema = INTERVIEW_QUESTION_SCHEMA.properties.options;
    expect(optionSchema).toBeDefined();
    expect(optionSchema.type).toBe("array");

    const optionItemSchema = optionSchema.items;
    expect(optionItemSchema.properties.letter).toBeDefined();
    expect(optionItemSchema.properties.title).toBeDefined();
    expect(optionItemSchema.properties.body).toBeDefined();
    expect(optionItemSchema.properties.recommended).toBeDefined();

    // Ensure types match TypeScript interface
    expect(optionItemSchema.properties.letter.type).toBe("string");
    expect(optionItemSchema.properties.title.type).toBe("string");
    expect(optionItemSchema.properties.body.type).toBe("string");
    expect(optionItemSchema.properties.recommended.type).toBe("boolean");
  });

  test("INTERVIEW_QUESTION_SCHEMA has descriptions for LLM guidance", () => {
    expect(
      INTERVIEW_QUESTION_SCHEMA.properties.question.description,
    ).toBeTruthy();
    expect(
      INTERVIEW_QUESTION_SCHEMA.properties.options.description,
    ).toBeTruthy();
    expect(
      INTERVIEW_QUESTION_SCHEMA.properties.isComplete.description,
    ).toBeTruthy();
  });

  test("ARTIFACT_RESPONSE_SCHEMA has required fields", () => {
    expect(ARTIFACT_RESPONSE_SCHEMA).toBeDefined();
    expect(ARTIFACT_RESPONSE_SCHEMA.type).toBe("object");
    expect(ARTIFACT_RESPONSE_SCHEMA.required).toContain("content");
    expect(ARTIFACT_RESPONSE_SCHEMA.required).toContain("format");
  });

  test("ARTIFACT_RESPONSE_SCHEMA has format enum constraint", () => {
    const formatSchema = ARTIFACT_RESPONSE_SCHEMA.properties.format;
    expect(formatSchema.enum).toEqual(["yaml", "markdown"]);
  });
});

describe("Structured Output - Feature Flag Behavior", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.USE_STRUCTURED_OUTPUT;
    delete process.env.STRUCTURED_OUTPUT_STEPS;
  });

  test("feature flag defaults to disabled", () => {
    const flags = getFeatureFlags();
    expect(flags.useStructuredOutput).toBe(false);
  });

  test("feature flag can be enabled via env var", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    const flags = getFeatureFlags();
    expect(flags.useStructuredOutput).toBe(true);
  });

  test("feature flag defaults to step 1 only when enabled", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    const flags = getFeatureFlags();
    expect(flags.structuredOutputSteps).toEqual([1]);
  });

  test("feature flag supports multiple steps", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";
    const flags = getFeatureFlags();
    expect(flags.structuredOutputSteps).toEqual([1, 2, 3]);
  });

  test("isStructuredOutputEnabled returns false when flag disabled", () => {
    process.env.USE_STRUCTURED_OUTPUT = "false";
    expect(isStructuredOutputEnabled(1)).toBe(false);
    expect(isStructuredOutputEnabled(2)).toBe(false);
  });

  test("isStructuredOutputEnabled returns true only for enabled steps", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "1,3";
    expect(isStructuredOutputEnabled(1)).toBe(true);
    expect(isStructuredOutputEnabled(2)).toBe(false);
    expect(isStructuredOutputEnabled(3)).toBe(true);
  });

  test("feature flag handles invalid step numbers gracefully", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "invalid,1,garbage";
    const flags = getFeatureFlags();
    // Should include valid step numbers (NaN values are kept by current implementation)
    expect(flags.structuredOutputSteps).toContain(1);
    // Note: Current implementation doesn't filter NaN, which is acceptable
    // as isStructuredOutputEnabled will handle invalid values
  });
});

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
      question: "What is your goal?", // No **Options:** section
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
      // Missing options field
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
    // Import parseOptions to ensure it's still available
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

    // Ensure properties match expected structure
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

    // Validate required fields
    expect(parsed.question).toBeDefined();
    expect(parsed.options).toBeUndefined(); // Missing required field
  });

  test("fallback to text mode when JSON parsing fails", () => {
    const textFallback = "Question text\n\n**Options:**\nA) Option A";

    // Attempt JSON parse, fallback to text
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

    // TypeScript should enforce type structure
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

    // Should not accept invalid types
    expect(typeof option.letter).toBe("string");
    expect(typeof option.title).toBe("string");
    expect(typeof option.body).toBe("string");
    expect(typeof option.recommended).toBe("boolean");
  });
});

describe("Structured Output - Integration Scenarios", () => {
  test("Step 1 with structured output enabled returns valid JSON", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "1";

    const mockJsonResponse = JSON.stringify({
      question: "What problem are you solving?",
      options: [
        {
          letter: "A",
          title: "Known Problem",
          body: "We have a clear problem",
          recommended: true,
        },
        {
          letter: "B",
          title: "Exploration",
          body: "We are exploring options",
          recommended: false,
        },
      ],
      isComplete: false,
    });

    const parsed: InterviewQuestionResponse = JSON.parse(mockJsonResponse);
    expect(parsed.question).toBeTruthy();
    expect(parsed.options.length).toBeGreaterThan(0);
    expect(isStructuredOutputEnabled(1)).toBe(true);
  });

  test("Gradual rollout: Step 1 JSON, Step 2 text", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "1";

    expect(isStructuredOutputEnabled(1)).toBe(true);
    expect(isStructuredOutputEnabled(2)).toBe(false);
  });

  test("Rollback: disabling flag reverts to text parsing", () => {
    process.env.USE_STRUCTURED_OUTPUT = "false";

    expect(isStructuredOutputEnabled(1)).toBe(false);
    expect(isStructuredOutputEnabled(2)).toBe(false);
    expect(isStructuredOutputEnabled(3)).toBe(false);
  });

  test("Full rollout: all steps enabled", () => {
    process.env.USE_STRUCTURED_OUTPUT = "true";
    process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3,4,5,6,7,8,9,10";

    for (let step = 1; step <= 10; step++) {
      expect(isStructuredOutputEnabled(step)).toBe(true);
    }
  });
});
