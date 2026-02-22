import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { scans } from '@a11y-fixer/core';

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_COUNT = 120; // 2 minutes max

/** SSE route for streaming scan progress updates */
const sseRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /:scanId/progress - stream scan status via SSE
  fastify.get<{ Params: { scanId: string } }>('/:scanId/progress', async (req, reply) => {
    const scanId = parseInt(req.params.scanId, 10);

    const [initial] = await fastify.db.select().from(scans).where(eq(scans.id, scanId));
    if (!initial) {
      return reply.code(404).send({ error: 'Scan not found' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    let pollCount = 0;
    let lastStatus = '';
    let ended = false;

    const sendEvent = (data: Record<string, unknown>) => {
      if (!ended) reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const endStream = () => {
      if (ended) return;
      ended = true;
      reply.raw.end();
    };

    const poll = async () => {
      if (ended) return;
      try {
        const [scan] = await fastify.db.select().from(scans).where(eq(scans.id, scanId));

        if (!scan) {
          sendEvent({ type: 'error', message: 'Scan not found' });
          endStream();
          return;
        }

        const terminal = scan.status === 'completed' || scan.status === 'failed';

        if (scan.status !== lastStatus) {
          lastStatus = scan.status;
          sendEvent({ type: 'status', scanId, status: scan.status });
        }

        if (terminal || pollCount >= MAX_POLL_COUNT) {
          sendEvent({ type: 'done', scanId, status: scan.status });
          endStream();
          return;
        }

        pollCount++;
        setTimeout(() => { poll().catch(() => endStream()); }, POLL_INTERVAL_MS);
      } catch {
        endStream();
      }
    };

    req.raw.on('close', endStream);

    await poll();
  });
};

export default sseRoutes;
