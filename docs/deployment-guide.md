# Deployment Guide

## Docker Deployment

### Prerequisites
- Docker 24+ and Docker Compose v2
- Google Cloud project with OAuth 2.0 credentials (for dashboard SSO)

### Quick Start

```bash
cp .env.example .env
# Fill in: SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_DOMAIN, BASE_URL
docker compose up -d
# Open http://localhost:3001
```

### Build Details

Two-stage Dockerfile:
| Stage | Purpose |
|-------|---------|
| `builder` (node:22-slim) | pnpm install, TypeScript compile, Vue SPA build |
| `production` (node:22-slim) | Prod deps only, built artifacts, Playwright Chromium, non-root user |

**Port**: 3001 | **Health**: `GET /health` every 30s

### Persistent Data

SQLite in named Docker volume: `a11y-data:/app/data`

Backup: `docker compose cp app:/app/data/a11y-fixer.db ./backup.db`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | API server port |
| `A11Y_API_KEY` | Recommended | — | API key for CLI access (`x-api-key` header) |
| `A11Y_DB_PATH` | No | `./data/a11y-fixer.db` | SQLite path |
| `A11Y_WORKSPACE_ROOT` | No | `.` | Allowed root for static scanning |
| `GOOGLE_CLIENT_ID` | Yes* | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes* | — | Google OAuth client secret |
| `ALLOWED_DOMAIN` | Recommended | — | Restrict to Google Workspace domain |
| `BASE_URL` | Yes* | `http://localhost:3001` | Public URL (OAuth callback prefix) |
| `SESSION_SECRET` | Yes* | — | 64-char hex. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `WEB_DIST_PATH` | No | `/app/apps/web/dist` | Vue SPA dist folder |
| `CLAUDE_CODE_OAUTH_TOKEN` | No | — | OAuth token for Claude AI |
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key (AI fallback) |

*Required for Google OAuth SSO.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Add redirect URI: `https://your-domain.com/auth/google/callback`
4. Copy Client ID + Secret to `.env`
5. Set `ALLOWED_DOMAIN=yourcompany.com` to restrict to Workspace domain

Server validates both `hd` claim AND email suffix — rejects with 403 on mismatch.

---

## Local Development

```bash
pnpm install && pnpm build
cp .env.example .env

# API (terminal 1)
pnpm --filter @a11y-fixer/api dev

# Web (terminal 2) — Vite proxies /api and /auth to localhost:3001
pnpm --filter @a11y-fixer/web dev
```

### CLI Authenticated Scanning

```bash
# Login interactively (opens visible Chromium)
a11y auth login https://app.mycompany.com
# Session saved to ~/.a11y-fixer/storage-state.json (chmod 600)

# Scan with saved session
a11y scan https://app.mycompany.com/dashboard --storage-state ~/.a11y-fixer/storage-state.json
```
