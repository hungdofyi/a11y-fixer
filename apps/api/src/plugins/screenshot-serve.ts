/**
 * Serve element screenshots captured during accessibility scans.
 * Registered in encapsulated scope (no fastify-plugin wrapper) to avoid
 * conflicting with the main SPA @fastify/static registration.
 */
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import type { FastifyPluginAsync } from 'fastify';
import fastifyStatic from '@fastify/static';

const screenshotServePlugin: FastifyPluginAsync = async (fastify) => {
  const dataDir = process.env['A11Y_DATA_DIR'] ?? resolve(process.cwd(), 'data');
  const screenshotsDir = resolve(dataDir, 'screenshots');

  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  await fastify.register(fastifyStatic, {
    root: screenshotsDir,
    prefix: '/api/screenshots/',
  });
};

export default screenshotServePlugin;
