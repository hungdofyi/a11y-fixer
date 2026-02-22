import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { scans, issues } from '@a11y-fixer/core';
import type { Violation } from '@a11y-fixer/core';
import { generateScanReport, exportCsv, calculateSummary } from '@a11y-fixer/report-generator';
import { safeParseJson } from '../utils/safe-parse-json.js';

/** Routes for generating scan reports in HTML or CSV format */
const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /:scanId - generate report for a scan
  fastify.get<{
    Params: { scanId: string };
    Querystring: { format?: string };
  }>('/:scanId', async (req, reply) => {
    const scanId = parseInt(req.params.scanId, 10);
    const format = req.query.format ?? 'html';

    const [scan] = await fastify.db.select().from(scans).where(eq(scans.id, scanId));
    if (!scan) {
      return reply.code(404).send({ error: 'Scan not found' });
    }

    const issueRows = await fastify.db.select().from(issues).where(eq(issues.scanId, scanId));

    // Reconstruct Violation objects from DB rows
    const violations: Violation[] = issueRows.map((row) => ({
      ruleId: row.ruleId,
      wcagCriteria: safeParseJson<string[]>(row.wcagCriteria, []),
      severity: row.severity as Violation['severity'],
      description: row.description,
      helpUrl: row.helpUrl ?? undefined,
      nodes: [{
        element: row.element ?? '',
        html: row.html ?? '',
        target: row.selector ? [row.selector] : [],
        failureSummary: row.failureSummary ?? '',
      }],
      pageUrl: row.pageUrl ?? '',
    }));

    if (format === 'csv') {
      const csv = exportCsv(violations);
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="scan-${scanId}.csv"`)
        .send(csv);
      return;
    }

    const summary = calculateSummary(violations, scan.totalPages ?? 1);
    const html = generateScanReport(violations, summary);
    reply.header('Content-Type', 'text/html').send(html);
  });
};

export default reportsRoutes;
