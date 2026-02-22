import type { FastifyPluginAsync } from 'fastify';

/** Auth routes: OAuth status check and login trigger for web UI */
const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /status — check if AI OAuth token is configured and valid
  fastify.get('/status', async (_req, reply) => {
    const { loadToken, isTokenValid } = await import('@a11y-fixer/ai-engine');
    const token = loadToken();
    const authenticated = token !== null && isTokenValid(token);
    reply.send({ authenticated });
  });

  // POST /login — trigger OAuth PKCE flow (opens browser on server machine)
  fastify.post('/login', async (_req, reply) => {
    const { startOAuthFlow } = await import('@a11y-fixer/ai-engine');
    try {
      await startOAuthFlow();
      reply.send({ success: true });
    } catch (err) {
      reply.code(500).send({
        error: 'OAuth login failed',
        detail: (err as Error).message,
      });
    }
  });
};

export default authRoutes;
