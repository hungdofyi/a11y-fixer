import type { FastifyPluginAsync } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { issues } from '@a11y-fixer/core';
import type { Violation } from '@a11y-fixer/core';

/** Routes for querying issues with pagination and filtering */
const issuesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / - list issues with optional filters and pagination
  fastify.get<{
    Querystring: {
      scanId?: string;
      severity?: string;
      wcag?: string;
      page?: string;
      limit?: string;
    };
  }>('/', async (req, reply) => {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (req.query.scanId) {
      conditions.push(eq(issues.scanId, parseInt(req.query.scanId, 10)));
    }
    if (req.query.severity) {
      conditions.push(eq(issues.severity, req.query.severity));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(where);

    const rows = await fastify.db
      .select()
      .from(issues)
      .where(where)
      .limit(limit)
      .offset(offset);

    // Filter by WCAG criteria in-memory (stored as JSON string)
    const filtered = req.query.wcag
      ? rows.filter((r) => {
          try {
            const criteria: string[] = JSON.parse(r.wcagCriteria);
            return criteria.includes(req.query.wcag!);
          } catch {
            return false;
          }
        })
      : rows;

    reply.send({
      data: filtered,
      pagination: {
        page,
        limit,
        total: countRow?.count ?? 0,
        totalPages: Math.ceil((countRow?.count ?? 0) / limit),
      },
    });
  });

  // GET /:id - single issue detail
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const [issue] = await fastify.db.select().from(issues).where(eq(issues.id, id));
    if (!issue) {
      return reply.code(404).send({ error: 'Issue not found' });
    }
    reply.send(issue);
  });

  // POST /:id/ai-fix — on-demand AI fix generation for a stored issue
  fastify.post<{ Params: { id: string } }>('/:id/ai-fix', async (req, reply) => {
    // Extend timeout for AI calls (default Fastify is too short for ~10s Claude API)
    req.raw.setTimeout(60_000);
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return reply.code(400).send({ error: 'Invalid issue id' });

      const [issue] = await fastify.db.select().from(issues).where(eq(issues.id, id));
      if (!issue) return reply.code(404).send({ error: 'Issue not found' });

      const { setupAuth, analyzeComplexIssue } = await import('@a11y-fixer/ai-engine');

      const authed = await setupAuth(false);
      if (!authed) {
        return reply.code(503).send({
          error: 'AI unavailable: run `a11y-fixer auth login` to authenticate via OAuth',
        });
      }

      // Reconstruct minimal Violation from DB columns
      const violation: Violation = {
        ruleId: issue.ruleId,
        description: issue.description,
        severity: issue.severity as Violation['severity'],
        wcagCriteria: safeParseJson<string[]>(issue.wcagCriteria, []),
        nodes: [{
          element: issue.element ?? '',
          html: issue.html ?? '',
          target: issue.selector ? [issue.selector] : [],
          failureSummary: issue.failureSummary ?? '',
        }],
        pageUrl: issue.pageUrl ?? '',
      };

      try {
        const fix = await analyzeComplexIssue(violation, issue.html ?? '');

        await fastify.db
          .update(issues)
          .set({ fixSuggestion: JSON.stringify(fix) })
          .where(eq(issues.id, id));

        reply.send({ fix });
      } catch (err) {
        reply.code(500).send({
          error: 'AI analysis failed',
          detail: (err as Error).message,
        });
      }
  });
};

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default issuesRoutes;
