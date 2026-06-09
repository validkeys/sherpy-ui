import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockAiStreamText = vi.fn();
const mockAiStreamObject = vi.fn();

// Mock the AI SDK wrappers (the ./ai-client boundary)
vi.mock("./ai-client", () => ({
  aiStreamText: (...args: unknown[]) => mockAiStreamText(...args),
  aiStreamObject: (...args: unknown[]) => mockAiStreamObject(...args),
}));

// Mock feature flags
vi.mock("./feature-flags", () => ({
  isStructuredOutputEnabled: vi.fn(() => false), // Default: disabled
}));

// Mock step config — returns a Zod schema by default
vi.mock("../planning/step-config", () => ({
  getStepZodSchema: vi.fn(() => undefined),
}));

import { getStepZodSchema } from "../planning/step-config";
import { isStructuredOutputEnabled } from "./feature-flags";
import { streamQuestion } from "./streaming";

const sampleMessages = [{ role: "user", content: "Test" }];

function makeTextStream(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

async function readStream(stream: ReadableStream<string>): Promise<string[]> {
  const reader = stream.getReader();
  const out: string[] = [];
  let done = false;
  while (!done) {
    const { value, done: isDone } = await reader.read();
    done = isDone;
    if (value) out.push(value);
  }
  return out;
}

describe("streamQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStructuredOutputEnabled).mockReturnValue(false);
    vi.mocked(getStepZodSchema).mockReturnValue(undefined);
  });

  it("delegates to aiStreamText when structured output is disabled", async () => {
    const textStream = makeTextStream(["Hello ", "world!"]);
    mockAiStreamText.mockResolvedValue(textStream);

    const stream = await streamQuestion(sampleMessages, 1);

    expect(await readStream(stream)).toEqual(["Hello ", "world!"]);
    expect(mockAiStreamText).toHaveBeenCalledWith(sampleMessages, {
      traceMetadata: undefined,
    });
    expect(mockAiStreamObject).not.toHaveBeenCalled();
  });

  it("passes traceMetadata through to aiStreamText", async () => {
    mockAiStreamText.mockResolvedValue(makeTextStream(["x"]));

    const traceMetadata = { name: "interview-stream", sessionId: "proj-1" };
    await streamQuestion(sampleMessages, 1, traceMetadata);

    expect(mockAiStreamText).toHaveBeenCalledWith(sampleMessages, {
      traceMetadata,
    });
  });

  describe("Structured Output Support", () => {
    it("delegates to aiStreamObject when flag enabled and schema available", async () => {
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
      const schema = z.object({ question: z.string() });
      vi.mocked(getStepZodSchema).mockReturnValue(schema);

      const objectStream = makeTextStream(['{"question":"Test"}']);
      mockAiStreamObject.mockResolvedValue({ stream: objectStream });

      const stream = await streamQuestion(sampleMessages, 1);

      expect(await readStream(stream)).toEqual(['{"question":"Test"}']);
      expect(mockAiStreamObject).toHaveBeenCalledWith(sampleMessages, schema, {
        traceMetadata: undefined,
      });
      expect(mockAiStreamText).not.toHaveBeenCalled();
    });

    it("passes traceMetadata through to aiStreamObject", async () => {
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
      const schema = z.object({ question: z.string() });
      vi.mocked(getStepZodSchema).mockReturnValue(schema);
      mockAiStreamObject.mockResolvedValue({ stream: makeTextStream(["x"]) });

      const traceMetadata = { name: "interview-stream" };
      await streamQuestion(sampleMessages, 2, traceMetadata);

      expect(mockAiStreamObject).toHaveBeenCalledWith(sampleMessages, schema, {
        traceMetadata,
      });
    });

    it("falls back to aiStreamText when flag enabled but no schema", async () => {
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
      vi.mocked(getStepZodSchema).mockReturnValue(undefined);

      mockAiStreamText.mockResolvedValue(makeTextStream(["Fallback"]));

      const stream = await streamQuestion(sampleMessages, 4);

      expect(await readStream(stream)).toEqual(["Fallback"]);
      expect(mockAiStreamText).toHaveBeenCalled();
      expect(mockAiStreamObject).not.toHaveBeenCalled();
    });
  });
});
