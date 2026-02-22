import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { projects, vpatEntries } from '@a11y-fixer/core';
import type { VpatEntry, VpatConfig } from '@a11y-fixer/core';
import { buildVpat } from '@a11y-fixer/report-generator';
import { ConformanceStatus } from '@a11y-fixer/core';

/** Routes for generating VPAT documents */
const vpatRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /generate - generate VPAT for a project
  fastify.post<{
    Body: { projectId: number; format: 'docx' | 'html' };
  }>(
    '/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['projectId', 'format'],
          properties: {
            projectId: { type: 'number' },
            format: { type: 'string', enum: ['docx', 'html'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { projectId, format } = req.body;

      const [project] = await fastify.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const entryRows = await fastify.db
        .select()
        .from(vpatEntries)
        .where(eq(vpatEntries.projectId, projectId));

      const entries: VpatEntry[] = entryRows.map((row) => ({
        standard: row.standard as VpatEntry['standard'],
        criterionId: row.criterionId,
        title: row.criterionId,
        conformanceStatus: row.conformanceStatus as ConformanceStatus,
        remarks: row.remarks,
        evidence: safeParseJson<VpatEntry['evidence']>(row.evidence, []),
        remediationPlan: row.remediationPlan ?? undefined,
      }));

      const config: VpatConfig = {
        productName: project.name,
        productVersion: '1.0',
        vendorName: project.name,
        evaluationDate: new Date().toISOString().split('T')[0]!,
        evaluationMethods: 'Automated scanning with a11y-fixer',
        entries,
      };

      const output = await buildVpat(config, { formats: [format] });

      if (format === 'docx' && output.docx) {
        reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          .header('Content-Disposition', `attachment; filename="vpat-${projectId}.docx"`)
          .send(output.docx);
        return;
      }

      if (format === 'html' && output.html) {
        reply.header('Content-Type', 'text/html').send(output.html);
        return;
      }

      reply.code(500).send({ error: 'Failed to generate VPAT document' });
    },
  );
};

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default vpatRoutes;
