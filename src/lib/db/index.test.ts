import { describe, expect, it } from "vitest";
import { db } from "./index";

describe("database module", () => {
  it("can import db without error", () => {
    expect(db).toBeDefined();
  });

  it("db.exec() runs without error", () => {
    expect(() => {
      db.exec("SELECT 1");
    }).not.toThrow();
  });

  it("has appropriate journal mode enabled", () => {
    const result = db.pragma("journal_mode", { simple: true });
    // In-memory databases use "memory" mode, file-based use "wal"
    const dbPath = process.env.DATABASE_URL || ":memory:";
    if (dbPath === ":memory:") {
      expect(result).toBe("memory");
    } else {
      expect(result).toBe("wal");
    }
  });
});
