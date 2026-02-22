import { timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

/** Routes that skip API key authentication */
const PUBLIC_PREFIXES = ['/health', '/documentation', '/swagger', '/auth/'];

/** Timing-safe string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Fastify plugin: enforces x-api-key header authentication */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  const apiKey = process.env['A11Y_API_KEY'];
  if (!apiKey) {
    fastify.log.warn('A11Y_API_KEY not set — all routes are unprotected. Set it in production.');
  }

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];

    // Skip auth for public routes
    if (PUBLIC_PREFIXES.some((prefix) => path!.startsWith(prefix))) {
      return;
    }

    // No API key configured → open access (dev mode)
    if (!apiKey) return;

    const provided = request.headers['x-api-key'];
    // No API key header → not a CLI/API client, let OAuth plugin handle auth
    if (!provided) return;
    // API key present but invalid → reject
    if (typeof provided !== 'string' || !safeCompare(provided, apiKey)) {
      reply
        .code(401)
        .send({ error: 'Unauthorized', message: 'Invalid x-api-key header' });
    }
  });
};

export default authPlugin;
