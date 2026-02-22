import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import authPlugin from './plugins/auth.js';
import dbPlugin from './plugins/db.js';
import projectsRoutes from './routes/projects.js';
import scansRoutes from './routes/scans.js';
import issuesRoutes from './routes/issues.js';
import reportsRoutes from './routes/reports.js';
import vpatRoutes from './routes/vpat.js';
import sseRoutes from './routes/sse.js';

/** Build and configure the Fastify application */
export async function buildApp() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, { origin: true });

  await fastify.register(swagger, {
    openapi: {
      info: { title: 'a11y-fixer API', version: '0.1.0', description: 'Accessibility scanning and reporting API' },
      servers: [{ url: 'http://localhost:3001' }],
      components: {
        securitySchemes: {
          apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: { docExpansion: 'list' },
  });

  await fastify.register(authPlugin);
  await fastify.register(dbPlugin);

  // Health check (public)
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // API routes
  await fastify.register(projectsRoutes, { prefix: '/api/projects' });
  await fastify.register(scansRoutes, { prefix: '/api/scans' });
  await fastify.register(issuesRoutes, { prefix: '/api/issues' });
  await fastify.register(reportsRoutes, { prefix: '/api/reports' });
  await fastify.register(vpatRoutes, { prefix: '/api/vpat' });
  await fastify.register(sseRoutes, { prefix: '/api/sse' });

  return fastify;
}

/** Start the server when run directly */
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const app = await buildApp();

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`a11y-fixer API listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
