import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

// Mock the schema to avoid file system issues in tests
const getSchemaPath = () => path.join(__dirname, "schema.sql");

describe("migrate", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = new Database(":memory:");
  });

  it("creates all 5 tables when schema is applied", () => {
    // Read and apply schema
    const schema = fs.readFileSync(getSchemaPath(), "utf8");
    testDb.exec(schema);

    const tables = testDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toHaveLength(5);
    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("planning_state");
    expect(tableNames).toContain("interview_answers");
    expect(tableNames).toContain("form_responses");
    expect(tableNames).toContain("artifacts");

    testDb.close();
  });

  it("is idempotent - can run multiple times safely", () => {
    const schema = fs.readFileSync(getSchemaPath(), "utf8");

    // First run
    testDb.exec(schema);
    const tablesAfterFirst = testDb
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get() as { count: number };

    // Second run should not throw (schema uses IF NOT EXISTS)
    expect(() => testDb.exec(schema)).not.toThrow();

    const tablesAfterSecond = testDb
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get() as { count: number };

    expect(tablesAfterFirst.count).toBe(5);
    expect(tablesAfterSecond.count).toBe(5);

    testDb.close();
  });
});

describe("runMigrations function", () => {
  it("creates tables when called", async () => {
    // Import runMigrations dynamically to avoid side effects
    const { runMigrations } = await import("./migrate");
    const testDb = new Database(":memory:");

    runMigrations(testDb);

    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;

    expect(tables).toHaveLength(5);
    testDb.close();
  });

  it("can be called multiple times safely", async () => {
    const { runMigrations } = await import("./migrate");
    const testDb = new Database(":memory:");

    // First run
    runMigrations(testDb);
    const tablesAfterFirst = testDb
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get() as { count: number };

    // Second run should not throw
    expect(() => runMigrations(testDb)).not.toThrow();

    const tablesAfterSecond = testDb
      .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      .get() as { count: number };

    expect(tablesAfterFirst.count).toBe(5);
    expect(tablesAfterSecond.count).toBe(5);

    testDb.close();
  });
});
