import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

/** Create tables if they don't exist (safe DDL, no user input) */
function ensureTables(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT,
      repo_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      scan_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      config TEXT,
      started_at TEXT,
      completed_at TEXT,
      total_pages INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL REFERENCES scans(id),
      rule_id TEXT NOT NULL,
      wcag_criteria TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      element TEXT,
      selector TEXT,
      html TEXT,
      page_url TEXT,
      file_path TEXT,
      line INTEGER,
      "column" INTEGER,
      fix_suggestion TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vpat_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      scan_id INTEGER REFERENCES scans(id),
      criterion_id TEXT NOT NULL,
      standard TEXT NOT NULL,
      conformance_status TEXT NOT NULL,
      remarks TEXT NOT NULL,
      evidence TEXT,
      remediation_plan TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Create a Drizzle ORM instance connected to the given SQLite file */
export function createDb(filePath: string) {
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  ensureTables(sqlite);
  return drizzle(sqlite, { schema });
}

export type AppDatabase = ReturnType<typeof createDb>;
