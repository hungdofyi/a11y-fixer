/**
 * Serve Vue SPA static files from the API server in production.
 * Falls back to index.html for client-side routing (SPA behavior).
 */
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';

const staticFilesPlugin: FastifyPluginAsync = async (fastify) => {
  // In production, serve the pre-built Vue SPA
  // Web dist is expected at ../web/dist relative to the API app
  const webDistPath = process.env['WEB_DIST_PATH']
    ?? resolve(import.meta.dirname, '../../../web/dist');

  if (!existsSync(webDistPath)) {
    fastify.log.info({ webDistPath }, 'Web dist not found — static file serving disabled (dev mode)');
    return;
  }

  fastify.log.info({ webDistPath }, 'Serving Vue SPA static files');

  await fastify.register(fastifyStatic, {
    root: webDistPath,
    prefix: '/',
  });

  // SPA fallback: serve index.html for all non-API, non-auth, non-file routes
  fastify.setNotFoundHandler(async (request, reply) => {
    const path = request.url.split('?')[0] ?? '';

    // Don't intercept API or auth routes
    if (path.startsWith('/api/') || path.startsWith('/auth/')) {
      return reply.code(404).send({ error: 'Not found' });
    }

    // Serve index.html for SPA client-side routing
    return reply.sendFile('index.html', webDistPath);
  });
};

export default staticFilesPlugin;
