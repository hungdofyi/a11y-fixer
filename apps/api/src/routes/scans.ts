import { resolve, normalize } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { scans, issues, projects } from '@a11y-fixer/core';
import type { Violation } from '@a11y-fixer/core';
import { scanUrl, scanFiles, scanSite } from '@a11y-fixer/scanner';
import type { ScreenshotResult } from '@a11y-fixer/scanner';
import { aggregateConformance, mergeScanResults } from '@a11y-fixer/rules-engine';
import { isPublicUrl } from '../utils/is-public-url.js';
import { resolveStorageStatePath, cleanupCapturedPath } from './auth-session.js';
import { syncConformanceToVpat } from '../utils/sync-conformance-to-vpat.js';

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
    Body: {
      projectId: number;
      scanType: 'browser' | 'static' | 'site';
      url?: string;
      dir?: string;
      authSessionId?: string;
      enableKeyboard?: boolean;
      enableScreenshots?: boolean;
      maxPages?: number;
    };
  }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'scanType'],
          properties: {
            projectId: { type: 'number' },
            scanType: { type: 'string', enum: ['browser', 'static', 'site'] },
            url: { type: 'string' },
            dir: { type: 'string' },
            authSessionId: { type: 'string' },
            enableKeyboard: { type: 'boolean' },
            enableScreenshots: { type: 'boolean' },
            maxPages: { type: 'number', minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (req, reply) => {
      const { projectId, scanType, dir, authSessionId } = req.body;

      // Resolve storageStatePath server-side from authSessionId (never from client)
      const storageStatePath = authSessionId ? resolveStorageStatePath(authSessionId) : undefined;
      if (authSessionId && !storageStatePath) {
        return reply.code(400).send({ error: 'Auth session not found or expired. Please log in again.' });
      }

      // Verify project exists
      const [project] = await fastify.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Fall back to project URL if none provided
      const url = req.body.url || project.url || undefined;

      // Validate URL/dir inputs
      if (scanType === 'site' && !url) {
        return reply.code(400).send({ error: 'URL is required for site scans.' });
      }
      if ((scanType === 'browser' || scanType === 'site') && url && !isPublicUrl(url)) {
        return reply.code(400).send({ error: 'Invalid URL. Only public HTTP(S) URLs allowed.' });
      }
      if (scanType === 'static' && dir && !isSafePath(dir)) {
        return reply.code(400).send({ error: 'Invalid directory. Must be under workspace root.' });
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
      const { enableKeyboard, enableScreenshots, maxPages } = req.body;
      setImmediate(() => {
        runScanBackground(fastify.db, scanId, projectId, scanType, url, dir, storageStatePath, authSessionId, { enableKeyboard, enableScreenshots, maxPages }).catch((err: unknown) => {
          fastify.log.error({ err, scanId }, 'Background scan failed');
        });
      });

      reply.code(202).send({ id: scanId, scanId, status: 'running' });
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
  projectId: number,
  scanType: 'browser' | 'static' | 'site',
  url?: string,
  dir?: string,
  storageStatePath?: string,
  authSessionId?: string,
  opts: { enableKeyboard?: boolean; enableScreenshots?: boolean; maxPages?: number } = {},
): Promise<void> {
  try {
    let violations: Violation[] = [];
    let scannedCount = 0;
    let screenshotResults: ScreenshotResult[] = [];
    const dataDir = process.env['A11Y_DATA_DIR'] ?? resolve(process.cwd(), 'data');

    if (scanType === 'browser' && url) {
      const result = await scanUrl(url, {
        captureScreenshots: true,
        scanId,
        dataDir,
        enableKeyboard: opts.enableKeyboard,
        ...(storageStatePath ? { storageState: storageStatePath } : {}),
      });
      // If keyboard scan was enabled, merge axe + keyboard results
      if (result.keyboardResult) {
        const merged = mergeScanResults([result, result.keyboardResult]);
        violations = merged.violations;
        scannedCount = merged.scannedCount;
      } else {
        violations = result.violations;
        scannedCount = result.scannedCount;
      }
      screenshotResults = result.screenshotResults ?? [];
    } else if (scanType === 'site' && url) {
      // Multi-page site scan: crawl + scan pages, merge all results
      const pageResults: import('@a11y-fixer/core').ScanResult[] = [];
      for await (const pageResult of scanSite(url, {
        maxPages: opts.maxPages ?? 10,
        ...(opts.enableScreenshots ? { captureScreenshots: true, scanId, dataDir } : {}),
        ...(storageStatePath ? { storageState: storageStatePath } : {}),
      })) {
        pageResults.push(pageResult);
        // Collect screenshots from each page result
        if (pageResult.screenshotResults) {
          screenshotResults.push(...pageResult.screenshotResults);
        }
      }
      if (pageResults.length > 0) {
        const merged = mergeScanResults(pageResults);
        violations = merged.violations;
        scannedCount = merged.scannedCount;
      }
    } else if (scanType === 'static' && dir) {
      const result = await scanFiles(dir);
      violations = result.violations;
      scannedCount = result.scannedCount;
    }

    // Build screenshot path lookup by flattened issue index
    const screenshotMap = new Map<number, string>();
    for (const sr of screenshotResults) {
      screenshotMap.set(sr.issueIndex, sr.relativePath);
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
        failureSummary: string | null;
        helpUrl: string | null;
        screenshotPath: string | null;
        createdAt: string;
      };

      let issueIndex = 0;
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
          return v.nodes.map((node): IssueInsert => {
            const row: IssueInsert = {
              ...base,
              element: node.element,
              selector: node.target.join(', '),
              html: node.html,
              failureSummary: node.failureSummary || null,
              helpUrl: v.helpUrl ?? null,
              screenshotPath: screenshotMap.get(issueIndex) ?? null,
            };
            issueIndex++;
            return row;
          });
        }

        issueIndex++;
        return [{ ...base, element: null, selector: null, html: null, failureSummary: null, helpUrl: null, screenshotPath: null }];
      });

      await db.insert(issues).values(issueRows);
    }

    // Compute conformance scores from violations
    const conformanceInput: import('@a11y-fixer/core').ScanResult = {
      scanType: scanType as import('@a11y-fixer/core').ScanResult['scanType'],
      timestamp: new Date().toISOString(),
      violations,
      passes: [],
      incomplete: [],
      scannedCount,
    };
    const conformanceScores = aggregateConformance([conformanceInput]);

    // Sync conformance scores to vpatEntries (non-blocking on failure)
    try {
      await syncConformanceToVpat(db, projectId, scanId, conformanceScores);
    } catch (syncErr) {
      console.warn(`[scan:${scanId}] VPAT sync failed:`, syncErr);
    }

    // Strip violations before storing in scan config
    const conformance = conformanceScores.map(({ violations: _v, ...rest }) => rest);

    await db
      .update(scans)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        totalPages: scannedCount,
        config: JSON.stringify({ conformance }),
      })
      .where(eq(scans.id, scanId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scan:${scanId}] Failed:`, message);
    await db
      .update(scans)
      .set({
        status: 'failed',
        completedAt: new Date().toISOString(),
        config: JSON.stringify({ error: message }),
      })
      .where(eq(scans.id, scanId));
  } finally {
    // Clean up captured storageState temp file via auth-session module
    if (authSessionId) {
      await cleanupCapturedPath(authSessionId);
    }
  }
}

export default scansRoutes;
