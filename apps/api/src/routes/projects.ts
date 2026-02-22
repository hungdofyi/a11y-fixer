import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { eq, sql, desc } from 'drizzle-orm';
import { projects, scans, issues, vpatEntries } from '@a11y-fixer/core';

/** CRUD routes for projects resource */
const projectsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / - list all projects
  fastify.get('/', async (_req, reply) => {
    const rows = await fastify.db.select().from(projects);
    reply.send(rows);
  });

  // POST / - create a project
  fastify.post<{ Body: { name: string; url?: string } }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            url: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { name, url } = req.body;
      const rows = await fastify.db
        .insert(projects)
        .values({ name, url: url ?? null, createdAt: new Date().toISOString() })
        .returning();
      reply.code(201).send(rows[0]);
    },
  );

  // GET /:id - project detail with scan count
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const [project] = await fastify.db.select().from(projects).where(eq(projects.id, id));
    if (!project) {
      return reply.code(404).send({ error: 'Not found' });
    }
    const [countRow] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(scans)
      .where(eq(scans.projectId, id));
    reply.send({ ...project, scanCount: countRow?.count ?? 0 });
  });

  // GET /:id/scans - list scans for a project
  fastify.get<{ Params: { id: string } }>('/:id/scans', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const rows = await fastify.db
      .select({
        id: scans.id,
        projectId: scans.projectId,
        scanType: scans.scanType,
        status: scans.status,
        startedAt: scans.startedAt,
        completedAt: scans.completedAt,
        totalPages: scans.totalPages,
        createdAt: scans.createdAt,
        violationCount: sql<number>`(SELECT count(*) FROM issues WHERE issues.scan_id = "scans"."id")`,
      })
      .from(scans)
      .where(eq(scans.projectId, id))
      .orderBy(desc(scans.createdAt));
    reply.send(rows);
  });

  // DELETE /:id - cascade delete project, its scans, and issues
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const [project] = await fastify.db.select().from(projects).where(eq(projects.id, id));
    if (!project) {
      return reply.code(404).send({ error: 'Not found' });
    }
    // Delete issues for all scans in this project
    const dataDir = process.env['A11Y_DATA_DIR'] ?? resolve(process.cwd(), 'data');
    const projectScans = await fastify.db.select({ id: scans.id }).from(scans).where(eq(scans.projectId, id));
    for (const s of projectScans) {
      await fastify.db.delete(issues).where(eq(issues.scanId, s.id));
      // Remove orphaned screenshot directory for this scan
      await rm(join(dataDir, 'screenshots', String(s.id)), { recursive: true, force: true });
    }
    // Delete vpat entries, scans, then project (order matters for FK constraints)
    await fastify.db.delete(vpatEntries).where(eq(vpatEntries.projectId, id));
    await fastify.db.delete(scans).where(eq(scans.projectId, id));
    await fastify.db.delete(projects).where(eq(projects.id, id));
    reply.code(204).send();
  });
};

export default projectsRoutes;
