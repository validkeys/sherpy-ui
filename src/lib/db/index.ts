import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

// Get database path from environment or use default
// Use :memory: in test mode to avoid creating files during tests
const isTestMode =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const dbPath =
  process.env.SHERPY_DB_PATH ||
  (isTestMode
    ? ":memory:"
    : path.join(os.homedir(), ".local/share/sherpy/sherpy.db"));

// Ensure database directory exists
if (dbPath !== ":memory:") {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[db] Created database directory: ${dbDir}`);
  }
}

export const db = new Database(dbPath);

// Enable WAL for better concurrency
db.pragma("journal_mode = WAL");

// Run migrations to ensure schema exists
runMigrations(db);

// Close on process exit
process.on("exit", () => db.close());
