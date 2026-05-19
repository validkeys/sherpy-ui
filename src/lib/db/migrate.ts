import type Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

export function runMigrations(db: Database.Database): void {
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}
