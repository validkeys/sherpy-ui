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

// Mock feature flags
vi.mock("./feature-flags", () => ({
  isStructuredOutputEnabled: vi.fn(() => false), // Default: disabled
}));

// Mock step config
vi.mock("../planning/step-config", () => ({
  getStepResponseSchema: vi.fn(() => ({
    type: "object",
    properties: { question: { type: "string" } },
  })),
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
    const stream = await streamQuestion(messages, 1);

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
    const stream = await streamQuestion(messages, 1);
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
    const stream = await streamQuestion(messages, 1);
    const reader = stream.getReader();

    // Should error on malformed JSON
    await expect(reader.read()).rejects.toThrow();
  });

  describe("Structured Output Support", () => {
    it("includes response_format when feature flag is enabled", async () => {
      const { isStructuredOutputEnabled } = await import("./feature-flags");
      const { getStepResponseSchema } = await import("../planning/step-config");

      // Enable structured output for step 1
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
      vi.mocked(getStepResponseSchema).mockReturnValue({
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array" },
        },
      });

      async function* mockStream() {
        yield {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: "content_block_delta",
                delta: { text: '{"question":"Test"}' },
              }),
            ),
          },
        };
      }

      const mockResponse = { body: mockStream() };
      vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
        mockResponse as never,
      );

      const messages = [{ role: "user", content: "Test" }];
      await streamQuestion(messages, 1); // stepNumber = 1

      // Verify response_format was added to body
      const callArgs = vi.mocked(bedrockModule.bedrockClient.send).mock
        .calls[0];
      const command = callArgs[0] as InvokeModelWithResponseStreamCommand;
      const body = JSON.parse(command.input.body as string);

      expect(body.response_format).toBeDefined();
      expect(body.response_format.type).toBe("json_schema");
      expect(body.response_format.json_schema).toBeDefined();
    });

    it("omits response_format when feature flag is disabled", async () => {
      const { isStructuredOutputEnabled } = await import("./feature-flags");

      // Disable structured output
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(false);

      async function* mockStream() {
        yield {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: "content_block_delta",
                delta: { text: "Text mode response" },
              }),
            ),
          },
        };
      }

      const mockResponse = { body: mockStream() };
      vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
        mockResponse as never,
      );

      const messages = [{ role: "user", content: "Test" }];
      await streamQuestion(messages, 1);

      // Verify response_format was NOT added
      const callArgs = vi.mocked(bedrockModule.bedrockClient.send).mock
        .calls[0];
      const command = callArgs[0] as InvokeModelWithResponseStreamCommand;
      const body = JSON.parse(command.input.body as string);

      expect(body.response_format).toBeUndefined();
    });

    it("omits response_format when schema is not available", async () => {
      const { isStructuredOutputEnabled } = await import("./feature-flags");
      const { getStepResponseSchema } = await import("../planning/step-config");

      // Enable flag but no schema available
      vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
      vi.mocked(getStepResponseSchema).mockReturnValue(undefined);

      async function* mockStream() {
        yield {
          chunk: {
            bytes: new TextEncoder().encode(
              JSON.stringify({
                type: "content_block_delta",
                delta: { text: "Fallback" },
              }),
            ),
          },
        };
      }

      const mockResponse = { body: mockStream() };
      vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
        mockResponse as never,
      );

      const messages = [{ role: "user", content: "Test" }];
      await streamQuestion(messages, 4); // Step 4 has no schema

      // Verify response_format was NOT added (schema unavailable)
      const callArgs = vi.mocked(bedrockModule.bedrockClient.send).mock
        .calls[0];
      const command = callArgs[0] as InvokeModelWithResponseStreamCommand;
      const body = JSON.parse(command.input.body as string);

      expect(body.response_format).toBeUndefined();
    });
  });
});
