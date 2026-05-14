/**
 * Environment Configuration & Safety Tests
 *
 * Ensures seeding cannot happen in production and provides audit logging.
 */

import { auditLog, checkSeedingAllowed, getFixtureConfig } from "./config";

describe("Fixture configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("disallows seeding in production", () => {
    process.env.NODE_ENV = "production";
    const config = getFixtureConfig();

    expect(config.allowSeeding).toBe(false);
  });

  it("allows seeding in development with explicit flag", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_TEST_DATA = "true";

    const config = getFixtureConfig();

    expect(config.allowSeeding).toBe(true);
  });

  it("requires explicit flag in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_TEST_DATA;

    const config = getFixtureConfig();

    expect(config.allowSeeding).toBe(false);
  });

  it("allows seeding in test environment without explicit flag", () => {
    process.env.NODE_ENV = "test";
    delete process.env.ALLOW_TEST_DATA;

    const config = getFixtureConfig();

    expect(config.allowSeeding).toBe(true);
  });

  it("returns audit logging enabled flag", () => {
    const config = getFixtureConfig();

    expect(config.auditLogging).toBe(true);
  });
});

describe("checkSeedingAllowed", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("blocks production environment", () => {
    process.env.NODE_ENV = "production";

    const result = checkSeedingAllowed();

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    expect(result?.error).toContain("disabled in production");
  });

  it("blocks development without explicit flag", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_TEST_DATA;

    const result = checkSeedingAllowed();

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    expect(result?.error).toContain("ALLOW_TEST_DATA");
  });

  it("allows development with explicit flag", () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_TEST_DATA = "true";

    const result = checkSeedingAllowed();

    expect(result).toBeNull();
  });

  it("allows test environment", () => {
    process.env.NODE_ENV = "test";

    const result = checkSeedingAllowed();

    expect(result).toBeNull();
  });
});

describe("auditLog", () => {
  const originalEnv = process.env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("logs seeding operations with timestamp", () => {
    auditLog("Created test project", { step: 3, projectId: "test-123" });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Fixture] Created test project",
      expect.objectContaining({
        timestamp: expect.any(String),
        operation: "Created test project",
        step: 3,
        projectId: "test-123",
      }),
    );
  });

  it("logs operations without additional details", () => {
    auditLog("Cleared test data");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Fixture] Cleared test data",
      expect.objectContaining({
        timestamp: expect.any(String),
        operation: "Cleared test data",
      }),
    );
  });

  it("includes ISO timestamp", () => {
    auditLog("Test operation");

    const logCall = consoleLogSpy.mock.calls[0][1] as { timestamp: string };
    expect(logCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
