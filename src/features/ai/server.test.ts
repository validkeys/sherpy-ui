import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bedrockModule from "@/lib/bedrock";
import { buildInterviewPrompt } from "./prompts";
import { generateText } from "./server";

// Mock the bedrock client
vi.mock("@/lib/bedrock", () => ({
  bedrockClient: {
    send: vi.fn(),
  },
  BEDROCK_MODEL_ID: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}));

describe("buildInterviewPrompt", () => {
  it("includes step name in output", () => {
    const messages = buildInterviewPrompt("Define Project Vision", 1, []);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Define Project Vision");
    expect(allContent).toContain("step: 1");
  });

  it("includes previous answers", () => {
    const messages = buildInterviewPrompt("Define Project Vision", 1, [
      "Answer one",
      "Answer two",
    ]);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Previous answers");
    expect(allContent).toContain("Answer one");
    expect(allContent).toContain("Answer two");
  });
});

describe("generateText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns question text from Bedrock response", async () => {
    const mockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: "What is your project vision?" }],
        }),
      ),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const messages = [{ role: "user", content: "Test prompt" }];
    const result = await generateText(messages);

    expect(result).toBe("What is your project vision?");
    expect(bedrockModule.bedrockClient.send).toHaveBeenCalledWith(
      expect.any(InvokeModelCommand),
    );
  });

  it("sends correct request shape to Bedrock", async () => {
    const mockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: "Response" }],
        }),
      ),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const messages = [
      { role: "user", content: "Test" },
      { role: "assistant", content: "Got it" },
    ];
    await generateText(messages);

    const call = vi.mocked(bedrockModule.bedrockClient.send).mock.calls[0];
    const command = call[0] as InvokeModelCommand;
    const bodyString =
      typeof command.input.body === "string"
        ? command.input.body
        : new TextDecoder().decode(command.input.body as Uint8Array);
    const body = JSON.parse(bodyString);

    expect(body.anthropic_version).toBe("bedrock-2023-05-31");
    expect(body.max_tokens).toBe(512);
    expect(body.messages).toEqual(messages);
  });
});
