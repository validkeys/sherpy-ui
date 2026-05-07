import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bedrockModule from "@/lib/bedrock";
import * as artifactStore from "../artifacts/store";
import { buildArtifactPrompt, buildInterviewPrompt } from "./prompts";
import { generateArtifact, generateText } from "./server";

// Mock the bedrock client
vi.mock("@/lib/bedrock", () => ({
  bedrockClient: {
    send: vi.fn(),
  },
  BEDROCK_MODEL_ID: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-id-123"),
}));

// Spy on artifact store
vi.spyOn(artifactStore, "upsertArtifact");

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

describe("buildArtifactPrompt", () => {
  it("includes step name and number", () => {
    const messages = buildArtifactPrompt("Project Vision", 1, [
      "Build a collaborative planning tool",
    ]);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Project Vision");
    expect(allContent).toContain("step completed: 1");
  });

  it("includes all answers", () => {
    const answers = [
      "Build a collaborative planning tool",
      "Target product managers",
    ];
    const messages = buildArtifactPrompt("Project Vision", 1, answers);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Answers collected");
    expect(allContent).toContain(answers[0]);
    expect(allContent).toContain(answers[1]);
  });

  it("requests YAML format", () => {
    const messages = buildArtifactPrompt("Project Vision", 1, ["Test answer"]);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("YAML");
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

describe("generateArtifact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates artifact and stores it", async () => {
    const mockArtifactContent = `version: "1.0.0"
project_vision: Build a collaborative planning tool
target_audience: Product managers`;

    const mockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: mockArtifactContent }],
        }),
      ),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const result = await generateArtifact("test-project", 1, [
      "Build a collaborative planning tool",
    ]);

    expect(result.projectId).toBe("test-project");
    expect(result.key).toBe("project-vision");
    expect(result.label).toBe("Define Project Vision");
    expect(result.format).toBe("yaml");
    expect(result.content).toBe(mockArtifactContent);
    expect(result.status).toBe("ready");
    expect(artifactStore.upsertArtifact).toHaveBeenCalledWith(result);
  });

  it("throws on invalid step number", async () => {
    await expect(
      generateArtifact("test-project", 99, ["Test"]),
    ).rejects.toThrow("Invalid step number");
  });

  it("uses correct artifact key for each step", async () => {
    const mockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: "artifact content" }],
        }),
      ),
    };

    vi.mocked(bedrockModule.bedrockClient.send).mockResolvedValue(
      mockResponse as never,
    );

    const result = await generateArtifact("test-project", 3, ["Feature list"]);

    expect(result.key).toBe("core-features");
    expect(result.label).toBe("List Core Features");
  });
});
