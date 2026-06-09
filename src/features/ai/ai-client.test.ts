import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockGenerateText = vi.fn();
const mockStreamText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  streamText: (...args: unknown[]) => mockStreamText(...args),
}));

vi.mock("@/lib/ai-provider", () => ({
  getBedrockModel: vi.fn(() => "mock-model"),
  BEDROCK_MODEL_ID: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
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
import { aiGenerateObject, aiGenerateText, aiStreamText } from "./ai-client";

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
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      finishReason: "stop",
    });

    const result = await aiGenerateText(sampleMessages);

    expect(result).toBe("Hello from Claude!");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        maxTokens: 512,
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
        maxTokens: 1024,
        temperature: 0.7,
      }),
    );
  });

  it("calls Langfuse observability helpers", async () => {
    mockGenerateText.mockResolvedValue({
      text: "observed",
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
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
      usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
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
        maxTokens: 2048,
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
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
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
      onChunkInternal({ chunk: { type: "text-delta", textDelta: "Hi" } });
      onChunkInternal({ chunk: { type: "text-delta", textDelta: "!" } });

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
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
        finishReason: "stop",
      });

      async function* textGen() {
        yield "done";
      }

      return Promise.resolve({
        textStream: textGen(),
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
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
