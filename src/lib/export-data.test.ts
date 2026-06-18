import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportLocalStorageData } from "./export-data";

describe("exportLocalStorageData", () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock URL methods
    mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock DOM methods
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    // Mock createElement to return element with click method
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = mockClick;
      }
      return element;
    });

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    // Reset console spies
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports data when localStorage contains valid JSON", () => {
    const projectId = "test-project-123";
    const mockData = { value: "step1", context: { answers: [] } };

    vi.mocked(global.localStorage.getItem).mockReturnValue(
      JSON.stringify(mockData),
    );

    exportLocalStorageData(projectId);

    // Verify localStorage was queried with correct key
    expect(global.localStorage.getItem).toHaveBeenCalledWith(
      `planning-machine-${projectId}`,
    );

    // Verify blob was created with formatted JSON
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    // Verify download link was created and clicked
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();

    // Verify URL was revoked (cleanup)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    // Verify success log
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Successfully exported"),
      projectId,
    );
  });

  it("logs error and returns early when no data found", () => {
    vi.mocked(global.localStorage.getItem).mockReturnValue(null);

    exportLocalStorageData("nonexistent-project");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("No data found"),
      "nonexistent-project",
    );

    // Should not attempt to create blob
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  it("handles invalid JSON gracefully", () => {
    vi.mocked(global.localStorage.getItem).mockReturnValue("invalid json {");

    exportLocalStorageData("test-project");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to export"),
      expect.any(SyntaxError),
    );

    // Should not create download link
    expect(mockClick).not.toHaveBeenCalled();
  });

  it("creates download with timestamped filename", () => {
    const projectId = "test-123";
    const mockData = { test: "data" };
    const mockNow = 1234567890000;

    vi.mocked(global.localStorage.getItem).mockReturnValue(
      JSON.stringify(mockData),
    );
    vi.spyOn(Date, "now").mockReturnValue(mockNow);

    exportLocalStorageData(projectId);

    // Check that createElement was called and anchor element was configured
    expect(document.createElement).toHaveBeenCalledWith("a");

    // Verify the anchor element properties were set correctly
    const createElementCalls = vi.mocked(document.createElement).mock.results;
    const anchorElement = createElementCalls.find(
      (call) => call.value?.tagName === "A",
    )?.value as HTMLAnchorElement;

    expect(anchorElement.download).toBe(
      `sherpy-project-${projectId}-backup-${mockNow}.json`,
    );
    expect(anchorElement.href).toBe("blob:mock-url");
  });

  it("formats JSON with proper indentation", () => {
    const projectId = "test-project";
    const mockData = { a: 1, b: { c: 2 } };

    vi.mocked(global.localStorage.getItem).mockReturnValue(
      JSON.stringify(mockData),
    );

    exportLocalStorageData(projectId);

    // Check that the blob was created with formatted JSON
    const blobCall = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobCall.type).toBe("application/json");

    // Read blob content to verify formatting
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      expect(content).toContain("\n"); // Should have newlines from pretty-print
      expect(content).toContain("  "); // Should have 2-space indentation
    };
    reader.readAsText(blobCall);
  });

  it("cleans up DOM and URL resources", () => {
    const projectId = "test-project";
    const mockData = { test: "data" };

    vi.mocked(global.localStorage.getItem).mockReturnValue(
      JSON.stringify(mockData),
    );

    exportLocalStorageData(projectId);

    // Verify the anchor element was added then removed
    expect(mockAppendChild).toHaveBeenCalledTimes(1);
    expect(mockRemoveChild).toHaveBeenCalledTimes(1);

    // Verify the same element was added and removed
    const addedElement = mockAppendChild.mock.calls[0][0];
    const removedElement = mockRemoveChild.mock.calls[0][0];
    expect(addedElement).toBe(removedElement);

    // Verify URL was revoked
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
