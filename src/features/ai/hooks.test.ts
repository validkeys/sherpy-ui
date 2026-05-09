import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useStreamingQuestion } from "./hooks";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useStreamingQuestion", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Reset environment variables
    process.env.USE_STRUCTURED_OUTPUT = "false";
    process.env.STRUCTURED_OUTPUT_STEPS = "1";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockStreamResponse = (chunks: string[]) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => {
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
      },
    });

    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      body: stream,
    } as Response;
  };

  describe("Text Mode (Legacy)", () => {
    it("should parse options from text response using parseOptions()", async () => {
      const textResponse = `Here's your question:

**Options:**
1. First Option - Description of first option
2. Second Option - Description of second option`;

      mockFetch.mockResolvedValue(createMockStreamResponse([textResponse]));

      const onOptionsReady = vi.fn();
      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
          onOptionsReady,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe(textResponse);
      expect(result.current.error).toBeNull();
      expect(onOptionsReady).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            letter: "1",
            title: "First Option",
          }),
          expect.objectContaining({
            letter: "2",
            title: "Second Option",
          }),
        ])
      );
    });

    it("should detect [STEP_COMPLETE] marker in text mode", async () => {
      const textResponse = "Final question text [STEP_COMPLETE]";

      mockFetch.mockResolvedValue(createMockStreamResponse([textResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isComplete).toBe(true);
      expect(result.current.text).toBe("Final question text");
    });
  });

  describe("JSON Mode (Structured Output)", () => {
    beforeEach(() => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2,3";
    });

    it("should parse JSON response into InterviewQuestionResponse", async () => {
      const jsonResponse = JSON.stringify({
        question: "What is your preferred architecture?",
        options: [
          {
            letter: "A",
            title: "Monolithic",
            body: "Single codebase, easier to start",
            recommended: false,
          },
          {
            letter: "B",
            title: "Microservices",
            body: "Distributed services, better scalability",
            recommended: true,
          },
        ],
        isComplete: false,
      });

      mockFetch.mockResolvedValue(createMockStreamResponse([jsonResponse]));

      const onOptionsReady = vi.fn();
      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
          onOptionsReady,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should return clean question text (no **Options:** section)
      expect(result.current.text).toBe("What is your preferred architecture?");
      expect(result.current.isComplete).toBe(false);
      expect(result.current.options).toHaveLength(2);
      expect(result.current.options[0]).toEqual({
        letter: "A",
        title: "Monolithic",
        body: "Single codebase, easier to start",
        recommended: false,
      });
      expect(result.current.options[1]).toEqual({
        letter: "B",
        title: "Microservices",
        body: "Distributed services, better scalability",
        recommended: true,
      });

      // Should still call onOptionsReady for backward compat
      expect(onOptionsReady).toHaveBeenCalledWith(result.current.options);
    });

    it("should handle isComplete: true in JSON response", async () => {
      const jsonResponse = JSON.stringify({
        question: "Final question",
        options: [
          { letter: "A", title: "Option A", body: "Body A" },
          { letter: "B", title: "Option B", body: "Body B" },
        ],
        isComplete: true,
      });

      mockFetch.mockResolvedValue(createMockStreamResponse([jsonResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isComplete).toBe(true);
      expect(result.current.text).toBe("Final question");
    });

    it("should fallback to error state on invalid JSON", async () => {
      const invalidJson = "{ invalid json syntax";

      mockFetch.mockResolvedValue(createMockStreamResponse([invalidJson]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Invalid JSON response");
    });

    it("should handle streaming JSON in chunks", async () => {
      const jsonPart1 = '{"question":"Test ';
      const jsonPart2 = 'question","options":[{"letter":"A",';
      const jsonPart3 = '"title":"Option A","body":"Body A"}]}';

      mockFetch.mockResolvedValue(
        createMockStreamResponse([jsonPart1, jsonPart2, jsonPart3])
      );

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe("Test question");
      expect(result.current.options).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Feature Flag Behavior", () => {
    it("should use JSON mode when flag enabled for step", async () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2";

      const jsonResponse = JSON.stringify({
        question: "JSON mode question",
        options: [{ letter: "A", title: "Option", body: "Body" }],
      });

      mockFetch.mockResolvedValue(createMockStreamResponse([jsonResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe("JSON mode question");
      expect(result.current.options).toHaveLength(1);
    });

    it("should use text mode when flag disabled", async () => {
      process.env.USE_STRUCTURED_OUTPUT = "false";

      const textResponse = "Text mode question\n**Options:**\n1. Option A - Body A";

      mockFetch.mockResolvedValue(createMockStreamResponse([textResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe(textResponse);
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].letter).toBe("1");
    });

    it("should use text mode when step not in enabled list", async () => {
      process.env.USE_STRUCTURED_OUTPUT = "true";
      process.env.STRUCTURED_OUTPUT_STEPS = "1,2"; // Not step 3

      const textResponse = "Text mode\n**Options:**\n1. Option - Body";

      mockFetch.mockResolvedValue(createMockStreamResponse([textResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 3, // Not in enabled list
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe(textResponse);
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Network error");
    });

    it("should handle HTML error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        body: null,
      } as Response);

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("HTML response");
    });
  });

  describe("Refetch Behavior", () => {
    it("should refetch when refetch() is called", async () => {
      const response1 = "First response\n**Options:**\n1. Option 1 - Body 1";
      const response2 = "Second response\n**Options:**\n1. Option 2 - Body 2";

      mockFetch
        .mockResolvedValueOnce(createMockStreamResponse([response1]))
        .mockResolvedValueOnce(createMockStreamResponse([response2]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.text).toBe(response1);

      // Trigger refetch
      result.current.refetch();

      // Wait for text to change to the second response
      await waitFor(() => expect(result.current.text).toBe(response2), { timeout: 2000 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
