import { resolve, normalize } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { scans, issues, projects } from '@a11y-fixer/core';
import type { Violation } from '@a11y-fixer/core';
import { scanUrl, scanFiles } from '@a11y-fixer/scanner';

/** Validate URL is a public HTTP(S) URL (prevent SSRF) */
function isPublicUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    // Block internal/private IPs and metadata endpoints
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host.startsWith('10.') || host.startsWith('192.168.')) return false;
    if (host === '169.254.169.254') return false; // Cloud metadata
    if (host.endsWith('.internal') || host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

/** Validate directory path is under allowed workspace root (prevent path traversal) */
function isSafePath(dir: string): boolean {
  const workspaceRoot = process.env['A11Y_WORKSPACE_ROOT'] ?? process.cwd();
  const resolved = resolve(dir);
  const normalizedRoot = normalize(workspaceRoot);
  return resolved.startsWith(normalizedRoot);
}

/** Routes for triggering and querying scans */
const scansRoutes: FastifyPluginAsync = async (fastify) => {
  // POST / - trigger a new scan
  fastify.post<{
    Body: { projectId: number; scanType: 'browser' | 'static'; url?: string; dir?: string };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'scanType'],
          properties: {
            projectId: { type: 'number' },
            scanType: { type: 'string', enum: ['browser', 'static'] },
            url: { type: 'string' },
            dir: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const { projectId, scanType, url, dir } = req.body;

      // Validate URL/dir inputs
      if (scanType === 'browser' && url && !isPublicUrl(url)) {
        return reply.code(400).send({ error: 'Invalid URL. Only public HTTP(S) URLs allowed.' });
      }
      if (scanType === 'static' && dir && !isSafePath(dir)) {
        return reply.code(400).send({ error: 'Invalid directory. Must be under workspace root.' });
      }

      // Verify project exists
      const [project] = await fastify.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const [scan] = await fastify.db
        .insert(scans)
        .values({
          projectId,
          scanType,
          status: 'running',
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
        .returning();

      const scanId = scan!.id;

      // Run scan in background
      setImmediate(() => {
        runScanBackground(fastify.db, scanId, scanType, url, dir).catch((err: unknown) => {
          fastify.log.error({ err, scanId }, 'Background scan failed');
        });
      });

      reply.code(202).send({ scanId, status: 'running' });
    },
  );

  // GET /:id - scan detail with issue count
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const id = parseInt(req.params.id, 10);
    const [scan] = await fastify.db.select().from(scans).where(eq(scans.id, id));
    if (!scan) {
      return reply.code(404).send({ error: 'Not found' });
    }
    const [countRow] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.scanId, id));
    reply.send({ ...scan, issueCount: countRow?.count ?? 0 });
  });
};

/** Execute scan and persist results to DB */
async function runScanBackground(
  db: ReturnType<typeof import('@a11y-fixer/core').createDb>,
  scanId: number,
  scanType: 'browser' | 'static',
  url?: string,
  dir?: string,
): Promise<void> {
  try {
    let violations: Violation[] = [];
    let scannedCount = 0;

    if (scanType === 'browser' && url) {
      const result = await scanUrl(url);
      violations = result.violations;
      scannedCount = result.scannedCount;
    } else if (scanType === 'static' && dir) {
      const result = await scanFiles(dir);
      violations = result.violations;
      scannedCount = result.scannedCount;
    }

    // Insert issues in batches
    if (violations.length > 0) {
      type IssueInsert = {
        scanId: number;
        ruleId: string;
        wcagCriteria: string;
        severity: string;
        description: string;
        element: string | null;
        selector: string | null;
        html: string | null;
        pageUrl: string;
        createdAt: string;
      };

      const issueRows: IssueInsert[] = violations.flatMap((v) => {
        const base = {
          scanId,
          ruleId: v.ruleId,
          wcagCriteria: JSON.stringify(v.wcagCriteria),
          severity: v.severity as string,
          description: v.description,
          pageUrl: v.pageUrl,
          createdAt: new Date().toISOString(),
        };

        if (v.nodes.length > 0) {
          return v.nodes.map(
            (node): IssueInsert => ({
              ...base,
              element: node.element,
              selector: node.target.join(', '),
              html: node.html,
            }),
          );
        }

        return [{ ...base, element: null, selector: null, html: null }];
      });

      await db.insert(issues).values(issueRows);
    }

    await db
      .update(scans)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        totalPages: scannedCount,
      })
      .where(eq(scans.id, scanId));
  } catch {
    await db
      .update(scans)
      .set({ status: 'failed', completedAt: new Date().toISOString() })
      .where(eq(scans.id, scanId));
  }
}

export default scansRoutes;
