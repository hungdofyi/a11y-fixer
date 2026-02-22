import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

/** Create a Drizzle ORM instance connected to the given SQLite file */
export function createDb(filePath: string) {
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export type AppDatabase = ReturnType<typeof createDb>;
