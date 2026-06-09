import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as artifactStore from "../artifacts/store";
import { MOCK_ARTIFACT_PROVENANCE } from "./mock-artifacts";
import {
  buildArtifactPrompt,
  buildGapAnalysisAssessmentPrompt,
  buildInterviewPrompt,
} from "./prompts";
import { generateArtifact, generateText } from "./server";

// --- Mocks: mock at the ai-client boundary, not at the Bedrock SDK ---

const { mockAiGenerateText, mockAiGenerateObject } = vi.hoisted(() => ({
  mockAiGenerateText: vi.fn(),
  mockAiGenerateObject: vi.fn(),
}));

vi.mock("./ai-client", () => ({
  aiGenerateText: (...args: unknown[]) => mockAiGenerateText(...args),
  aiGenerateObject: (...args: unknown[]) => mockAiGenerateObject(...args),
}));

// Mock feature flags
vi.mock("./feature-flags", () => ({
  isStructuredOutputEnabled: vi.fn(() => false), // Default: disabled
}));

// Mock step config — keep real implementations, override getStepZodSchema
vi.mock("../planning/step-config", async () => {
  const actual = await vi.importActual("../planning/step-config");
  return {
    ...actual,
    getStepZodSchema: vi.fn(() => undefined), // Default: no schema
  };
});

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "mock-id-123"),
}));

// Spy on artifact store
vi.spyOn(artifactStore, "upsertArtifact");

const sampleMessages = [{ role: "user", content: "Test prompt" }];

describe("buildInterviewPrompt", () => {
  it("includes step name in output", () => {
    const messages = buildInterviewPrompt("Gap Analysis Worksheet", 1, []);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Gap Analysis Worksheet");
  });

  it("includes previous answers", () => {
    const messages = buildInterviewPrompt("Gap Analysis Worksheet", 1, [
      "Answer one",
      "Answer two",
    ]);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Previous answers");
    expect(allContent).toContain("Answer one");
    expect(allContent).toContain("Answer two");
  });

  it("includes project overview for step 2+", () => {
    const messages = buildInterviewPrompt(
      "Business Requirements Interview",
      2,
      [],
      "Build a mobile app for task management",
    );

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("PROJECT CONTEXT");
    expect(allContent).toContain("Build a mobile app for task management");
  });
});

describe("buildArtifactPrompt", () => {
  it("includes step name in prompt", () => {
    const messages = buildArtifactPrompt("Gap Analysis Worksheet", 1, [
      "Build a collaborative planning tool",
    ]);

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Gap Analysis Worksheet");
    expect(allContent).toContain("Build a collaborative planning tool");
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

  it("delegates to aiGenerateText for plain text", async () => {
    mockAiGenerateText.mockResolvedValue("What is your project vision?");

    const result = await generateText(sampleMessages, 1);

    expect(result).toBe("What is your project vision?");
    expect(mockAiGenerateText).toHaveBeenCalledWith(
      sampleMessages,
      expect.objectContaining({
        traceMetadata: undefined,
        providerContext: undefined,
      }),
    );
    expect(mockAiGenerateObject).not.toHaveBeenCalled();
  });

  it("passes traceMetadata and providerContext through", async () => {
    mockAiGenerateText.mockResolvedValue("response");

    const traceMetadata = { name: "test", sessionId: "proj-1" };
    const providerContext = {
      operation: "generateText" as const,
      stepNumber: 2,
    };

    await generateText(sampleMessages, 2, traceMetadata, providerContext);

    expect(mockAiGenerateText).toHaveBeenCalledWith(sampleMessages, {
      traceMetadata,
      providerContext,
    });
  });

  it("propagates errors from aiGenerateText", async () => {
    mockAiGenerateText.mockRejectedValue(new Error("Connection failed"));

    await expect(generateText(sampleMessages, 1)).rejects.toThrow(
      "Connection failed",
    );
  });
});

describe("generateArtifact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates artifact and stores it", async () => {
    const mockArtifactContent = `version: "1.0.0"
project_vision: Build a collaborative planning tool
target_audience: Product managers`;

    mockAiGenerateText.mockResolvedValue(mockArtifactContent);

    const result = await generateArtifact("test-project", 1, [
      "Build a collaborative planning tool",
    ]);

    expect(result.projectId).toBe("test-project");
    expect(result.key).toBe("gap-analysis");
    expect(result.label).toBe("Gap Analysis Worksheet");
    expect(result.format).toBe("markdown");
    expect(result.content).toBe(mockArtifactContent);
    expect(result.status).toBe("ready");
    expect(artifactStore.upsertArtifact).toHaveBeenCalledWith(result);
    expect(mockAiGenerateText).toHaveBeenCalled();
  });

  it("throws on invalid step number", async () => {
    await expect(
      generateArtifact("test-project", 99, ["Test"]),
    ).rejects.toThrow("Invalid step number");
  });

  it("uses correct artifact key for each step", async () => {
    mockAiGenerateText.mockResolvedValue("artifact content");

    const result = await generateArtifact("test-project", 3, ["Feature list"]);

    expect(result.key).toBe("technical-requirements");
    expect(result.label).toBe("Technical Requirements Interview");
  });

  it("generates deterministic mock artifacts without calling AI", async () => {
    vi.stubEnv("USE_MOCK_ARTIFACTS", "true");
    vi.stubEnv("NODE_ENV", "test");

    const result = await generateArtifact("test-project", 2, [
      "Engineering leads need delivery planning.",
      "The outcome is a delivery-ready plan.",
      "Success means fewer missed dependencies.",
      "This fourth answer should not appear in the preview.",
    ]);

    expect(mockAiGenerateText).not.toHaveBeenCalled();
    expect(result.projectId).toBe("test-project");
    expect(result.key).toBe("business-requirements");
    expect(result.label).toBe("Business Requirements Interview");
    expect(result.format).toBe("yaml");
    expect(result.status).toBe("ready");
    expect(result.content).toContain(MOCK_ARTIFACT_PROVENANCE);
    expect(result.content).toContain("provider: mock");
    expect(result.content).toContain("answer_count: 4");
    expect(result.content).toContain(
      "Engineering leads need delivery planning.",
    );
    expect(result.content).toContain("The outcome is a delivery-ready plan.");
    expect(result.content).toContain(
      "Success means fewer missed dependencies.",
    );
    expect(result.content).not.toContain("This fourth answer");
    expect(artifactStore.upsertArtifact).toHaveBeenCalledWith(result);
  });

  it("rejects mock artifacts in production", async () => {
    vi.stubEnv("USE_MOCK_ARTIFACTS", "true");
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      generateArtifact("test-project", 2, ["Test answer"]),
    ).rejects.toThrow(
      "USE_MOCK_ARTIFACTS=true is not allowed when NODE_ENV=production",
    );

    expect(mockAiGenerateText).not.toHaveBeenCalled();
    expect(artifactStore.upsertArtifact).not.toHaveBeenCalled();
  });
});

describe("Structured Output Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses aiGenerateObject when feature flag is enabled", async () => {
    const { isStructuredOutputEnabled } = await import("./feature-flags");
    const { getStepZodSchema } = await import("../planning/step-config");
    const mockSchema = z.object({
      question: z.string(),
      options: z.array(z.string()),
    });

    vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
    vi.mocked(getStepZodSchema).mockReturnValue(mockSchema);

    const mockObject = { question: "Test question", options: ["A", "B"] };
    mockAiGenerateObject.mockResolvedValue(mockObject);

    const result = await generateText(sampleMessages, 1);

    expect(mockAiGenerateObject).toHaveBeenCalledWith(
      sampleMessages,
      mockSchema,
      expect.objectContaining({
        traceMetadata: undefined,
        providerContext: undefined,
      }),
    );
    expect(mockAiGenerateText).not.toHaveBeenCalled();
    expect(result).toBe(JSON.stringify(mockObject));
  });

  it("uses aiGenerateText when feature flag is disabled", async () => {
    const { isStructuredOutputEnabled } = await import("./feature-flags");

    vi.mocked(isStructuredOutputEnabled).mockReturnValue(false);
    mockAiGenerateText.mockResolvedValue("Text mode response");

    const result = await generateText(sampleMessages, 1);

    expect(mockAiGenerateText).toHaveBeenCalled();
    expect(mockAiGenerateObject).not.toHaveBeenCalled();
    expect(result).toBe("Text mode response");
  });

  it("falls back to aiGenerateText when no Zod schema available", async () => {
    const { isStructuredOutputEnabled } = await import("./feature-flags");
    const { getStepZodSchema } = await import("../planning/step-config");

    vi.mocked(isStructuredOutputEnabled).mockReturnValue(true);
    vi.mocked(getStepZodSchema).mockReturnValue(undefined);

    mockAiGenerateText.mockResolvedValue("Fallback");

    const result = await generateText(sampleMessages, 4); // Step 4 has no schema

    expect(mockAiGenerateText).toHaveBeenCalled();
    expect(mockAiGenerateObject).not.toHaveBeenCalled();
    expect(result).toBe("Fallback");
  });
});

describe("buildGapAnalysisAssessmentPrompt", () => {
  it("includes project description in prompt", () => {
    const messages = buildGapAnalysisAssessmentPrompt(
      "Build a todo list app from scratch",
      "No",
    );

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("Build a todo list app from scratch");
    expect(allContent).toContain("Gap Analysis Decision Rules");
  });

  it("includes decision rules for greenfield and existing requirements", () => {
    const messages = buildGapAnalysisAssessmentPrompt("Some project", "Yes");

    const allContent = messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("SKIP gap analysis");
    expect(allContent).toContain("RUN gap analysis");
    expect(allContent).toContain("greenfield");
    expect(allContent).toContain("existing requirements");
  });
});
