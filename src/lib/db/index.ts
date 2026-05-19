import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_URL || ":memory:";
export const db = new Database(dbPath);

// Enable WAL for better concurrency
db.pragma("journal_mode = WAL");

// Close on process exit
process.on("exit", () => db.close());
