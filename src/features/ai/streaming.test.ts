import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mockAiStreamText = vi.fn();
const mockAiStreamObject = vi.fn();

// Mock the AI SDK wrappers (the ./ai-client boundary)
vi.mock("./ai-client", () => ({
  aiStreamText: (...args: unknown[]) => mockAiStreamText(...args),
  aiStreamObject: (...args: unknown[]) => mockAiStreamObject(...args),
}));

// Mock step config — controls whether structured output is used
vi.mock("../planning/step-config", () => ({
  getStepZodSchema: vi.fn(() => undefined),
}));

import { getStepZodSchema } from "../planning/step-config";
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
    vi.mocked(getStepZodSchema).mockReturnValue(undefined);
  });

  it("delegates to aiStreamText when no schema available", async () => {
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
    it("delegates to aiStreamObject when schema available", async () => {
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
      const schema = z.object({ question: z.string() });
      vi.mocked(getStepZodSchema).mockReturnValue(schema);
      mockAiStreamObject.mockResolvedValue({ stream: makeTextStream(["x"]) });

      const traceMetadata = { name: "interview-stream" };
      await streamQuestion(sampleMessages, 2, traceMetadata);

      expect(mockAiStreamObject).toHaveBeenCalledWith(sampleMessages, schema, {
        traceMetadata,
      });
    });

    it("falls back to aiStreamText when no schema", async () => {
      vi.mocked(getStepZodSchema).mockReturnValue(undefined);

      mockAiStreamText.mockResolvedValue(makeTextStream(["Fallback"]));

      const stream = await streamQuestion(sampleMessages, 4);

      expect(await readStream(stream)).toEqual(["Fallback"]);
      expect(mockAiStreamText).toHaveBeenCalled();
      expect(mockAiStreamObject).not.toHaveBeenCalled();
    });
  });
});
