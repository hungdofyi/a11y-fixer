import { randomUUID } from 'node:crypto';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { chromium } from 'playwright';
import type { Browser, BrowserContext } from 'playwright';
import { isPublicUrl } from '../utils/is-public-url.js';

/** Persistent browser profile — preserves cookies/sessions so users don't re-login every time */
const PROFILE_DIR = resolve(
  process.env['A11Y_DATA_DIR'] ?? resolve(process.cwd(), 'data'),
  'browser-profile',
);

/** Max concurrent auth sessions to prevent resource exhaustion */
const MAX_SESSIONS = 3;

/** Auto-cleanup timeout in ms (5 minutes) */
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

interface AuthSession {
  /** When using launchPersistentContext, browser is null (context owns the lifecycle) */
  browser: Browser | null;
  context: BrowserContext;
  timer: NodeJS.Timeout;
}

/** In-memory session store for active browser sessions */
const sessions = new Map<string, AuthSession>();

/** Captured storageState paths keyed by sessionId — kept until scan consumes them */
const capturedPaths = new Map<string, string>();

/** Close browser, clear timer, remove from map */
async function cleanupSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;
  clearTimeout(session.timer);
  sessions.delete(id);
  try { await session.context.close(); } catch { /* already closed */ }
  if (session.browser) {
    try { await session.browser.close(); } catch { /* already closed */ }
  }
}

/** Delete captured storageState temp file and remove from map */
export async function cleanupCapturedPath(id: string): Promise<void> {
  const filePath = capturedPaths.get(id);
  if (!filePath) return;
  capturedPaths.delete(id);
  try { await unlink(filePath); } catch { /* already deleted */ }
}

/** Resolve storageStatePath from authSessionId (used by scan route) */
export function resolveStorageStatePath(authSessionId: string): string | undefined {
  return capturedPaths.get(authSessionId);
}

/** Auth session routes: launch headed browser, capture storageState, cleanup */
const authSessionRoutes: FastifyPluginAsync = async (fastify) => {
  // Drain all sessions on graceful shutdown (H4)
  fastify.addHook('onClose', async () => {
    await Promise.allSettled([...sessions.keys()].map(cleanupSession));
    await Promise.allSettled([...capturedPaths.keys()].map(cleanupCapturedPath));
  });

  // POST / — launch headed browser to target URL
  fastify.post<{ Body: { url: string } }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const { url } = req.body;

      if (!isPublicUrl(url)) {
        return reply.code(400).send({ error: 'Invalid URL. Only public HTTP(S) URLs allowed.' });
      }

      if (sessions.size >= MAX_SESSIONS) {
        return reply.code(429).send({ error: `Max ${MAX_SESSIONS} concurrent auth sessions. Try again later.` });
      }

      // Check for display availability on Linux (H2)
      if (process.platform === 'linux' && !process.env['DISPLAY'] && !process.env['WAYLAND_DISPLAY']) {
        return reply.code(400).send({
          error: 'Headed browser requires a local display. Run the API server locally to use this feature.',
        });
      }

      try {
        // Use persistent profile so cookies/sessions survive across auth sessions
        await mkdir(PROFILE_DIR, { recursive: true });
        const context = await chromium.launchPersistentContext(PROFILE_DIR, {
          headless: false,
          viewport: { width: 1280, height: 720 },
        });
        const page = context.pages()[0] ?? await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        // Page left open intentionally for user to log in interactively

        const sessionId = randomUUID();
        const timer = setTimeout(() => {
          fastify.log.info({ sessionId }, 'Auth session timed out, cleaning up');
          void cleanupSession(sessionId);
        }, SESSION_TIMEOUT_MS);

        sessions.set(sessionId, { browser: null, context, timer });
        reply.send({ sessionId });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        fastify.log.error({ err }, 'Failed to launch auth browser');
        return reply.code(500).send({ error: `Browser launch failed: ${message}` });
      }
    },
  );

  // POST /:id/capture — capture storageState, close browser, store path server-side
  fastify.post<{ Params: { id: string } }>(
    '/:id/capture',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (req, reply) => {
      const session = sessions.get(req.params.id);
      if (!session) {
        return reply.code(404).send({ error: 'Auth session not found or expired' });
      }

      try {
        const state = await session.context.storageState();
        const storageStatePath = join(tmpdir(), `a11y-auth-${req.params.id}.json`);
        await writeFile(storageStatePath, JSON.stringify(state), 'utf-8');

        // Store path server-side — never exposed to client
        capturedPaths.set(req.params.id, storageStatePath);

        // Close browser, remove active session
        await cleanupSession(req.params.id);

        reply.send({ captured: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        fastify.log.error({ err, sessionId: req.params.id }, 'Failed to capture storageState');
        await cleanupSession(req.params.id);
        return reply.code(500).send({ error: `Capture failed: ${message}` });
      }
    },
  );

  // DELETE /:id — manual cleanup (cancel flow)
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (req, reply) => {
      await cleanupSession(req.params.id);
      await cleanupCapturedPath(req.params.id);
      reply.code(204).send();
    },
  );
};

export default authSessionRoutes;
