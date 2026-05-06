import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Artifact } from "../types";
import { downloadArtifact } from "./download";

describe("downloadArtifact", () => {
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCreateElement: ReturnType<typeof vi.spyOn>;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockCreateElement = vi.spyOn(document, "createElement");
    mockCreateObjectURL = vi.fn(() => "blob:mock-url");
    mockRevokeObjectURL = vi.fn();

    mockCreateElement.mockReturnValue({
      click: mockClick,
      href: "",
      download: "",
    } as unknown as HTMLElement);

    global.URL.createObjectURL =
      mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL =
      mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads yaml artifact with .yaml extension", () => {
    const artifact: Artifact = {
      id: "test-1",
      projectId: "proj-1",
      key: "business-requirements",
      label: "Business Requirements",
      format: "yaml",
      content: "test: yaml content",
      status: "ready",
      generatedAt: new Date().toISOString(),
    };

    downloadArtifact(artifact);

    expect(mockCreateElement).toHaveBeenCalledWith("a");
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    // Verify filename
    const aElement = mockCreateElement.mock.results[0]
      .value as HTMLAnchorElement;
    expect(aElement.download).toBe("business-requirements.yaml");
  });

  it("downloads markdown artifact with .md extension", () => {
    const artifact: Artifact = {
      id: "test-2",
      projectId: "proj-1",
      key: "architecture",
      label: "Architecture",
      format: "markdown",
      content: "# Architecture",
      status: "ready",
      generatedAt: new Date().toISOString(),
    };

    downloadArtifact(artifact);

    const aElement = mockCreateElement.mock.results[0]
      .value as HTMLAnchorElement;
    expect(aElement.download).toBe("architecture.md");
  });

  it("creates blob with artifact content", () => {
    const artifact: Artifact = {
      id: "test-3",
      projectId: "proj-1",
      key: "test-doc",
      label: "Test Doc",
      format: "yaml",
      content: "specific: content\nlines: here",
      status: "ready",
      generatedAt: new Date().toISOString(),
    };

    downloadArtifact(artifact);

    const blobCall = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobCall.type).toBe("text/plain");
  });
});
