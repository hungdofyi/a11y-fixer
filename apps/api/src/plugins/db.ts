import type { FastifyPluginAsync } from 'fastify';
import { createDb, type AppDatabase } from '@a11y-fixer/core';

/** Augment FastifyInstance with db property */
declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
  }
}

/** Fastify plugin: decorates fastify with a SQLite DB instance */
const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const dbPath = process.env['A11Y_DB_PATH'] ?? '.a11y-fixer.db';
  const db = createDb(dbPath);
  fastify.decorate('db', db);
};

export default dbPlugin;
