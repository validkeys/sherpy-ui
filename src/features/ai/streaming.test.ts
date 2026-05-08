import { InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bedrockModule from "@/lib/bedrock";
import { streamQuestion } from "./streaming";

// Mock the bedrock client
vi.mock("@/lib/bedrock", () => ({
  bedrockClient: {
    send: vi.fn(),
  },
  BEDROCK_MODEL_ID: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}));

describe("streamQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yields chunks from mocked ResponseStream", async () => {
    // Create async iterator for mocked stream
    async function* mockStream() {
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              type: "content_block_delta",
              delta: { text: "Hello " },
            }),
          ),
        },
      };
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              type: "content_block_delta",
              delta: { text: "world!" },
            }),
          ),
        },
      };
    }

    const mockResponse = {
      body: mockStream(),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const messages = [{ role: "user", content: "Test" }];
    const stream = await streamQuestion(messages);

    // Read chunks from stream
    const reader = stream.getReader();
    const chunks: string[] = [];

    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      done = isDone;
      if (value) chunks.push(value);
    }

    expect(chunks).toEqual(["Hello ", "world!"]);
    expect(bedrockModule.bedrockClient.send).toHaveBeenCalledWith(
      expect.any(InvokeModelWithResponseStreamCommand),
    );
  });

  it("closes stream when ResponseStream is exhausted", async () => {
    async function* mockStream() {
      yield {
        chunk: {
          bytes: new TextEncoder().encode(
            JSON.stringify({
              type: "content_block_delta",
              delta: { text: "Done" },
            }),
          ),
        },
      };
    }

    const mockResponse = {
      body: mockStream(),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const messages = [{ role: "user", content: "Test" }];
    const stream = await streamQuestion(messages);
    const reader = stream.getReader();

    // Read all chunks
    await reader.read(); // 'Done'
    const final = await reader.read();

    expect(final.done).toBe(true);
  });

  it("handles malformed JSON in chunk bytes", async () => {
    async function* mockStream() {
      yield {
        chunk: {
          bytes: new TextEncoder().encode("invalid json"),
        },
      };
    }

    const mockResponse = {
      body: mockStream(),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const messages = [{ role: "user", content: "Test" }];
    const stream = await streamQuestion(messages);
    const reader = stream.getReader();

    // Should error on malformed JSON
    await expect(reader.read()).rejects.toThrow();
  });
});
