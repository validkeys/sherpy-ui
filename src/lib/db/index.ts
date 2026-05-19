import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

const dbPath = process.env.DATABASE_URL || ":memory:";
export const db = new Database(dbPath);

// Enable WAL for better concurrency
db.pragma("journal_mode = WAL");

// Run migrations to ensure schema exists
runMigrations(db);

// Close on process exit
process.on("exit", () => db.close());
