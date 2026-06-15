import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();
const mockStreamObject = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
  streamObject: (...args: unknown[]) => mockStreamObject(...args),
  Output: {
    object: (opts: Record<string, unknown>) => ({ type: "object", ...opts }),
  },
}));

vi.mock("@/lib/ai-provider", () => ({
  getModel: vi.fn(() => "mock-model"),
  AI_MODEL_ID: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}));

vi.mock("@/lib/langfuse-helpers", () => ({
  createTrace: vi.fn(() => "mock-trace"),
  createGenerationSpan: vi.fn(() => "mock-span"),
  finalizeGenerationSpan: vi.fn(),
  flushLangfuse: vi.fn(),
}));

vi.mock("./provider-errors", () => ({
  logAIProviderError: vi.fn((error: unknown) => error),
  AIProviderError: class extends Error {
    code = "AI_PROVIDER_UNKNOWN";
  },
}));

import { finalizeGenerationSpan, flushLangfuse } from "@/lib/langfuse-helpers";
import {
  aiGenerateObject,
  aiGenerateText,
  aiStreamObject,
  aiStreamText,
} from "./ai-client";

const sampleMessages = [{ role: "user", content: "Hello" }] as Array<{
  role: string;
  content: string;
}>;

describe("aiGenerateText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text from AI SDK generateText", async () => {
    mockGenerateText.mockResolvedValue({
      text: "Hello from Claude!",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      finishReason: "stop",
    });

    const result = await aiGenerateText(sampleMessages);

    expect(result).toBe("Hello from Claude!");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        maxOutputTokens: 512,
        messages: sampleMessages,
      }),
    );
  });

  it("passes custom maxTokens and temperature", async () => {
    mockGenerateText.mockResolvedValue({
      text: "response",
      usage: undefined,
      finishReason: "stop",
    });

    await aiGenerateText(sampleMessages, {
      maxTokens: 1024,
      temperature: 0.7,
    });

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 1024,
        temperature: 0.7,
      }),
    );
  });

  it("calls Langfuse observability helpers", async () => {
    mockGenerateText.mockResolvedValue({
      text: "observed",
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      finishReason: "stop",
    });

    await aiGenerateText(sampleMessages);

    expect(finalizeGenerationSpan).toHaveBeenCalledWith(
      "mock-span",
      expect.objectContaining({
        output: "observed",
        usage: { input: 20, output: 10, total: 30 },
      }),
    );
    expect(flushLangfuse).toHaveBeenCalled();
  });

  it("handles missing usage data gracefully", async () => {
    mockGenerateText.mockResolvedValue({
      text: "no usage",
      usage: undefined,
      finishReason: "stop",
    });

    const result = await aiGenerateText(sampleMessages);

    expect(result).toBe("no usage");
    expect(finalizeGenerationSpan).toHaveBeenCalledWith(
      "mock-span",
      expect.objectContaining({
        output: "no usage",
        usage: undefined,
      }),
    );
  });

  it("propagates errors through logAIProviderError", async () => {
    const error = new Error("Bedrock connection failed");
    mockGenerateText.mockRejectedValue(error);

    await expect(aiGenerateText(sampleMessages)).rejects.toThrow(
      "Bedrock connection failed",
    );
  });
});

describe("aiGenerateObject", () => {
  const testSchema = z.object({
    question: z.string(),
    options: z.array(
      z.object({
        letter: z.string(),
        title: z.string(),
        body: z.string(),
      }),
    ),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed object from AI SDK generateText with output", async () => {
    const mockObject = {
      question: "What is your project?",
      options: [
        { letter: "A", title: "Web App", body: "A web application" },
        { letter: "B", title: "Mobile App", body: "A mobile application" },
      ],
    };

    mockGenerateText.mockResolvedValue({
      text: JSON.stringify(mockObject),
      output: mockObject,
      usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
      finishReason: "stop",
    });

    const result = await aiGenerateObject(sampleMessages, testSchema);

    expect(result).toEqual(mockObject);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.objectContaining({ type: "object" }),
      }),
    );
  });

  it("uses higher maxTokens default for structured output", async () => {
    mockGenerateText.mockResolvedValue({
      text: "{}",
      output: { question: "Q", options: [] },
      usage: undefined,
      finishReason: "stop",
    });

    await aiGenerateObject(sampleMessages, testSchema);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 2048,
      }),
    );
  });

  it("calls Langfuse with structured output metadata", async () => {
    const mockObject = { question: "Q", options: [] };
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify(mockObject),
      output: mockObject,
      usage: undefined,
      finishReason: "stop",
    });

    await aiGenerateObject(sampleMessages, testSchema);

    expect(finalizeGenerationSpan).toHaveBeenCalledWith(
      "mock-span",
      expect.objectContaining({
        metadata: expect.objectContaining({ structuredOutput: true }),
      }),
    );
  });

  it("propagates errors through logAIProviderError", async () => {
    const error = new Error("Schema validation failed");
    mockGenerateText.mockRejectedValue(error);

    await expect(aiGenerateObject(sampleMessages, testSchema)).rejects.toThrow(
      "Schema validation failed",
    );
  });
});

describe("aiStreamText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ReadableStream with text chunks", async () => {
    async function* textGen() {
      yield "Hello ";
      yield "world!";
    }

    mockStreamText.mockResolvedValue({
      textStream: textGen(),
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    const stream = await aiStreamText(sampleMessages);
    const reader = stream.getReader();
    const chunks: string[] = [];

    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      if (value) chunks.push(value);
    }

    expect(chunks).toEqual(["Hello ", "world!"]);
  });

  it("calls onChunk callback for each text delta", async () => {
    const onChunk = vi.fn();

    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      const onChunkInternal = opts.onChunk as (
        event: Record<string, unknown>,
      ) => void;
      onChunkInternal({ chunk: { type: "text-delta", text: "Hi" } });
      onChunkInternal({ chunk: { type: "text-delta", text: "!" } });

      async function* textGen() {
        yield "Hi!";
      }

      return Promise.resolve({
        textStream: textGen(),
        usage: undefined,
      });
    });

    const stream = await aiStreamText(sampleMessages, { onChunk });

    const reader = stream.getReader();
    while (!(await reader.read()).done) {
      /* drain */
    }

    expect(onChunk).toHaveBeenCalledWith("Hi");
    expect(onChunk).toHaveBeenCalledWith("!");
  });

  it("calls onFinish for Langfuse observability", async () => {
    const { finalizeGenerationSpan } = await import("@/lib/langfuse-helpers");

    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      const onFinish = opts.onFinish as (
        event: Record<string, unknown>,
      ) => void;
      onFinish({
        usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
        finishReason: "stop",
      });

      async function* textGen() {
        yield "done";
      }

      return Promise.resolve({
        textStream: textGen(),
        usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
      });
    });

    const stream = await aiStreamText(sampleMessages);
    const reader = stream.getReader();
    while (!(await reader.read()).done) {
      /* drain */
    }

    expect(finalizeGenerationSpan).toHaveBeenCalledWith(
      "mock-span",
      expect.objectContaining({
        metadata: expect.objectContaining({ streamingEnabled: true }),
      }),
    );
  });

  it("propagates errors through logAIProviderError", async () => {
    const error = new Error("Stream connection failed");
    mockStreamText.mockRejectedValue(error);

    await expect(aiStreamText(sampleMessages)).rejects.toThrow(
      "Stream connection failed",
    );
  });
});

describe("aiStreamObject", () => {
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockClear();
  });

  const testSchema = z.object({
    question: z.string(),
    options: z.array(z.string()),
  });

  it("returns stream and object Promise with correct data", async () => {
    const mockData = { question: "Test?", options: ["A", "B"] };

    async function* textGen() {
      yield '{"question":"Test?",';
      yield '"options":["A","B"]}';
    }

    mockStreamText.mockResolvedValue({
      textStream: textGen(),
      output: Promise.resolve(mockData),
      usage: Promise.resolve({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      }),
      finishReason: Promise.resolve("stop"),
    });

    const result = await aiStreamObject(sampleMessages, testSchema);

    // Verify return structure
    expect(result).toHaveProperty("stream");
    expect(result).toHaveProperty("object");

    // Verify object Promise resolves correctly
    await expect(result.object).resolves.toEqual(mockData);

    // Verify stream produces chunks
    const chunks: string[] = [];
    const reader = result.stream.getReader();
    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      if (value) chunks.push(value);
    }
    expect(chunks).toEqual(['{"question":"Test?",', '"options":["A","B"]}']);
  });

  it("creates and finalizes Langfuse spans", async () => {
    const mockData = { question: "Observed", options: [] };

    async function* textGen() {
      yield "{}";
    }

    mockStreamText.mockResolvedValue({
      textStream: textGen(),
      output: Promise.resolve(mockData),
      usage: Promise.resolve({
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      }),
      finishReason: Promise.resolve("stop"),
    });

    const result = await aiStreamObject(sampleMessages, testSchema);

    // Drain the stream to complete it
    const reader = result.stream.getReader();
    while (!(await reader.read()).done) {
      /* drain */
    }

    // Wait for Promise.all to resolve and finalize
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(finalizeGenerationSpan).toHaveBeenCalledWith(
      "mock-span",
      expect.objectContaining({
        usage: { input: 20, output: 10, total: 30 },
        metadata: expect.objectContaining({
          streamingEnabled: true,
          structuredOutput: true,
        }),
      }),
    );
  });

  it("logs warning when Langfuse finalization fails", async () => {
    const langfuseError = new Error("Langfuse service unavailable");

    async function* textGen() {
      yield "{}";
    }

    // Mock promises that reject to simulate Langfuse error
    mockStreamText.mockResolvedValue({
      textStream: textGen(),
      output: Promise.reject(langfuseError),
      usage: Promise.resolve({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      }),
      finishReason: Promise.resolve("stop"),
    });

    const result = await aiStreamObject(sampleMessages, testSchema);

    // Drain stream
    const reader = result.stream.getReader();
    while (!(await reader.read()).done) {
      /* drain */
    }

    // Wait for Promise.all to reject and trigger catch block
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[aiStreamObject] Langfuse finalization failed:",
      langfuseError,
    );
  });

  it("propagates stream errors to consumer", async () => {
    const streamError = new Error("Stream processing failed");

    async function* errorGen() {
      yield "partial";
      throw streamError;
    }

    mockStreamText.mockResolvedValue({
      textStream: errorGen(),
      output: Promise.resolve({}),
      usage: Promise.resolve(undefined),
      finishReason: Promise.resolve("error"),
    });

    const result = await aiStreamObject(sampleMessages, testSchema);
    const reader = result.stream.getReader();

    // First read succeeds
    const first = await reader.read();
    expect(first.value).toBe("partial");

    // Second read propagates error
    await expect(reader.read()).rejects.toThrow("Stream processing failed");
  });

  it("propagates errors through logAIProviderError", async () => {
    const error = new Error("Object generation failed");
    mockStreamText.mockRejectedValue(error);

    await expect(aiStreamObject(sampleMessages, testSchema)).rejects.toThrow(
      "Object generation failed",
    );
  });
});
