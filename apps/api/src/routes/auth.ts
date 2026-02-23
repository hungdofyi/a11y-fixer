import type { FastifyPluginAsync } from 'fastify';

/** Auth routes: OAuth status, start flow (returns URL), callback (exchanges code) */
const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /status — check if AI OAuth token is configured and valid
  fastify.get('/status', async (_req, reply) => {
    const { loadToken, isTokenValid } = await import('@a11y-fixer/ai-engine');
    const token = loadToken();
    const authenticated = token !== null && isTokenValid(token);
    reply.send({ authenticated });
  });

  // POST /login — build auth URL + store PKCE state, return URL to frontend
  fastify.post('/login', async (_req, reply) => {
    const { buildAuthorizationUrl } = await import('@a11y-fixer/ai-engine');
    try {
      const { authUrl, state } = buildAuthorizationUrl();
      reply.send({ authUrl, state });
    } catch (err) {
      reply.code(500).send({
        error: 'Failed to start OAuth flow',
        detail: (err as Error).message,
      });
    }
  });

  // POST /logout — clear stored Claude OAuth token
  fastify.post('/logout', async (_req, reply) => {
    const { clearToken } = await import('@a11y-fixer/ai-engine');
    clearToken();
    reply.send({ success: true });
  });

  // POST /callback — exchange authorization code for tokens
  fastify.post<{ Body: { code: string; state: string } }>('/callback', async (req, reply) => {
    const { exchangeAuthCode } = await import('@a11y-fixer/ai-engine');
    const { code, state } = req.body;

    if (!code || !state) {
      return reply.code(400).send({ error: 'Missing code or state parameter' });
    }

    if (code.length > 2048 || state.length > 128) {
      return reply.code(400).send({ error: 'Parameter too long' });
    }

    try {
      await exchangeAuthCode(code, state);
      reply.send({ success: true });
    } catch (err) {
      reply.code(400).send({
        error: 'Token exchange failed',
        detail: (err as Error).message,
      });
    }
  });
};

export default authRoutes;
