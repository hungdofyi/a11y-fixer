/**
 * Google OAuth 2.0 SSO plugin for Fastify.
 * Handles login, callback, session management, and domain restriction.
 * Works alongside the existing API-key auth (CLI/programmatic access keeps using x-api-key).
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin from '@fastify/oauth2';
import secureSession from '@fastify/secure-session';
import cookie from '@fastify/cookie';

/** User info stored in session after successful Google login */
export interface SessionUser {
  email: string;
  name: string;
  picture: string;
  hd?: string; // Google Workspace domain
}

/** Augment Fastify session with our user type */
declare module '@fastify/secure-session' {
  interface SessionData {
    user: SessionUser;
  }
}

/** Routes that skip both OAuth and API-key auth */
const PUBLIC_PREFIXES = ['/health', '/documentation', '/swagger', '/auth/'];

const oauthSsoPlugin: FastifyPluginAsync = async (fastify) => {
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const sessionSecret = process.env['SESSION_SECRET'];
  const allowedDomain = process.env['ALLOWED_DOMAIN']; // e.g. 'mycompany.com'
  const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:3001';

  // If OAuth is not configured, skip (fall back to API-key only auth)
  if (!clientId || !clientSecret) {
    fastify.log.warn('GOOGLE_CLIENT_ID/SECRET not set — OAuth SSO disabled. Dashboard is unprotected.');
    return;
  }

  if (!allowedDomain) {
    fastify.log.warn('ALLOWED_DOMAIN not set — any Google account can authenticate. Set it to restrict to your Workspace domain.');
  }

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  const keyBuffer = Buffer.from(sessionSecret, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `SESSION_SECRET must be a 64-char hex string (32 bytes decoded). Got ${keyBuffer.length} bytes. ` +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Cookie plugin (required by secure-session)
  await fastify.register(cookie);

  // Encrypted cookie-based sessions (no Redis needed)
  await fastify.register(secureSession, {
    key: keyBuffer,
    cookieName: 'a11y-session',
    cookie: {
      path: '/',
      httpOnly: true,
      secure: baseUrl.startsWith('https'),
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
    },
  });

  // Register @fastify/oauth2 with Google
  await fastify.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['openid', 'email', 'profile'],
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: `${baseUrl}/auth/google/callback`,
    pkce: 'S256',
  });

  // OAuth callback — exchange code for tokens, fetch user info, validate domain
  fastify.get('/auth/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const tokenResult = await (fastify as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const accessToken = tokenResult.token.access_token;

      // Fetch user info from Google
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoRes.ok) {
        fastify.log.error('Failed to fetch Google user info');
        return reply.code(401).send({ error: 'Failed to fetch user info from Google' });
      }

      const userInfo = await userInfoRes.json() as {
        email: string;
        name: string;
        picture: string;
        hd?: string;
      };

      // Validate Google Workspace domain (critical security check)
      if (allowedDomain) {
        const domainOk = userInfo.hd === allowedDomain && userInfo.email?.endsWith(`@${allowedDomain}`);
        if (!domainOk) {
          fastify.log.warn({ email: userInfo.email, hd: userInfo.hd }, 'Domain mismatch — access denied');
          return reply.code(403).send({
            error: 'Access denied',
            message: `Only ${allowedDomain} accounts are allowed`,
          });
        }
      }

      // Store user in session
      req.session.set('user', {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        hd: userInfo.hd,
      });

      // Redirect to dashboard
      return reply.redirect('/');
    } catch (err) {
      fastify.log.error({ err }, 'OAuth callback failed');
      return reply.code(401).send({ error: 'Authentication failed' });
    }
  });

  // Get current user info
  fastify.get('/auth/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.session.get('user');
    if (!user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    return { user };
  });

  // Logout — clear session
  fastify.post('/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    req.session.delete();
    return { ok: true };
  });

  // Auth guard: protect /api/* routes for browser sessions
  // API-key auth still works for CLI/programmatic access (handled in auth.ts)
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0] ?? '';

    // Skip auth for public routes
    if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

    // If API key header is present, let the existing auth.ts plugin handle it
    if (request.headers['x-api-key']) return;

    // For browser requests (no API key), require OAuth session
    if (path.startsWith('/api/')) {
      const user = request.session.get('user');
      if (!user) {
        return reply.code(401).send({ error: 'Not authenticated', loginUrl: '/auth/google' });
      }
    }
  });
};

export default oauthSsoPlugin;
