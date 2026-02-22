import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { projects, scans } from '@a11y-fixer/core';

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

  // DELETE /:id - delete project
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const rows = await fastify.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Not found' });
    }
    reply.code(204).send();
  });
};

export default projectsRoutes;
