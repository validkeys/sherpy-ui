import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStreamingQuestion } from "./hooks";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useStreamingQuestion", () => {
  beforeEach(() => {
    mockFetch.mockClear();
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
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // BUG-022 fix: **Options:** section is now stripped from question text
      expect(result.current.text).toBe("Here's your question:");
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
        ]),
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
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isComplete).toBe(true);
      expect(result.current.text).toBe("Final question text");
    });
  });

  describe("JSON Mode (Structured Output)", () => {
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
        }),
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
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isComplete).toBe(true);
      expect(result.current.text).toBe("Final question");
    });

    it("should fall back to text mode on invalid JSON", async () => {
      const invalidJson = "{ invalid json syntax";

      mockFetch.mockResolvedValue(createMockStreamResponse([invalidJson]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // No error — falls back to text parsing
      expect(result.current.error).toBeNull();
      expect(result.current.text).toContain("invalid json syntax");
    });

    it("should handle streaming JSON in chunks", async () => {
      const jsonPart1 = '{"question":"Test ';
      const jsonPart2 = 'question","options":[{"letter":"A",';
      const jsonPart3 = '"title":"Option A","body":"Body A"}]}';

      mockFetch.mockResolvedValue(
        createMockStreamResponse([jsonPart1, jsonPart2, jsonPart3]),
      );

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe("Test question");
      expect(result.current.options).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Response Mode Detection", () => {
    it("should use JSON mode when response is valid JSON", async () => {
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
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.text).toBe("JSON mode question");
      expect(result.current.options).toHaveLength(1);
    });

    it("should use text mode when response is not JSON", async () => {
      const textResponse =
        "Text mode question\n**Options:**\n1. Option A - Body A";

      mockFetch.mockResolvedValue(createMockStreamResponse([textResponse]));

      const { result } = renderHook(() =>
        useStreamingQuestion({
          projectId: "test-project",
          stepNumber: 1,
          previousAnswers: [],
          enabled: true,
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      // BUG-022 fix: **Options:** section is now stripped from question text
      expect(result.current.text).toBe("Text mode question");
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].letter).toBe("1");
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
        }),
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
        }),
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
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      // BUG-022 fix: **Options:** section is now stripped from question text
      expect(result.current.text).toBe("First response");

      // Trigger refetch
      result.current.refetch();

      // Wait for text to change to the second response (also stripped)
      await waitFor(() => expect(result.current.text).toBe("Second response"), {
        timeout: 2000,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
