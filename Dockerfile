# Multi-stage build for a11y-fixer (API + Web SPA in one container)
# Stage 1: Install deps + build all packages
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config first (layer cache)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./

# Copy all package.json files for dependency resolution
COPY packages/core/package.json packages/core/
COPY packages/scanner/package.json packages/scanner/
COPY packages/rules-engine/package.json packages/rules-engine/
COPY packages/ai-engine/package.json packages/ai-engine/
COPY packages/report-generator/package.json packages/report-generator/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cli/package.json apps/cli/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/ apps/
COPY tsconfig.base.json ./

# Build all packages (turbo handles dependency order)
RUN pnpm build

# Stage 2: Production image (API serves both API + static SPA)
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Playwright needs these for chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libgtk-3-0 \
    ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/core/package.json packages/core/
COPY packages/scanner/package.json packages/scanner/
COPY packages/rules-engine/package.json packages/rules-engine/
COPY packages/ai-engine/package.json packages/ai-engine/
COPY packages/report-generator/package.json packages/report-generator/
COPY apps/api/package.json apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/scanner/dist packages/scanner/dist
COPY --from=builder /app/packages/rules-engine/dist packages/rules-engine/dist
COPY --from=builder /app/packages/ai-engine/dist packages/ai-engine/dist
COPY --from=builder /app/packages/report-generator/dist packages/report-generator/dist
COPY --from=builder /app/apps/api/dist apps/api/dist

# Copy Vue SPA build output
COPY --from=builder /app/apps/web/dist apps/web/dist

# Install Playwright browsers into a known location
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
RUN npx playwright install chromium

# Create data directory for SQLite and screenshots
RUN mkdir -p /app/data

# Run as non-root user
RUN groupadd --system a11y && useradd --system --gid a11y --home /app a11y \
    && chown -R a11y:a11y /app
USER a11y

# Set production defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV WEB_DIST_PATH=/app/apps/web/dist

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
