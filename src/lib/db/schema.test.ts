import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

describe("schema.sql", () => {
  it("loads without syntax errors", () => {
    const db = new Database(":memory:");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    expect(() => db.exec(schema)).not.toThrow();
    db.close();
  });

  it("creates all 5 required tables", () => {
    const db = new Database(":memory:");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("planning_state");
    expect(tableNames).toContain("interview_answers");
    expect(tableNames).toContain("form_responses");
    expect(tableNames).toContain("artifacts");
    expect(tableNames).toHaveLength(5);

    db.close();
  });

  it("creates indexes for projects table", () => {
    const db = new Database(":memory:");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects'",
      )
      .all() as Array<{ name: string }>;

    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain("idx_projects_status");
    expect(indexNames).toContain("idx_projects_last_touched");

    db.close();
  });

  it("enforces foreign key constraints", () => {
    const db = new Database(":memory:");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);
    db.pragma("foreign_keys = ON");

    // Should fail: insert into planning_state without corresponding project
    expect(() => {
      db.prepare(
        "INSERT INTO planning_state (project_id, xstate_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ).run(
        "nonexistent",
        "{}",
        "2026-05-19T10:00:00Z",
        "2026-05-19T10:00:00Z",
      );
    }).toThrow();

    db.close();
  });

  it("enforces CHECK constraints on projects table", () => {
    const db = new Database(":memory:");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);

    // Should fail: invalid status
    expect(() => {
      db.prepare(
        "INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "test-id",
        "SHR-0001",
        "Test",
        "invalid",
        "scratch",
        1,
        "2026-05-19T10:00:00Z",
        "2026-05-19T10:00:00Z",
      );
    }).toThrow();

    // Should fail: invalid entry_path
    expect(() => {
      db.prepare(
        "INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "test-id-2",
        "SHR-0002",
        "Test",
        "active",
        "invalid",
        1,
        "2026-05-19T10:00:00Z",
        "2026-05-19T10:00:00Z",
      );
    }).toThrow();

    // Should fail: current_step out of range
    expect(() => {
      db.prepare(
        "INSERT INTO projects (id, code, name, status, entry_path, current_step, created_at, last_touched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        "test-id-3",
        "SHR-0003",
        "Test",
        "active",
        "scratch",
        0,
        "2026-05-19T10:00:00Z",
        "2026-05-19T10:00:00Z",
      );
    }).toThrow();

    db.close();
  });
});
